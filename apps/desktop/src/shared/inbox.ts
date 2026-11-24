/**
 * Notificações perdidas ("Caixa de entrada"): o que chegou enquanto você estava
 * fora da janela ou com os avisos pausados. Fica **só na memória** do processo
 * principal e some ao fechar o app; nada vai para o disco nem para logs.
 */

/** Por que a notificação entrou na lista. */
export type InboxReason = 'away' | 'paused' | 'disabled' | 'quiet-hours' | 'streamer';

export const INBOX_REASON_LABEL: Record<InboxReason, string> = {
  away: 'Enquanto você estava fora',
  paused: 'No Não perturbe',
  disabled: 'Com as notificações pausadas',
  'quiet-hours': 'No horário de silêncio',
  streamer: 'No modo streamer',
};

export interface InboxEntry {
  id: string;
  accountId: string | null;
  /** Nome da conta (só com mais de uma conta). */
  accountName: string | null;
  /** Conversa (remetente ou espaço); oculto conforme a privacidade. */
  title: string;
  /** Texto da mensagem; null se oculto ou sem texto. */
  body: string | null;
  at: number;
  reason: InboxReason;
  mention: boolean;
  vip: boolean;
  seen: boolean;
}

export interface InboxStatus {
  /** Itens ainda não vistos (contador no botão). */
  unseen: number;
  total: number;
  /** Muda a cada alteração, para o painel buscar a lista de novo. */
  version: number;
}

export const INBOX_EMPTY: InboxStatus = { unseen: 0, total: 0, version: 0 };

/** Máximo de itens guardados (os mais antigos saem primeiro). */
export const INBOX_LIMIT = 200;

/** "agora", "há 5 min", "há 2 h", "ontem 14:30", "23/11 09:15". */
export function relativeTime(at: number, now: number): string {
  const diff = Math.max(0, now - at);
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const d = new Date(at);
  const hhmm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const today = new Date(now);
  if (d.toDateString() === today.toDateString()) return `há ${Math.floor(min / 60)} h`;
  const yesterday = new Date(now);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return `ontem ${hhmm}`;
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${hhmm}`;
}
