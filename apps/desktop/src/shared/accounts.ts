/**
 * Contas: cada uma é uma sessão do Google isolada (partição própria do Chromium),
 * com nome e cor escolhidos pelo usuário. O app não lê o e-mail nem dados da conta.
 */

export interface Account {
  /** Também é o nome da partição: `persist:<id>`. */
  id: string;
  name: string;
  /** Índice em ACCOUNT_COLORS. */
  color: number;
}

export interface AccountsSettings {
  list: Account[];
  active: string;
}

export const ACCOUNT_COLORS = [
  '#5865f2',
  '#23a55a',
  '#f0b232',
  '#da373c',
  '#eb459e',
  '#00a8fc',
] as const;

export const ACCOUNT_LIMITS = {
  max: 5,
  nameLength: 32,
} as const;

export const DEFAULT_ACCOUNT: Account = { id: 'account-1', name: 'Principal', color: 0 };

const ID = /^account-[a-z0-9]{1,12}$/;
export const isAccountId = (v: unknown): v is string => typeof v === 'string' && ID.test(v);

export const partitionOf = (id: string): string => `persist:${id}`;

/** Nome limpo (sem quebras/controles), ou null se ficar vazio. */
export function cleanAccountName(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const name = [...v]
    .filter((c) => c.charCodeAt(0) > 0x1f && c.charCodeAt(0) !== 0x7f)
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, ACCOUNT_LIMITS.nameLength);
  return name || null;
}

/** Iniciais para o ícone do trilho (como os servidores sem ícone do Discord). */
export function accountInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return [...words[0]!].slice(0, 2).join('').toUpperCase();
  return (words[0]![0]! + words[1]![0]!).toUpperCase();
}

export function normalizeAccounts(input: unknown, base: AccountsSettings): AccountsSettings {
  if (typeof input !== 'object' || input === null) return base;
  const raw = input as Record<string, unknown>;
  const list: Account[] = [];
  if (Array.isArray(raw['list'])) {
    for (const item of raw['list']) {
      if (typeof item !== 'object' || item === null) continue;
      const a = item as Record<string, unknown>;
      const name = cleanAccountName(a['name']);
      if (!isAccountId(a['id']) || !name || list.some((x) => x.id === a['id'])) continue;
      const color =
        typeof a['color'] === 'number' && Number.isInteger(a['color'])
          ? Math.abs(a['color']) % ACCOUNT_COLORS.length
          : list.length % ACCOUNT_COLORS.length;
      list.push({ id: a['id'], name, color });
      if (list.length === ACCOUNT_LIMITS.max) break;
    }
  }
  const finalList = list.length > 0 ? list : base.list;
  const active =
    isAccountId(raw['active']) && finalList.some((a) => a.id === raw['active'])
      ? raw['active']
      : finalList.some((a) => a.id === base.active)
        ? base.active
        : finalList[0]!.id;
  return { list: finalList, active };
}

/** Próximo id livre (account-2, account-3…). */
export function nextAccountId(list: readonly Account[]): string {
  for (let n = 1; ; n++) {
    const id = `account-${n}`;
    if (!list.some((a) => a.id === id)) return id;
  }
}
