import { EventEmitter } from 'node:events';
import type { WebFrameMain } from 'electron';
import {
  INBOX_EMPTY,
  INBOX_LIMIT,
  type InboxEntry,
  type InboxReason,
  type InboxStatus,
} from '../../shared/inbox';
import type { CapturedNotification } from '../../shared/notifications';

interface Stored {
  id: string;
  accountId: string | null;
  title: string;
  body: string | null;
  at: number;
  reason: InboxReason;
  mention: boolean;
  vip: boolean;
  seen: boolean;
  /** Para abrir a conversa: devolve o clique à notificação na página do Chat. */
  frame: WebFrameMain | null;
  notificationId: string;
}

export interface InboxPrivacy {
  showSender: boolean;
  showPreview: boolean;
}

/**
 * Histórico de notificações perdidas, SÓ EM MEMÓRIA: some ao fechar o app e
 * nunca é gravado em disco nem em logs. Guarda no máximo INBOX_LIMIT itens.
 */
export class NotificationHistory extends EventEmitter<{ change: [InboxStatus] }> {
  private entries: Stored[] = [];
  private version = 0;

  add(
    n: CapturedNotification,
    info: {
      accountId: string | null;
      reason: InboxReason;
      mention: boolean;
      vip: boolean;
      frame: WebFrameMain | null;
    },
  ): void {
    this.entries.unshift({
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      accountId: info.accountId,
      title: n.title.trim() || 'Google Chat',
      body: n.body?.trim() || null,
      at: Date.now(),
      reason: info.reason,
      mention: info.mention,
      vip: info.vip,
      seen: false,
      frame: info.frame,
      notificationId: n.id,
    });
    if (this.entries.length > INBOX_LIMIT) this.entries.length = INBOX_LIMIT;
    this.changed();
  }

  status(): InboxStatus {
    if (this.entries.length === 0 && this.version === 0) return INBOX_EMPTY;
    return {
      unseen: this.entries.filter((e) => !e.seen).length,
      total: this.entries.length,
      version: this.version,
    };
  }

  /** Lista para o painel, já com as regras de privacidade aplicadas. */
  list(privacy: InboxPrivacy, accountName: (id: string) => string | null): InboxEntry[] {
    return this.entries.map((e) => ({
      id: e.id,
      accountId: e.accountId,
      accountName: e.accountId ? accountName(e.accountId) : null,
      title: privacy.showSender ? e.title : 'Conversa oculta',
      body: privacy.showPreview ? e.body : null,
      at: e.at,
      reason: e.reason,
      mention: e.mention,
      vip: e.vip,
      seen: e.seen,
    }));
  }

  markAllSeen(): void {
    if (!this.entries.some((e) => !e.seen)) return;
    for (const e of this.entries) e.seen = true;
    this.changed();
  }

  remove(id: string): void {
    const before = this.entries.length;
    this.entries = this.entries.filter((e) => e.id !== id);
    if (this.entries.length !== before) this.changed();
  }

  clear(): void {
    if (this.entries.length === 0) return;
    this.entries = [];
    this.changed();
  }

  /** Dados para abrir a conversa de um item (o item sai da lista). */
  take(id: string): {
    accountId: string | null;
    title: string;
    frame: WebFrameMain | null;
    notificationId: string;
  } | null {
    const e = this.entries.find((x) => x.id === id);
    if (!e) return null;
    this.remove(id);
    return {
      accountId: e.accountId,
      title: e.title,
      frame: e.frame,
      notificationId: e.notificationId,
    };
  }

  private changed(): void {
    this.version += 1;
    this.emit('change', this.status());
  }
}
