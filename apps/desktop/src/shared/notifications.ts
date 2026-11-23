/** Contrato entre o preload do Chat e o Notification Manager (main). */

export const NotificationChannel = {
  /** preload → main: o Chat criou uma notificação. */
  Captured: 'chat:notification',
  /** main → preload: o usuário clicou no toast com este id. */
  Clicked: 'chat:notification-click',
} as const;

export type CaptureApi = 'window.Notification' | 'ServiceWorkerRegistration.showNotification';

/** O que o hook extrai da notificação original. Nada além disso é lido. */
export interface CapturedNotification {
  /** Gerado no preload; usado para devolver o clique. */
  id: string;
  api: CaptureApi;
  title: string;
  body?: string;
  tag?: string;
}

export const CAPTURE_LIMITS = {
  id: 64,
  title: 512,
  body: 4096,
  tag: 512,
} as const;

/** Valida e recorta o payload que chega do preload. Retorna null se inválido. */
export function parseCapture(input: unknown): CapturedNotification | null {
  if (typeof input !== 'object' || input === null) return null;
  const r = input as Record<string, unknown>;
  const { id, api, title, body, tag } = r;
  if (typeof id !== 'string' || !/^[\w-]{1,64}$/.test(id)) return null;
  if (api !== 'window.Notification' && api !== 'ServiceWorkerRegistration.showNotification')
    return null;
  if (typeof title !== 'string' || title.trim().length === 0) return null;

  const out: CapturedNotification = { id, api, title: title.slice(0, CAPTURE_LIMITS.title) };
  if (typeof body === 'string' && body.length > 0) out.body = body.slice(0, CAPTURE_LIMITS.body);
  if (typeof tag === 'string' && tag.length > 0) out.tag = tag.slice(0, CAPTURE_LIMITS.tag);
  return out;
}
