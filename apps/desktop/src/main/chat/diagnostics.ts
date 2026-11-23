import type { CapturedNotification } from '../../shared/notifications';

/** GCHAT_DIAG=1 → registra no stderr os METADADOS de cada notificação capturada. */
export const diagnosticsEnabled = process.env['GCHAT_DIAG'] === '1';

const describe = (v: string | undefined): string =>
  v === undefined ? 'ausente' : `string(${v.length})`;

export function logCapture(n: CapturedNotification, topFrame: boolean, outcome: string): void {
  if (!diagnosticsEnabled) return;
  console.error(
    `[diag ${new Date().toISOString()}] ${n.api} (${topFrame ? 'top' : 'iframe'}) ` +
      `title=${describe(n.title)} body=${describe(n.body)} tag=${describe(n.tag)} → ${outcome}`,
  );
}
