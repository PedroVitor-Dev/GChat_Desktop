/**
 * Novidades de cada versão (fonte única): mostradas na aba Atualizações e usadas
 * pelo workflow de Release para escrever as notas no GitHub
 * (scripts/release-notes.mjs). Ao publicar uma versão, acrescente-a no topo de
 * changelog.json.
 */
import data from './changelog.json';

export interface ReleaseNotes {
  version: string;
  /** AAAA-MM-DD */
  date: string;
  highlights: string[];
}

export const CHANGELOG: readonly ReleaseNotes[] = data;

export function notesFor(version: string): ReleaseNotes | undefined {
  return CHANGELOG.find((r) => r.version === version);
}

const MAX_ITEMS = 15;
const MAX_LENGTH = 240;

/**
 * Destaques de uma versão nova a partir das notas do Release no GitHub (o
 * electron-updater entrega o corpo do Release em HTML). Pega só os itens da
 * primeira lista não numerada ("Novidades"), sem tags, e limita o tamanho.
 */
export function highlightsFromReleaseNotes(notes: unknown): string[] {
  const text =
    typeof notes === 'string'
      ? notes
      : Array.isArray(notes)
        ? notes
            .map((n) =>
              typeof n === 'object' && n && 'note' in n
                ? String((n as { note: unknown }).note)
                : '',
            )
            .join('\n')
        : '';
  const list = /<ul[^>]*>([\s\S]*?)<\/ul>/i.exec(text)?.[1];
  if (!list) return [];
  const decode = (s: string) =>
    s
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  return [...list.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
    .map((m) => decode(m[1] ?? ''))
    .filter(Boolean)
    .slice(0, MAX_ITEMS)
    .map((s) => (s.length > MAX_LENGTH ? `${s.slice(0, MAX_LENGTH - 1)}…` : s));
}
