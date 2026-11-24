import { describe, expect, it } from 'vitest';
import { INBOX_LIMIT, relativeTime } from '../../shared/inbox';
import type { CapturedNotification } from '../../shared/notifications';
import { NotificationHistory } from './history';

const n = (title: string, body = 'oi'): CapturedNotification => ({
  id: `n-${title}`,
  api: 'window.Notification',
  title,
  body,
});
const info = {
  accountId: 'account-1',
  reason: 'paused' as const,
  mention: false,
  vip: false,
  frame: null,
};
const open = { showSender: true, showPreview: true };

describe('NotificationHistory', () => {
  it('guarda o mais novo primeiro, conta não vistos e marca como visto', () => {
    const h = new NotificationHistory();
    h.add(n('Maria'), info);
    h.add(n('João'), { ...info, reason: 'away', mention: true });
    expect(h.list(open, () => null).map((e) => e.title)).toEqual(['João', 'Maria']);
    expect(h.status()).toMatchObject({ unseen: 2, total: 2 });
    h.markAllSeen();
    expect(h.status().unseen).toBe(0);
  });

  it('respeita a privacidade ao listar', () => {
    const h = new NotificationHistory();
    h.add(n('Maria', 'segredo'), info);
    const [e] = h.list({ showSender: false, showPreview: false }, () => null);
    expect(e).toMatchObject({ title: 'Conversa oculta', body: null });
  });

  it('limita o tamanho e permite remover, abrir e limpar', () => {
    const h = new NotificationHistory();
    for (let i = 0; i < INBOX_LIMIT + 5; i++) h.add(n(`c${i}`), info);
    expect(h.status().total).toBe(INBOX_LIMIT);
    const first = h.list(open, () => null)[0]!;
    expect(h.take(first.id)).toMatchObject({
      title: first.title,
      notificationId: `n-${first.title}`,
    });
    expect(h.status().total).toBe(INBOX_LIMIT - 1);
    h.clear();
    expect(h.status().total).toBe(0);
  });
});

describe('ler a conversa', () => {
  it('tira da lista só os itens daquela conversa e conta', () => {
    const h = new NotificationHistory();
    h.add(n('Luana Kamila'), info);
    h.add(n('Equipe'), info);
    h.add(n('Luana Kamila'), { ...info, accountId: 'account-2' });
    h.dismissConversation('account-1', '  luana  kamila ');
    expect(h.list(open, () => null).map((e) => [e.title, e.accountId])).toEqual([
      ['Luana Kamila', 'account-2'],
      ['Equipe', 'account-1'],
    ]);
  });
});

describe('relativeTime', () => {
  const now = new Date(2026, 10, 23, 15, 0).getTime();
  it('formata em português', () => {
    expect(relativeTime(now - 20_000, now)).toBe('agora');
    expect(relativeTime(now - 5 * 60_000, now)).toBe('há 5 min');
    expect(relativeTime(now - 3 * 3_600_000, now)).toBe('há 3 h');
    expect(relativeTime(new Date(2026, 10, 22, 14, 30).getTime(), now)).toBe('ontem 14:30');
    expect(relativeTime(new Date(2026, 10, 20, 9, 5).getTime(), now)).toBe('20/11 09:05');
  });
});
