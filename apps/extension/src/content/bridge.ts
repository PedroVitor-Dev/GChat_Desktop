/**
 * Roda no world ISOLATED. Valida o que vem da página e repassa ao service worker.
 * A página pode publicar qualquer coisa no postMessage, então nada é confiável aqui.
 */
import { LIMITS, PROTOCOL_VERSION, type ChatNotification } from '@gchat/protocol';
import { PAGE_CHANNEL } from '../shared';

const clip = (value: unknown, max: number): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value.slice(0, max) : undefined;

window.addEventListener('message', (event: MessageEvent<unknown>) => {
  if (event.source !== window || event.origin !== location.origin) return;
  const data = event.data as Record<string, unknown> | null;
  if (!data || data['channel'] !== PAGE_CHANNEL || data['kind'] !== 'notification') return;

  const title = clip(data['title'], LIMITS.titleLength);
  if (!title) return;

  const message: ChatNotification = {
    v: PROTOCOL_VERSION,
    type: 'notification',
    id: crypto.randomUUID(),
    title,
    receivedAt: Date.now(),
  };
  const body = clip(data['body'], LIMITS.bodyLength);
  const tag = clip(data['tag'], LIMITS.tagLength);
  if (body !== undefined) message.body = body;
  if (tag !== undefined) message.tag = tag;

  void chrome.runtime.sendMessage(message);
});
