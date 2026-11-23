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
import { OPEN_STATUS_CHANNEL, PROFILE_CHANNEL, STATUS_CHANNEL } from '../shared/profile';

const CHAT_ORIGIN = 'https://chat.google.com';

/**
 * Perfil: lê do botão da conta (canto superior do Chat) só a foto e o nome
 * exibidos — o e-mail que também aparece no rótulo é descartado aqui mesmo.
 * Roda no world isolado (lê o DOM, não expõe nada à página).
 */
function watchProfile(): void {
  let last = '';
  const report = () => {
    const button = document.querySelector<HTMLAnchorElement>(
      'a[aria-label^="Conta do Google"], a[aria-label^="Google Account"]',
    );
    const img = button?.querySelector<HTMLImageElement>('img[src*="googleusercontent.com"]');
    if (!button || !img) return;
    // "Conta do Google: Nome \n(email)" → "Nome"
    const label = button.getAttribute('aria-label') ?? '';
    const displayName = label.split(':').slice(1).join(':').split('\n')[0]!.split('(')[0]!.trim();
    const key = `${img.src}|${displayName}`;
    if (!displayName || key === last) return;
    last = key;
    ipcRenderer.send(PROFILE_CHANNEL, { photoUrl: img.src, displayName });
  };
  // A barra do Chat aparece depois do carregamento; depois disso, checagem leve.
  const observer = new MutationObserver(() => {
    report();
    if (last) observer.disconnect();
  });
  const start = () => {
    report();
    if (!last) observer.observe(document.body, { childList: true, subtree: true });
    setInterval(report, 5 * 60_000); // troca de foto/nome no Google
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
}

/**
 * Status do Chat (botão "Ativo ▾" no topo): lê só o rótulo e o texto visíveis do
 * botão, para o app mostrar na foto do trilho, e abre esse menu quando o usuário
 * clica na foto. Quem define o status é sempre o próprio Chat.
 */
const STATUS_BUTTON =
  '[role="button"][aria-label^="Status:"], [role="button"][aria-label^="Status :"]';

function watchStatus(): void {
  let last = '';
  const report = () => {
    const button = document.querySelector<HTMLElement>(STATUS_BUTTON);
    if (!button) return;
    const label = button.getAttribute('aria-label') ?? '';
    const text = (button.textContent ?? '').trim();
    const key = `${label}|${text}`;
    if (key === last) return;
    last = key;
    ipcRenderer.send(STATUS_CHANNEL, { label, text });
  };
  // Uma consulta a cada 2 s é bem mais leve que observar o DOM inteiro do Chat.
  setInterval(report, 2000);
  ipcRenderer.on(OPEN_STATUS_CHANNEL, () => {
    const button = document.querySelector<HTMLElement>(STATUS_BUTTON);
    if (!button) return;
    button.focus();
    button.click();
  });
}

if (location.origin === CHAT_ORIGIN && window === window.top) {
  watchProfile();
  watchStatus();
}

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

      // ── Som de notificação do próprio Chat ──────────────────────────────
      // O app toca o som escolhido pelo usuário. O Chat também toca o dele (um
      // pouco ANTES de criar a notificação), e os dois se sobrepunham. Sons
      // curtos da página são segurados por SOUND_HOLD_MS: se uma notificação
      // chega nesse intervalo, o som do Chat é descartado; se não, toca
      // normalmente. Áudio de chamadas (srcObject/MediaStream) e sons em
      // repetição (toque de chamada) nunca são afetados.
      const SOUND_HOLD_MS = 150;
      const AFTER_NOTIFY_MS = 1500;
      let lastNotifyAt = 0;
      const held = new Set<{ cancel: () => void }>();
      const recentlyNotified = () => Date.now() - lastNotifyAt < AFTER_NOTIFY_MS;
      const dropHeldSounds = () => {
        for (const h of held) h.cancel();
        held.clear();
      };

      const media = window.HTMLMediaElement?.prototype;
      if (media?.play) {
        const play = media.play;
        media.play = function (this: HTMLMediaElement) {
          const isNotificationLike = !this.srcObject && !this.loop;
          if (!isNotificationLike) return play.call(this);
          if (recentlyNotified()) return Promise.resolve();
          return new Promise<void>((resolve) => {
            const entry = {
              cancel: () => {
                clearTimeout(timer);
                resolve(); // a página segue como se tivesse tocado
              },
            };
            const timer = setTimeout(() => {
              held.delete(entry);
              play.call(this).then(resolve, resolve);
            }, SOUND_HOLD_MS);
            held.add(entry);
          });
        } as typeof media.play;
      }

      const source = window.AudioBufferSourceNode?.prototype;
      if (source?.start) {
        const start = source.start;
        source.start = function (
          this: AudioBufferSourceNode,
          when = 0,
          offset?: number,
          duration?: number,
        ) {
          const short = !this.loop && (this.buffer?.duration ?? Infinity) <= 4;
          if (!short) return start.call(this, when, offset, duration);
          if (recentlyNotified()) return;
          // Agenda com atraso e cancela (stop antes de começar) se vier notificação.
          const at = Math.max(when, this.context.currentTime) + SOUND_HOLD_MS / 1000;
          start.call(this, at, offset, duration);
          const entry = {
            cancel: () => {
              try {
                this.stop();
              } catch {
                // já terminou
              }
            },
          };
          held.add(entry);
          setTimeout(() => held.delete(entry), SOUND_HOLD_MS + 50);
        } as typeof source.start;
      }

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
        const id = bridge.notify(payload);
        if (id) {
          // O app vai tocar o som dele: descarta o do Chat.
          lastNotifyAt = Date.now();
          dropHeldSounds();
        }
        return id;
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
