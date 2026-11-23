/**
 * Regras de navegação da janela do Google Chat. Funções puras (testáveis).
 *
 * Princípios:
 * - Dentro da janela só ficam o Chat e os fluxos de login do Google (incluindo SSO
 *   corporativo, que pode passar por provedores de identidade de terceiros).
 * - Links de mensagens e qualquer outro destino abrem no navegador padrão.
 * - Nada além de https.
 */

export const CHAT_URL = 'https://chat.google.com/';

/** Página de login oficial; volta ao Chat ao concluir. */
export const LOGIN_URL =
  'https://accounts.google.com/ServiceLogin?continue=' + encodeURIComponent(CHAT_URL);

const parse = (url: string): URL | null => {
  try {
    return new URL(url);
  } catch {
    return null;
  }
};

const isGoogleHost = (host: string): boolean =>
  host === 'google.com' || host.endsWith('.google.com');

/** Hosts usados pelo login do Google (accounts.youtube.com sincroniza a sessão). */
const isGoogleAuthHost = (host: string): boolean =>
  host === 'accounts.google.com' || host === 'accounts.youtube.com';

export function isChatUrl(url: string): boolean {
  const u = parse(url);
  return u?.protocol === 'https:' && u.host === 'chat.google.com';
}

/** Sem sessão, o Chat redireciona para a página de produto em vez do login. */
export function isLoggedOutLanding(url: string): boolean {
  const u = parse(url);
  return u?.host === 'workspace.google.com' && u.pathname.startsWith('/products/chat');
}

export type NavigationDecision = 'allow' | 'external' | 'block';

/**
 * Decide uma navegação de topo na janela do Chat.
 * @param target destino da navegação
 * @param current URL atual da janela (vazia no primeiro carregamento)
 */
export function decideNavigation(target: string, current: string): NavigationDecision {
  const t = parse(target);
  if (!t) return 'block';
  if (t.protocol !== 'https:') return t.protocol === 'http:' ? 'external' : 'block';
  if (isGoogleHost(t.host)) return 'allow';

  // Fora do Google: só permitido no meio de um fluxo de login (SSO corporativo).
  const c = parse(current);
  const inAuthFlow = !c || c.protocol !== 'https:' || !isChatUrl(current);
  return inAuthFlow ? 'allow' : 'external';
}

export type PopupDecision = 'child' | 'external' | 'block';

/** Decide um window.open / link com target=_blank vindo do Chat. */
export function decidePopup(target: string): PopupDecision {
  const t = parse(target);
  if (!t) return 'block';
  if (t.protocol === 'https:' && isGoogleAuthHost(t.host)) return 'child'; // popups de login/consentimento
  if (t.protocol === 'https:' || t.protocol === 'http:') return 'external';
  return 'block';
}

/** Permissões de navegador que o Chat pode receber. Todo o resto é negado. */
const ALLOWED_PERMISSIONS = new Set([
  'notifications',
  'clipboard-sanitized-write',
  'fullscreen',
  'media', // chamadas/huddles
]);

/** Só o Meet pode compartilhar a tela. */
const MEET_ONLY_PERMISSIONS = new Set(['display-capture']);

export function isPermissionAllowed(permission: string, origin: string): boolean {
  const u = parse(origin);
  if (u?.protocol !== 'https:') return false;
  if (MEET_ONLY_PERMISSIONS.has(permission)) return u.host === 'meet.google.com';
  if (!ALLOWED_PERMISSIONS.has(permission)) return false;
  return u.host === 'chat.google.com' || u.host === 'meet.google.com';
}
