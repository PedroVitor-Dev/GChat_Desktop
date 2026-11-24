import { desktopCapturer, session, type Session } from 'electron';
import { isPermissionAllowed } from './policy';
import { serveNoiseAssets } from '../meet/noise-assets';

/**
 * Sessão persistente do Google Chat. Cookies e armazenamento ficam em
 * %APPDATA%\GChat Desktop+\Partitions\<nome>, criptografados pelo Chromium com
 * DPAPI (chave atrelada ao usuário do Windows). O app nunca lê nem copia esses dados.
 *
 * Cada conta tem sua própria partição (persist:<id da conta>).
 */

const configured = new WeakSet<Session>();

export function isChatSession(ses: Session): boolean {
  return configured.has(ses);
}

export function getChatSession(partition: string): Session {
  const ses = session.fromPartition(partition);
  if (configured.has(ses)) return ses;
  configured.add(ses);

  ses.setPermissionRequestHandler((wc, permission, callback, details) => {
    callback(isPermissionAllowed(permission, details.requestingUrl || wc.getURL()));
  });
  ses.setPermissionCheckHandler((_wc, permission, requestingOrigin) =>
    isPermissionAllowed(permission, requestingOrigin),
  );
  // Compartilhar tela no Meet: usa a tela principal (com o áudio do sistema).
  ses.setDisplayMediaRequestHandler((request, callback) => {
    if (!isPermissionAllowed('display-capture', request.securityOrigin)) return callback({});
    void desktopCapturer
      .getSources({ types: ['screen'] })
      .then((sources) => callback(sources[0] ? { video: sources[0], audio: 'loopback' } : {}))
      .catch(() => callback({}));
  });
  ses.setSpellCheckerLanguages(['pt-BR', 'en-US']);
  // Arquivos locais do supressor de ruído para o Meet (gchat-audio://).
  serveNoiseAssets(ses);
  return ses;
}
