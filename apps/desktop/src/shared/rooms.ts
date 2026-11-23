/**
 * Salas de chamada (estilo canais de voz do Discord): links permanentes do
 * Google Meet salvos com um nome. Cada sala pertence a uma conta (abre na sessão
 * dela, já logada).
 */
export interface Room {
  id: string;
  name: string;
  /** Código do Meet, ex.: "abc-defg-hij". */
  code: string;
  accountId: string;
}

export const ROOM_LIMITS = { max: 30, nameLength: 40 } as const;

/** Códigos de reunião do Meet: 3-4-3 letras minúsculas. */
const CODE = /^[a-z]{3}-[a-z]{4}-[a-z]{3}$/;
export const isMeetCode = (v: unknown): v is string => typeof v === 'string' && CODE.test(v);

const ROOM_ID = /^room-[a-z0-9]{6,16}$/;
export const isRoomId = (v: unknown): v is string => typeof v === 'string' && ROOM_ID.test(v);

export const meetUrl = (code: string): string => `https://meet.google.com/${code}`;

/** Extrai o código de uma URL do Meet (ou null se não for uma reunião). */
export function meetCodeFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:' || u.host !== 'meet.google.com') return null;
    const code = u.pathname.split('/')[1] ?? '';
    return isMeetCode(code) ? code : null;
  } catch {
    return null;
  }
}

export function cleanRoomName(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const name = [...v]
    .filter((c) => c.charCodeAt(0) > 0x1f && c.charCodeAt(0) !== 0x7f)
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, ROOM_LIMITS.nameLength);
  return name || null;
}

export function normalizeRooms(input: unknown, fallback: Room[]): Room[] {
  if (!Array.isArray(input)) return fallback;
  const out: Room[] = [];
  for (const item of input) {
    if (typeof item !== 'object' || item === null) continue;
    const r = item as Record<string, unknown>;
    const name = cleanRoomName(r['name']);
    if (!isRoomId(r['id']) || !name || !isMeetCode(r['code'])) continue;
    if (typeof r['accountId'] !== 'string' || !/^account-[a-z0-9]{1,12}$/.test(r['accountId']))
      continue;
    if (out.some((x) => x.id === r['id'])) continue;
    out.push({ id: r['id'], name, code: r['code'], accountId: r['accountId'] });
    if (out.length === ROOM_LIMITS.max) break;
  }
  return out;
}

/** Estado da chamada em andamento (mostrado no shell). */
export interface CallState {
  roomId: string;
  name: string;
  code: string;
  accountId: string;
  /** Epoch ms de quando entrou na sala (cronômetro). */
  startedAt: number;
  /** A chamada está na área principal (true) ou em segundo plano, com o Chat aberto. */
  visible: boolean;
}
