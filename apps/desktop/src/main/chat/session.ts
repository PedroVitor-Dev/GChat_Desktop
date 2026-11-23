import { session, type Session } from 'electron';
import { isPermissionAllowed } from './policy';

/**
 * Sessão persistente do Google Chat. Cookies e armazenamento ficam em
 * %APPDATA%\GChat Desktop+\Partitions\<nome>, criptografados pelo Chromium com
 * DPAPI (chave atrelada ao usuário do Windows). O app nunca lê nem copia esses dados.
 *
 * Cada conta terá sua própria partição (múltiplas contas — Fase 7).
 */
export const DEFAULT_PARTITION = 'persist:account-1';

const configured = new WeakSet<Session>();

export function isChatSession(ses: Session): boolean {
  return configured.has(ses);
}

export function getChatSession(partition = DEFAULT_PARTITION): Session {
  const ses = session.fromPartition(partition);
  if (configured.has(ses)) return ses;
  configured.add(ses);

  ses.setPermissionRequestHandler((wc, permission, callback, details) => {
    callback(isPermissionAllowed(permission, details.requestingUrl || wc.getURL()));
  });
  ses.setPermissionCheckHandler((_wc, permission, requestingOrigin) =>
    isPermissionAllowed(permission, requestingOrigin),
  );
  ses.setSpellCheckerLanguages(['pt-BR', 'en-US']);
  return ses;
}
