/**
 * Conversas fixadas: um painel do app (como a lista de canais do Discord) com
 * grupos de conversas do Google Chat para o dia a dia. Nada muda no Chat: o app
 * só guarda o endereço da conversa (ex.: /app/chat/AAAA) e navega até ele.
 */

export interface PinItem {
  id: string;
  /** Nome exibido no painel (o usuário pode renomear). */
  name: string;
  /** Nome da conversa no Chat (título da página), para casar com as notificações. */
  chatName: string;
  /** Caminho da conversa no Chat, ex.: "/app/chat/vOCMsaAAAAE". */
  path: string;
  /** Emoji opcional no lugar do ícone padrão. */
  emoji: string | null;
}

export interface PinGroup {
  id: string;
  accountId: string;
  name: string;
  collapsed: boolean;
  items: PinItem[];
}

export interface PinsSettings {
  /** Painel aberto ao lado do Chat. */
  panelOpen: boolean;
  groups: PinGroup[];
}

export const DEFAULT_PINS: PinsSettings = { panelOpen: true, groups: [] };

export const PIN_LIMITS = {
  groupsPerAccount: 20,
  itemsPerGroup: 50,
  itemsPerAccount: 100,
  nameLength: 60,
  groupNameLength: 32,
  emojiLength: 16,
} as const;

/** Nome do primeiro grupo, criado ao fixar a primeira conversa. */
export const DEFAULT_GROUP_NAME = 'Fixados';

const PIN_ID = /^pin-[a-z0-9]{6,24}$/;
const GROUP_ID = /^grp-[a-z0-9]{6,24}$/;
const ACCOUNT_ID = /^account-[a-z0-9]{1,12}$/;
/** Conversas do Chat: /app/chat/<id> (e variantes dm/room/space). */
const PATH = /^\/app\/(chat|dm|room|space)\/[A-Za-z0-9_-]{4,80}$/;

export const isPinId = (v: unknown): v is string => typeof v === 'string' && PIN_ID.test(v);
export const isGroupId = (v: unknown): v is string => typeof v === 'string' && GROUP_ID.test(v);
export const isChatPath = (v: unknown): v is string => typeof v === 'string' && PATH.test(v);

export function newId(prefix: 'pin' | 'grp'): string {
  return `${prefix}-${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
}

/**
 * Caminho da conversa a partir da URL do Chat. Ignora o que vem depois da
 * conversa (ex.: uma thread aberta) e devolve null fora de uma conversa.
 */
export function chatPathFromUrl(url: string): string | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.protocol !== 'https:' || u.host !== 'chat.google.com') return null;
  const m = /\/app\/(chat|dm|room|space)\/([A-Za-z0-9_-]{4,80})/.exec(u.pathname);
  return m ? `/app/${m[1]}/${m[2]}` : null;
}

/** "Luana kamila - Chat" → "Luana kamila"; "Chat" (início) → null. */
export function chatNameFromTitle(title: string): string | null {
  const name = cleanText(title.replace(/\s+[-–—]\s+(Google\s+)?Chat$/i, ''), PIN_LIMITS.nameLength);
  return name && !/^(google\s+)?chat$/i.test(name) ? name : null;
}

export function cleanText(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null;
  const text = [...v]
    .filter((c) => c.charCodeAt(0) > 0x1f && c.charCodeAt(0) !== 0x7f)
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
  return text ? [...text].slice(0, max).join('') : null;
}

function cleanEmoji(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const e = v.trim();
  if (!e || e.length > PIN_LIMITS.emojiLength) return null;
  // Um único emoji (inclusive os compostos, como 👨‍👩‍👧), sem letras ou números.
  const graphemes = [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(e)];
  if (graphemes.length !== 1) return null;
  return /\p{Extended_Pictographic}/u.test(e) && !/[\p{L}\p{N}<>]/u.test(e) ? e : null;
}

/**
 * Valida a lista vinda do disco ou do renderer. Descarta grupos de contas que
 * não existem mais, ids repetidos e conversas repetidas na mesma conta.
 */
export function normalizePins(
  input: unknown,
  fallback: PinsSettings,
  accountIds: readonly string[],
): PinsSettings {
  // Sem lista nova (ex.: só as contas mudaram), revalida a atual: assim os grupos
  // de uma conta removida somem junto com ela.
  const r = (typeof input === 'object' && input !== null ? input : fallback) as unknown as Record<
    string,
    unknown
  >;
  const panelOpen = typeof r['panelOpen'] === 'boolean' ? r['panelOpen'] : fallback.panelOpen;
  const rawGroups = Array.isArray(r['groups']) ? r['groups'] : fallback.groups;

  const groups: PinGroup[] = [];
  const seenIds = new Set<string>();
  const perAccount = new Map<string, { groups: number; items: number; paths: Set<string> }>();

  for (const g of rawGroups) {
    if (typeof g !== 'object' || g === null) continue;
    const gr = g as Record<string, unknown>;
    const accountId = gr['accountId'];
    const name = cleanText(gr['name'], PIN_LIMITS.groupNameLength);
    if (!isGroupId(gr['id']) || seenIds.has(gr['id']) || !name) continue;
    if (typeof accountId !== 'string' || !ACCOUNT_ID.test(accountId)) continue;
    if (!accountIds.includes(accountId)) continue;
    const count = perAccount.get(accountId) ?? { groups: 0, items: 0, paths: new Set() };
    if (count.groups >= PIN_LIMITS.groupsPerAccount) continue;
    count.groups += 1;
    perAccount.set(accountId, count);
    seenIds.add(gr['id']);

    const items: PinItem[] = [];
    for (const it of Array.isArray(gr['items']) ? gr['items'] : []) {
      if (typeof it !== 'object' || it === null) continue;
      const ir = it as Record<string, unknown>;
      const itemName = cleanText(ir['name'], PIN_LIMITS.nameLength);
      const chatName = cleanText(ir['chatName'], PIN_LIMITS.nameLength) ?? itemName;
      if (!isPinId(ir['id']) || seenIds.has(ir['id']) || !itemName || !chatName) continue;
      if (!isChatPath(ir['path']) || count.paths.has(ir['path'])) continue;
      if (items.length >= PIN_LIMITS.itemsPerGroup || count.items >= PIN_LIMITS.itemsPerAccount)
        break;
      seenIds.add(ir['id']);
      count.paths.add(ir['path']);
      count.items += 1;
      items.push({
        id: ir['id'],
        name: itemName,
        chatName,
        path: ir['path'],
        emoji: cleanEmoji(ir['emoji']),
      });
    }
    groups.push({
      id: gr['id'],
      accountId,
      name,
      collapsed: typeof gr['collapsed'] === 'boolean' ? gr['collapsed'] : false,
      items,
    });
  }
  return { panelOpen, groups };
}

/** Conversas fixadas de uma conta, na ordem do painel (para Alt+1…9). */
export function pinsOf(pins: PinsSettings, accountId: string): PinItem[] {
  return pins.groups.filter((g) => g.accountId === accountId).flatMap((g) => g.items);
}

/** Acrescenta uma conversa (no grupo pedido ou no primeiro da conta, criando se preciso). */
export function addPin(
  pins: PinsSettings,
  accountId: string,
  item: Omit<PinItem, 'id' | 'emoji'>,
  groupId: string | null,
): { pins: PinsSettings; pinId: string } | { error: string } {
  const existing = pinsOf(pins, accountId).find((p) => p.path === item.path);
  if (existing) return { error: 'Esta conversa já está fixada.' };
  if (pinsOf(pins, accountId).length >= PIN_LIMITS.itemsPerAccount) {
    return { error: `Limite de ${PIN_LIMITS.itemsPerAccount} conversas fixadas.` };
  }
  const groups = pins.groups.map((g) => ({ ...g, items: [...g.items] }));
  let target =
    groups.find((g) => g.id === groupId && g.accountId === accountId) ??
    groups.find((g) => g.accountId === accountId);
  if (!target) {
    target = { id: newId('grp'), accountId, name: DEFAULT_GROUP_NAME, collapsed: false, items: [] };
    groups.push(target);
  }
  if (target.items.length >= PIN_LIMITS.itemsPerGroup) {
    return { error: `O grupo “${target.name}” está cheio.` };
  }
  const pinId = newId('pin');
  target.items.push({ ...item, id: pinId, emoji: null });
  target.collapsed = false;
  return { pins: { ...pins, groups }, pinId };
}

// ───────────────────────── conversas da barra lateral do Chat ─────────────────────────
//
// Para fixar sem abrir a conversa, o app pede ao preload do Chat a lista da barra
// lateral (Mensagens diretas e Espaços): só o identificador e o nome de cada uma.
// Nada de mensagens: a lista "Início" (que mostra prévias) é ignorada.

/** main → preload do Chat: "manda a lista" (com um id de pedido). */
export const CONVERSATIONS_REQUEST = 'chat:list-conversations';
/** preload do Chat → main: a lista. */
export const CONVERSATIONS_REPLY = 'chat:conversations';

export interface ChatConversation {
  /** Caminho da conversa, ex.: "/app/chat/vOCMsaAAAAE". */
  path: string;
  name: string;
  kind: 'dm' | 'space';
}

/** "dm/vOCMsaAAAAE" ou "space/AAQA7HmCROA" → "/app/chat/<id>" (como o Chat abre). */
export function pathFromGroupId(id: string): { path: string; kind: 'dm' | 'space' } | null {
  const m = /^(dm|space)\/([A-Za-z0-9_-]{4,80})$/.exec(id);
  return m ? { path: `/app/chat/${m[2]}`, kind: m[1] as 'dm' | 'space' } : null;
}

/** Valida a lista vinda da página (ids conhecidos, nomes limpos, sem repetidos). */
export function parseConversationList(input: unknown): ChatConversation[] {
  if (!Array.isArray(input)) return [];
  const out: ChatConversation[] = [];
  for (const raw of input.slice(0, 500)) {
    if (typeof raw !== 'object' || raw === null) continue;
    const r = raw as Record<string, unknown>;
    const where = typeof r['id'] === 'string' ? pathFromGroupId(r['id']) : null;
    const name = cleanText(r['name'], PIN_LIMITS.nameLength);
    if (!where || !name || out.some((c) => c.path === where.path)) continue;
    out.push({ path: where.path, name, kind: where.kind });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

/**
 * preload do Chat → main: a conversa aberta na área principal (tela cheia ou no
 * painel dividido ao lado do Início, que não muda o endereço nem o título).
 */
export const OPEN_CONVERSATION_CHANNEL = 'chat:open-conversation';

/** Valida o aviso do preload: id do Chat ("dm/…", "space/…") e nome, ou nada aberto. */
export function parseOpenConversation(
  input: unknown,
): { path: string; name: string | null } | null {
  if (typeof input !== 'object' || input === null) return null;
  const r = input as Record<string, unknown>;
  const where = typeof r['id'] === 'string' ? pathFromGroupId(r['id']) : null;
  if (!where) return null;
  return { path: where.path, name: cleanText(r['name'], PIN_LIMITS.nameLength) };
}
