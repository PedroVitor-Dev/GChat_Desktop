/**
 * Mensagens trocadas entre extensão ⇄ native-host ⇄ app Windows.
 *
 * Regras:
 * - Todo payload que cruza um limite de processo passa por `parse*` antes de ser usado.
 * - Os limites de tamanho protegem contra abuso. O Native Messaging aceita até 1 MB
 *   do host para o navegador, mas nossas mensagens são bem menores.
 */

export const PROTOCOL_VERSION = 1;

export const LIMITS = {
  idLength: 64,
  titleLength: 512,
  bodyLength: 4096,
  tagLength: 512,
  versionLength: 32,
  maxUnread: 100_000,
} as const;

export type BrowserKind = 'chrome' | 'edge' | 'other';

/** Uma notificação capturada no Google Chat. Campos opcionais podem não existir. */
export interface ChatNotification {
  v: typeof PROTOCOL_VERSION;
  type: 'notification';
  /** ID gerado pela extensão, único por notificação capturada. */
  id: string;
  title: string;
  body?: string;
  /** `tag` original da Web Notification, quando o Chat fornecer. */
  tag?: string;
  /** Epoch em ms do momento da captura. */
  receivedAt: number;
}

export interface UnreadCount {
  v: typeof PROTOCOL_VERSION;
  type: 'unread';
  count: number;
}

export interface Hello {
  v: typeof PROTOCOL_VERSION;
  type: 'hello';
  browser: BrowserKind;
  extensionVersion: string;
}

export type ExtensionToApp = ChatNotification | UnreadCount | Hello;

/** Pede à extensão que foque o Chat e dispare o clique da notificação original. */
export interface FocusNotification {
  v: typeof PROTOCOL_VERSION;
  type: 'focus';
  id: string;
}

/** Configuração aplicada pela extensão em tempo real. */
export interface ExtensionConfig {
  v: typeof PROTOCOL_VERSION;
  type: 'config';
  /** Se true, o pop-up do navegador é suprimido para não duplicar o toast do app. */
  suppressBrowserNotification: boolean;
}

export type AppToExtension = FocusNotification | ExtensionConfig;

export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

const str = (v: unknown, max: number): v is string =>
  typeof v === 'string' && v.length > 0 && v.length <= max;

const optStr = (v: unknown, max: number): boolean =>
  v === undefined || (typeof v === 'string' && v.length <= max);

const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });

function header(input: unknown): ParseResult<Obj> {
  if (!isObj(input)) return fail('payload não é um objeto');
  if (input.v !== PROTOCOL_VERSION) return fail('versão de protocolo incompatível');
  if (typeof input.type !== 'string') return fail('campo type ausente');
  return { ok: true, value: input };
}

export function parseExtensionToApp(input: unknown): ParseResult<ExtensionToApp> {
  const h = header(input);
  if (!h.ok) return h;
  const m = h.value;

  switch (m.type) {
    case 'notification': {
      if (!str(m.id, LIMITS.idLength)) return fail('notification.id inválido');
      if (!str(m.title, LIMITS.titleLength)) return fail('notification.title inválido');
      if (!optStr(m.body, LIMITS.bodyLength)) return fail('notification.body inválido');
      if (!optStr(m.tag, LIMITS.tagLength)) return fail('notification.tag inválido');
      if (typeof m.receivedAt !== 'number' || !Number.isFinite(m.receivedAt) || m.receivedAt <= 0)
        return fail('notification.receivedAt inválido');
      const value: ChatNotification = {
        v: PROTOCOL_VERSION,
        type: 'notification',
        id: m.id,
        title: m.title,
        receivedAt: m.receivedAt,
      };
      if (typeof m.body === 'string') value.body = m.body;
      if (typeof m.tag === 'string' && m.tag.length > 0) value.tag = m.tag;
      return { ok: true, value };
    }
    case 'unread': {
      if (
        typeof m.count !== 'number' ||
        !Number.isInteger(m.count) ||
        m.count < 0 ||
        m.count > LIMITS.maxUnread
      )
        return fail('unread.count inválido');
      return { ok: true, value: { v: PROTOCOL_VERSION, type: 'unread', count: m.count } };
    }
    case 'hello': {
      if (m.browser !== 'chrome' && m.browser !== 'edge' && m.browser !== 'other')
        return fail('hello.browser inválido');
      if (!str(m.extensionVersion, LIMITS.versionLength))
        return fail('hello.extensionVersion inválido');
      return {
        ok: true,
        value: {
          v: PROTOCOL_VERSION,
          type: 'hello',
          browser: m.browser,
          extensionVersion: m.extensionVersion,
        },
      };
    }
    default:
      return fail('type desconhecido');
  }
}

export function parseAppToExtension(input: unknown): ParseResult<AppToExtension> {
  const h = header(input);
  if (!h.ok) return h;
  const m = h.value;

  switch (m.type) {
    case 'focus':
      if (!str(m.id, LIMITS.idLength)) return fail('focus.id inválido');
      return { ok: true, value: { v: PROTOCOL_VERSION, type: 'focus', id: m.id } };
    case 'config':
      if (typeof m.suppressBrowserNotification !== 'boolean')
        return fail('config.suppressBrowserNotification inválido');
      return {
        ok: true,
        value: {
          v: PROTOCOL_VERSION,
          type: 'config',
          suppressBrowserNotification: m.suppressBrowserNotification,
        },
      };
    default:
      return fail('type desconhecido');
  }
}
