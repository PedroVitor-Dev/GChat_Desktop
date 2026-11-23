/**
 * Roda no world MAIN da página do Google Chat.
 *
 * ⚠️ É o ÚNICO ponto do projeto que depende de comportamento não documentado do
 * Chat (como e com quais campos ele cria notificações). Lê somente título, corpo e
 * tag. Não acessa cookies, storage, DOM de mensagens nem credenciais.
 *
 * Fase 2: esqueleto que apenas observa e repassa. Supressão do pop-up e repasse do
 * clique entram na Fase 4, depois da validação com a sonda (docs/fase-1-viabilidade.md §6).
 */
import { PAGE_CHANNEL, type PageNotificationEvent } from '../shared';

const publish = (title: unknown, options: NotificationOptions | undefined): void => {
  if (typeof title !== 'string' || title.length === 0) return;
  const event: PageNotificationEvent = { channel: PAGE_CHANNEL, kind: 'notification', title };
  if (typeof options?.body === 'string') event.body = options.body;
  if (typeof options?.tag === 'string' && options.tag) event.tag = options.tag;
  window.postMessage(event, location.origin);
};

const Original = window.Notification;
if (typeof Original === 'function') {
  const Hooked = function Notification(title: string, options?: NotificationOptions) {
    publish(title, options);
    return new Original(title, options);
  } as unknown as typeof Notification;

  Hooked.prototype = Original.prototype;
  Object.defineProperty(Hooked, 'permission', { get: () => Original.permission });
  Object.defineProperty(Hooked, 'requestPermission', {
    value: Original.requestPermission.bind(Original),
  });
  window.Notification = Hooked;
}
