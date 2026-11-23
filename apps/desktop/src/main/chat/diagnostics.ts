import type { CapturedNotification } from '../../shared/notifications';

/** GCHAT_DIAG=1 → registra no stderr os METADADOS de cada notificação capturada. */
export const diagnosticsEnabled = process.env['GCHAT_DIAG'] === '1';

const describe = (v: string | undefined): string =>
  v === undefined ? 'ausente' : `string(${v.length})`;

/**
 * Formato do texto sem o conteúdo: letras → a/A, dígitos → 9, demais
 * caracteres (pontuação, @, espaços) mantidos. Ex.: "Oi @Pedro!" → "Aa @Aaaaa!".
 * Serve para entender como o Chat monta a notificação (ex.: se usa "@" nas
 * menções) sem expor a mensagem.
 */
export function textShape(text: string | undefined, max = 80): string {
  if (text === undefined) return 'ausente';
  const shape = [...text.slice(0, max)]
    .map((c) => {
      if (/\p{Lu}/u.test(c)) return 'A';
      if (/\p{L}/u.test(c)) return 'a';
      if (/\p{N}/u.test(c)) return '9';
      if (/\s/u.test(c)) return ' ';
      return c;
    })
    .join('');
  return JSON.stringify(text.length > max ? `${shape}…` : shape);
}

export function logCapture(n: CapturedNotification, topFrame: boolean, outcome: string): void {
  if (!diagnosticsEnabled) return;
  console.error(
    `[diag ${new Date().toISOString()}] ${n.api} (${topFrame ? 'top' : 'iframe'}) ` +
      `title=${describe(n.title)} body=${describe(n.body)} tag=${describe(n.tag)} → ${outcome}\n` +
      `        formato do título: ${textShape(n.title)}\n` +
      `        formato do texto:  ${textShape(n.body)}`,
  );
}
