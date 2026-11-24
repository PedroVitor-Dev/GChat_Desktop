import { app, session, shell, type WebContents } from 'electron';
import { isChatSession } from './chat/session';

/**
 * Endurecimento das janelas locais (configurações): nenhum conteúdo remoto, toda
 * navegação fora do renderer local é bloqueada e links https abrem no navegador.
 *
 * A janela do Google Chat (sessão própria) segue as regras de chat/policy.ts.
 */

const DEV_URL = process.env['ELECTRON_RENDERER_URL'];

export function isTrustedRendererUrl(url: string): boolean {
  if (DEV_URL && url.startsWith(DEV_URL)) return true;
  return url.startsWith('file://') && url.includes('/out/renderer/');
}

function openExternalSafely(url: string): void {
  try {
    if (new URL(url).protocol === 'https:') void shell.openExternal(url);
  } catch {
    // URL inválida: ignora
  }
}

function harden(contents: WebContents): void {
  contents.on('will-navigate', (event, url) => {
    if (!isTrustedRendererUrl(url)) event.preventDefault();
  });
  contents.on('will-redirect', (event, url) => {
    if (!isTrustedRendererUrl(url)) event.preventDefault();
  });
  contents.setWindowOpenHandler(({ url }) => {
    openExternalSafely(url);
    return { action: 'deny' };
  });
  contents.on('will-attach-webview', (event) => event.preventDefault());
}

export function applySecurityPolicies(): void {
  app.on('web-contents-created', (_event, contents) => {
    if (!isChatSession(contents.session)) harden(contents);
  });

  // Janelas locais: nenhuma permissão de navegador, exceto o MICROFONE (só áudio)
  // para o "Testar microfone" das configurações, e só para o renderer local.
  session.defaultSession.setPermissionRequestHandler((wc, permission, callback, details) => {
    const audioOnly =
      permission === 'media' &&
      'mediaTypes' in details &&
      (details.mediaTypes ?? []).length > 0 &&
      (details.mediaTypes ?? []).every((t) => t === 'audio');
    callback(audioOnly && isTrustedRendererUrl(details.requestingUrl || wc.getURL()));
  });
  session.defaultSession.setPermissionCheckHandler(
    (_wc, permission, requestingOrigin, details) =>
      permission === 'media' &&
      details.mediaType !== 'video' &&
      isTrustedRendererUrl(details.requestingUrl ?? requestingOrigin),
  );
}
