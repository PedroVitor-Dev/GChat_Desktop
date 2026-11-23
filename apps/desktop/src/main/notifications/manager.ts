import { EventEmitter } from 'node:events';
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
} from './rules';

/** Motivo pelo qual uma notificação não virou toast (para estatísticas, sem conteúdo). */
export type DropReason =
  'disabled' | 'duplicate' | 'muted' | 'quiet-hours' | 'streamer' | 'unsupported';

interface Events {
  shown: [CapturedNotification];
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
  };
  player: SoundPlayer;
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

    if (!settings.enabled) return this.drop('disabled');
    if (this.dedup.isDuplicate(n)) return this.drop('duplicate');

    const key = conversationKey(n);
    this.recent.delete(key);
    this.recent.set(key, Date.now());
    if (this.recent.size > 30) this.recent.delete(this.recent.keys().next().value!);

    if (isMuted(n, settings)) return this.drop('muted');
    const streaming = this.deps.streamer.status().active;
    const streamer = all.streamer;
    if (streaming && streamer.pauseNotifications) return this.drop('streamer');
    const mention = isMention(n, settings.mentions.keywords);
    const bypass = mention && settings.mentions.bypassQuietHours;
    if (!bypass && isInQuietHours(new Date(), settings.quietHours)) return this.drop('quiet-hours');
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
    const title = accountName ? `${formatted.title} · ${accountName}` : formatted.title;
    const { body } = formatted;
    const sound = streaming && streamer.muteSounds ? 'none' : chooseSound(n, all.sounds, mention);
    if (diagnosticsEnabled) {
      console.error(`[diag] menção: ${mention ? 'sim' : 'não'} · som: ${sound}`);
    }
    const toast = new Notification({
      title,
      body,
      // O Windows só toca o som dele quando escolhido; os demais tocam pelo player.
      silent: sound !== 'system',
      icon: appIcon(),
      actions: [{ type: 'button', text: 'Silenciar conversa' }],
    });

    const release = () => this.active.delete(n.id);
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
    if (this.active.size > MAX_ACTIVE) this.active.delete(this.active.keys().next().value!);
    toast.show();
    this.playSound(sound);

    this.deps.shell.onNotificationShown(accountId);
    this.emit('shown', n);
    return 'shown';
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
    const current = this.deps.settings.get().notifications.mutedConversations;
    if (current.includes(key)) return;
    this.deps.settings.update({ notifications: { mutedConversations: [...current, key] } });
  }

  private drop(reason: DropReason): DropReason {
    this.emit('dropped', reason);
    return reason;
  }
}
