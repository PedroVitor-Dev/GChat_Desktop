import { EventEmitter } from 'node:events';
import type { ChatPresence } from '../../shared/profile';
import { resolveDnd } from '../../shared/dnd';
import type { NotificationHistory } from './history';
import { Notification, type WebFrameMain } from 'electron';
import { NotificationChannel, type CapturedNotification } from '../../shared/notifications';
import type { SoundId } from '../../shared/sounds';
import { diagnosticsEnabled } from '../chat/diagnostics';
import type { SoundPlayer } from '../sounds/player';
import type { SettingsStore } from '../store/settings-store';
import { appIcon } from '../system/app-icon';
import {
  Deduplicator,
  chooseSound,
  conversationKey,
  formatToast,
  isInQuietHours,
  isMention,
  isMuted,
  isVip,
  sameConversation,
} from './rules';

/** Motivo pelo qual uma notificação não virou toast (para estatísticas, sem conteúdo). */
export type DropReason =
  'disabled' | 'paused' | 'duplicate' | 'muted' | 'quiet-hours' | 'streamer' | 'unsupported';

interface Events {
  /** Notificação exibida e a conta de onde veio (null se desconhecida). */
  shown: [CapturedNotification, string | null];
  dropped: [DropReason];
}

interface ManagerDeps {
  settings: SettingsStore;
  /** Janela principal: foco no clique e contador de não lidas. */
  /** Modo streamer: pausa, esconde conteúdo e/ou silencia enquanto ativo. */
  streamer: { status(): { active: boolean } };
  shell: {
    focusChat(accountId?: string): void;
    onNotificationShown(accountId: string | null): void;
    accountName(accountId: string): string | null;
    accountCount(): number;
    /** Janela escondida, minimizada ou sem foco. */
    isAway(): boolean;
  };
  /** Notificações perdidas (só memória). */
  history?: NotificationHistory;
  player: SoundPlayer;
  /** Status da conta no Google Chat ("dnd" = Não perturbe). */
  presence(accountId: string): ChatPresence | undefined;
}

/** Som usado se o escolhido não puder ser lido (ex.: arquivo apagado por fora). */
const FALLBACK_SOUND: SoundId = 'builtin:gota';

/** Toasts ativos precisam de referência viva, senão o GC remove os handlers de clique. */
const MAX_ACTIVE = 50;

/**
 * Notification Manager: recebe as notificações capturadas no Chat, aplica as
 * regras (dedup, silêncio, privacidade) e exibe o toast nativo do Windows.
 * Nunca registra conteúdo em log.
 */
export class NotificationManager extends EventEmitter<Events> {
  private readonly dedup = new Deduplicator();
  private readonly active = new Map<string, Notification>();
  /** De qual conversa/conta é cada toast ativo (para fechar ao ler a conversa). */
  private readonly owner = new Map<string, { key: string; accountId: string | null }>();
  private readonly recent = new Map<string, number>();

  constructor(private readonly deps: ManagerDeps) {
    super();
  }

  /** Conversas que notificaram recentemente (só nomes), para a tela de silenciar. */
  recentConversations(): string[] {
    return [...this.recent.entries()].sort((a, b) => b[1] - a[1]).map(([key]) => key);
  }

  /**
   * @param accountId conta (view) de onde veio a notificação; null se desconhecida
   */
  handle(
    n: CapturedNotification,
    frame: WebFrameMain | null,
    accountId: string | null = null,
  ): 'shown' | DropReason {
    const all = this.deps.settings.get();
    const settings = all.notifications;

    // Pessoas prioritárias passam por Não perturbe, horário de silêncio e modo
    // streamer (só a conversa silenciada à mão as cala, e ela sai da lista VIP).
    const vip = isVip(n, settings);
    if (this.dedup.isDuplicate(n)) return this.drop('duplicate');

    // Conversas recentes (só nomes), inclusive as que chegaram em pausa: assim dá
    // para marcar como prioritária quem escreveu durante o Não perturbe.
    const key = conversationKey(n);
    this.recent.delete(key);
    this.recent.set(key, Date.now());
    if (this.recent.size > 30) this.recent.delete(this.recent.keys().next().value!);

    // Silenciada à mão: o usuário escolheu não ouvir (nem guarda no histórico).
    if (isMuted(n, settings)) return this.drop('muted');

    const mention = isMention(n, settings.mentions.keywords);
    // Barrada pelo silêncio: vai para as notificações perdidas (só memória).
    const held = (reason: 'disabled' | 'paused' | 'streamer' | 'quiet-hours') => {
      this.deps.history?.add(n, { accountId, reason, mention, vip, frame });
      return this.drop(reason);
    };
    if (!vip && !settings.enabled) return held('disabled');
    // "Não perturbe" com prazo: nem aviso nem som até a hora marcada.
    if (!vip && resolveDnd(settings, Date.now()).active) return held('paused');

    const streaming = this.deps.streamer.status().active;
    const streamer = all.streamer;
    if (!vip && streaming && streamer.pauseNotifications) return held('streamer');
    const bypass = mention && settings.mentions.bypassQuietHours;
    if (!vip && !bypass && isInQuietHours(new Date(), settings.quietHours)) {
      return held('quiet-hours');
    }
    if (!Notification.isSupported()) return this.drop('unsupported');

    // Transmitindo: nunca mostra remetente nem texto na tela, se assim configurado.
    const privacy =
      streaming && streamer.hideContent ? { showSender: false, showPreview: false } : settings;
    const formatted = formatToast(n, privacy);
    // Com mais de uma conta, o toast diz de qual conta é a mensagem.
    const accountName =
      accountId && this.deps.shell.accountCount() > 1
        ? this.deps.shell.accountName(accountId)
        : null;
    const named = accountName ? `${formatted.title} · ${accountName}` : formatted.title;
    const title = vip ? `⭐ ${named}` : named;
    const { body } = formatted;
    // Não perturbe no Chat: o aviso (se o Chat ainda criar) chega sem som.
    const dnd = accountId !== null && this.deps.presence(accountId) === 'dnd';
    // A tela continua escondendo o conteúdo ao transmitir; o som da VIP toca.
    const silenced = !vip && (dnd || (streaming && streamer.muteSounds));
    const sound = silenced ? 'none' : chooseSound(n, all.sounds, mention, vip);
    if (diagnosticsEnabled) {
      console.error(
        `[diag] menção: ${mention ? 'sim' : 'não'} · vip: ${vip ? 'sim' : 'não'} · som: ${sound}`,
      );
    }
    const toast = new Notification({
      title,
      body,
      // O Windows só toca o som dele quando escolhido; os demais tocam pelo player.
      silent: sound !== 'system',
      icon: appIcon(),
      actions: [{ type: 'button', text: 'Silenciar conversa' }],
    });

    const release = () => {
      this.active.delete(n.id);
      this.owner.delete(n.id);
    };
    toast.on('click', () => {
      release();
      this.deps.shell.focusChat(accountId ?? undefined);
      // Devolve o clique ao Chat, que abre a conversa (comportamento dele).
      if (frame && !frame.isDestroyed()) frame.send(NotificationChannel.Clicked, n.id);
    });
    toast.on('action', (details) => {
      release();
      if (details.actionIndex === 0) this.mute(key);
    });
    toast.on('close', release);
    toast.on('failed', (_event, error) => {
      release();
      console.error(`[notificações] falha ao exibir toast: ${error}`);
    });

    this.active.set(n.id, toast);
    this.owner.set(n.id, { key, accountId });
    if (this.active.size > MAX_ACTIVE) {
      const oldest = this.active.keys().next().value!;
      this.active.delete(oldest);
      this.owner.delete(oldest);
    }
    toast.show();
    this.playSound(sound);
    // Chegou com você fora da janela: fica nas notificações perdidas (só memória).
    if (this.deps.shell.isAway()) {
      this.deps.history?.add(n, { accountId, reason: 'away', mention, vip, frame });
    }

    this.deps.shell.onNotificationShown(accountId);
    this.emit('shown', n, accountId);
    return 'shown';
  }

  /**
   * O usuário está lendo esta conversa: fecha os avisos dela que ainda estão na
   * tela ou na central de notificações do Windows.
   */
  dismissConversation(accountId: string, name: string): void {
    for (const [id, o] of [...this.owner]) {
      if (o.accountId !== null && o.accountId !== accountId) continue;
      if (!sameConversation(o.key, name)) continue;
      this.active.get(id)?.close();
      this.active.delete(id);
      this.owner.delete(id);
    }
  }

  /** Toast de teste da tela de configurações (não passa por silêncio/dedup). */
  showTest(): boolean {
    if (!Notification.isSupported()) return false;
    const { notifications: settings, sounds } = this.deps.settings.get();
    const sound: SoundId = sounds.enabled ? sounds.defaultSound : 'none';
    const sample: CapturedNotification = {
      id: 'test',
      api: 'window.Notification',
      title: 'GChat Desktop+',
      body: 'As notificações estão funcionando.',
    };
    const { title, body } = formatToast(sample, settings);
    const toast = new Notification({
      title,
      body,
      silent: sound !== 'system',
      icon: appIcon(),
    });
    this.active.set('test', toast);
    toast.on('close', () => this.active.delete('test'));
    toast.show();
    this.playSound(sound, true);
    return true;
  }

  private playSound(sound: SoundId, force = false): void {
    const { volume } = this.deps.settings.get().sounds;
    void this.deps.player.play(sound, volume, { force }).then((ok) => {
      if (!ok) void this.deps.player.play(FALLBACK_SOUND, volume, { force: true });
    });
  }

  private mute(key: string): void {
    const { mutedConversations: current, vipConversations } =
      this.deps.settings.get().notifications;
    if (current.includes(key)) return;
    // Silenciar pela notificação tira a conversa das prioritárias.
    this.deps.settings.update({
      notifications: {
        mutedConversations: [...current, key],
        vipConversations: vipConversations.filter((v) => v !== key),
      },
    });
  }

  private drop(reason: DropReason): DropReason {
    this.emit('dropped', reason);
    return reason;
  }
}
