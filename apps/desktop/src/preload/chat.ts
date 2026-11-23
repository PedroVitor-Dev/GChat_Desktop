/**
 * Preload da janela do Google Chat (sandbox + contextIsolation).
 *
 * ⚠️ Único ponto do projeto que depende de comportamento não documentado do Chat:
 * ele cria notificações pela Web Notifications API. Substituímos `Notification`
 * (e `registration.showNotification`) na página por uma versão que:
 *   1. lê apenas título, corpo e tag;
 *   2. entrega esses dados ao app, que decide e mostra o toast nativo;
 *   3. devolve o clique do toast à página, que abre a conversa como faria normalmente.
 *
 * Se algo falhar no caminho, cai na Notification original (o Electron mostra o
 * toast padrão): o usuário nunca fica sem aviso por causa do hook.
 */
import { contextBridge, ipcRenderer } from 'electron';
import { NotificationChannel, type CapturedNotification } from '../shared/notifications';

const CHAT_ORIGIN = 'https://chat.google.com';

if (location.origin === CHAT_ORIGIN) {
  let clickListener: ((id: string) => void) | null = null;
  ipcRenderer.on(NotificationChannel.Clicked, (_event, id: unknown) => {
    if (typeof id === 'string') clickListener?.(id);
  });

  contextBridge.exposeInMainWorld('__gchatDesktop', {
    /** Retorna o id da notificação ou null se não puder entregar. */
    notify(payload: Omit<CapturedNotification, 'id'>): string | null {
      try {
        const id = crypto.randomUUID();
        ipcRenderer.send(NotificationChannel.Captured, { ...payload, id });
        return id;
      } catch {
        return null;
      }
    },
    /** Registra quem trata cliques (só o primeiro registro vale). */
    onClick(listener: (id: string) => void): void {
      clickListener ??= listener;
    },
  });

  // Executado no world da página antes dos scripts do Chat. Função serializada:
  // não pode usar nada de fora dela.
  contextBridge.executeInMainWorld({
    func: () => {
      type Bridge = {
        notify: (p: { api: string; title: string; body?: string; tag?: string }) => string | null;
        onClick: (l: (id: string) => void) => void;
      };
      const w = window as unknown as { __gchatDesktop?: Bridge };
      const bridge = w.__gchatDesktop;
      const Original = window.Notification;
      if (!bridge || typeof Original !== 'function') return;

      const str = (v: unknown): string | undefined =>
        typeof v === 'string' && v.length > 0 ? v : undefined;
      const capture = (api: string, title: unknown, options?: NotificationOptions) => {
        const payload: { api: string; title: string; body?: string; tag?: string } = {
          api,
          title: String(title),
        };
        const body = str(options?.body);
        const tag = str(options?.tag);
        if (body) payload.body = body;
        if (tag) payload.tag = tag;
        return bridge.notify(payload);
      };

      const registry = new Map<string, EventTarget>();
      const fire = (target: EventTarget, type: string) => {
        const event = new Event(type);
        target.dispatchEvent(event);
        const handler = (target as unknown as Record<string, unknown>)[`on${type}`];
        if (typeof handler === 'function') handler.call(target, event);
      };
      bridge.onClick((id) => {
        const n = registry.get(id);
        if (n) fire(n, 'click');
      });

      class DesktopNotification extends EventTarget {
        readonly title: string;
        readonly body: string;
        readonly tag: string;
        readonly data: unknown;
        readonly icon: string;
        readonly silent: boolean | null;
        onclick: ((e: Event) => unknown) | null = null;
        onshow: ((e: Event) => unknown) | null = null;
        onclose: ((e: Event) => unknown) | null = null;
        onerror: ((e: Event) => unknown) | null = null;
        private readonly id: string;

        constructor(id: string, title: string, options?: NotificationOptions) {
          super();
          this.id = id;
          this.title = String(title);
          this.body = options?.body ?? '';
          this.tag = options?.tag ?? '';
          this.data = options?.data ?? null;
          this.icon = options?.icon ?? '';
          this.silent = options?.silent ?? null;
          registry.set(id, this);
          if (registry.size > 100) registry.delete(registry.keys().next().value!);
          setTimeout(() => fire(this, 'show'), 0);
        }

        close(): void {
          if (registry.delete(this.id)) fire(this, 'close');
        }
      }
      // `instanceof Notification` continua verdadeiro para o código do Chat.
      Object.setPrototypeOf(DesktopNotification.prototype, Original.prototype);

      // Construtor exposto à página: entrega ao app ou, se falhar, usa o original.
      const NotificationShim = function Notification(
        this: unknown,
        title: string,
        options?: NotificationOptions,
      ) {
        if (!new.target) throw new TypeError("Failed to construct 'Notification'");
        const id = capture('window.Notification', title, options);
        return id ? new DesktopNotification(id, title, options) : new Original(title, options);
      } as unknown as typeof Notification;
      NotificationShim.prototype = Original.prototype;
      Object.defineProperty(NotificationShim, 'permission', { get: () => Original.permission });
      Object.defineProperty(NotificationShim, 'requestPermission', {
        value: Original.requestPermission.bind(Original),
      });
      if ('maxActions' in Original) {
        Object.defineProperty(NotificationShim, 'maxActions', {
          get: () => (Original as unknown as { maxActions: number }).maxActions,
        });
      }
      window.Notification = NotificationShim;

      // Notificações via service worker: sem como devolver o clique à página;
      // o app só foca a janela. Mantém o contrato (Promise resolvida).
      const proto = window.ServiceWorkerRegistration?.prototype;
      if (proto?.showNotification) {
        const show = proto.showNotification;
        proto.showNotification = function (title: string, options?: NotificationOptions) {
          return capture('ServiceWorkerRegistration.showNotification', title, options)
            ? Promise.resolve()
            : show.call(this, title, options);
        };
      }
    },
  });
}
