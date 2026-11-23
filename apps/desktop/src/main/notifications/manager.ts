import { EventEmitter } from 'node:events';
import type { BrowserWindow } from 'electron';
import { Notification, type WebFrameMain } from 'electron';
import { NotificationChannel, type CapturedNotification } from '../../shared/notifications';
import type { SettingsStore } from '../store/settings-store';
import { Deduplicator, conversationKey, formatToast, isInQuietHours, isMuted } from './rules';

/** Motivo pelo qual uma notificação não virou toast (para estatísticas, sem conteúdo). */
export type DropReason = 'disabled' | 'duplicate' | 'muted' | 'quiet-hours' | 'unsupported';

interface Events {
  shown: [CapturedNotification];
  dropped: [DropReason];
}

interface ManagerDeps {
  settings: SettingsStore;
  /** Janela do Chat, para foco e alerta na barra de tarefas. */
  getChatWindow: () => BrowserWindow | null;
}

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

  handle(n: CapturedNotification, frame: WebFrameMain | null): 'shown' | DropReason {
    const settings = this.deps.settings.get().notifications;

    if (!settings.enabled) return this.drop('disabled');
    if (this.dedup.isDuplicate(n)) return this.drop('duplicate');

    const key = conversationKey(n);
    this.recent.delete(key);
    this.recent.set(key, Date.now());
    if (this.recent.size > 30) this.recent.delete(this.recent.keys().next().value!);

    if (isMuted(n, settings)) return this.drop('muted');
    if (isInQuietHours(new Date(), settings.quietHours)) return this.drop('quiet-hours');
    if (!Notification.isSupported()) return this.drop('unsupported');

    const { title, body } = formatToast(n, settings);
    const toast = new Notification({
      title,
      body,
      silent: !settings.systemSound,
      actions: [{ type: 'button', text: 'Silenciar conversa' }],
    });

    const release = () => this.active.delete(n.id);
    toast.on('click', () => {
      release();
      this.focusChat();
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

    const win = this.deps.getChatWindow();
    if (win && !win.isFocused()) win.flashFrame(true);
    this.emit('shown', n);
    return 'shown';
  }

  /** Toast de teste da tela de configurações (não passa por silêncio/dedup). */
  showTest(): boolean {
    if (!Notification.isSupported()) return false;
    const settings = this.deps.settings.get().notifications;
    const sample: CapturedNotification = {
      id: 'test',
      api: 'window.Notification',
      title: 'GChat Desktop+',
      body: 'As notificações estão funcionando.',
    };
    const { title, body } = formatToast(sample, settings);
    const toast = new Notification({ title, body, silent: !settings.systemSound });
    this.active.set('test', toast);
    toast.on('close', () => this.active.delete('test'));
    toast.show();
    return true;
  }

  private mute(key: string): void {
    const current = this.deps.settings.get().notifications.mutedConversations;
    if (current.includes(key)) return;
    this.deps.settings.update({ notifications: { mutedConversations: [...current, key] } });
  }

  private focusChat(): void {
    const win = this.deps.getChatWindow();
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
  }

  private drop(reason: DropReason): DropReason {
    this.emit('dropped', reason);
    return reason;
  }
}
