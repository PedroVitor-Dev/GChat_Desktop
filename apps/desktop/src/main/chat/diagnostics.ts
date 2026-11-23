import { app, ipcMain } from 'electron';
import { DIAG_CHANNEL, DIAG_FLAG } from '../../shared/diagnostics';
import { isChatUrl } from './policy';
import { isChatSession } from './session';

export const diagnosticsEnabled = process.env['GCHAT_DIAG'] === '1';

/** Argumento repassado ao preload do Chat para ligar o observador. */
export const diagnosticsArgs = (): string[] => (diagnosticsEnabled ? [DIAG_FLAG] : []);

const FIELD_VALUE = /^(ausente|string\(\d{1,6}\)|object\{[\w,]{0,200}\}|[a-z]{1,12})$/;

/**
 * Recebe os metadados do observador e escreve no stderr. Revalida tudo: a página
 * do Chat pode chamar o reporter, então só passam chaves e valores no formato
 * esperado (tipo/tamanho), nunca texto livre.
 */
export function registerChatDiagnostics(): void {
  if (!diagnosticsEnabled) return;

  ipcMain.on(DIAG_CHANNEL, (event, raw: unknown) => {
    if (!isChatSession(event.sender.session) || !isChatUrl(event.senderFrame?.url ?? '')) return;
    if (typeof raw !== 'object' || raw === null) return;
    const { api, frame, fields } = raw as Record<string, unknown>;
    if (typeof api !== 'string' || !/^[\w.]{1,60}$/.test(api)) return;
    if (frame !== 'top' && frame !== 'iframe') return;
    if (typeof fields !== 'object' || fields === null) return;

    const safe: Record<string, string> = {};
    for (const [k, v] of Object.entries(fields).slice(0, 30)) {
      if (/^\w{1,30}$/.test(k) && typeof v === 'string' && FIELD_VALUE.test(v)) safe[k] = v;
    }
    console.error(`[diag ${new Date().toISOString()}] ${api} (${frame}) ${JSON.stringify(safe)}`);
  });

  app.on('quit', () => ipcMain.removeAllListeners(DIAG_CHANNEL));
}
