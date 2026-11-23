/**
 * Perfil da conta. Hoje: nome e foto que o próprio Google Chat mostra (lidos da
 * página, sem e-mail), guardados só neste computador.
 *
 * Preparado para o perfil personalizável estilo Discord (banner com imagem/GIF,
 * bio, status) — ver `ProfileCustomization`. Quando houver servidor, o mesmo
 * modelo é sincronizado.
 */

/** Campos futuros do perfil personalizável (ainda não usados). */
export interface ProfileCustomization {
  /** Banner: imagem ou GIF (data URL ou URL do servidor). */
  banner?: string;
  /** Cor de destaque do cartão. */
  accentColor?: string;
  bio?: string;
  /** Status curto com emoji (ex.: "☀️ Praise the Sun!"). */
  status?: string;
}

export interface AccountProfile {
  accountId: string;
  /** Nome exibido pelo Google (nunca o e-mail). */
  displayName?: string;
  /** Foto como data URL (baixada do Google e guardada localmente). */
  photo?: string;
  /** URL de origem da foto (só para saber se mudou). */
  photoSource?: string;
  updatedAt: number;
  custom?: ProfileCustomization;
}

/** preload do Chat → main: o que a página mostra no botão da conta. */
export const PROFILE_CHANNEL = 'chat:profile';

export interface ProfileReport {
  photoUrl: string;
  displayName: string;
}

const NAME_MAX = 80;

/** Valida o que veio da página: foto só do googleusercontent e nome limpo. */
export function parseProfileReport(input: unknown): ProfileReport | null {
  if (typeof input !== 'object' || input === null) return null;
  const r = input as Record<string, unknown>;
  if (typeof r['photoUrl'] !== 'string' || typeof r['displayName'] !== 'string') return null;
  let url: URL;
  try {
    url = new URL(r['photoUrl']);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || !url.host.endsWith('.googleusercontent.com')) return null;
  const name = [...r['displayName']]
    .filter((c) => c.charCodeAt(0) > 0x1f && c.charCodeAt(0) !== 0x7f)
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
  if (!name || name.length > NAME_MAX || name.includes('@')) return null;
  return { photoUrl: url.toString(), displayName: name };
}

/**
 * Pede a foto em tamanho maior: as URLs do Google terminam com "=s32-c" etc.
 * (ex.: …/a/ABC=s32-c-mo → …/a/ABC=s128-c).
 */
export function photoUrlAtSize(url: string, size = 128): string {
  return /=[\w-]+$/.test(url) ? url.replace(/=[\w-]+$/, `=s${size}-c`) : `${url}=s${size}-c`;
}

// ───────────────────────────── status do Google Chat ─────────────────────────────
//
// O status é o do próprio Chat (botão "Ativo ▾": Automático, Não perturbe,
// Ausente e "Adicionar um status"), que todos os contatos veem. O app só lê o
// que o botão mostra, para exibir na foto do trilho, e abre esse menu do Chat.
// Fica só em memória.

export type ChatPresence = 'active' | 'away' | 'dnd' | 'offline';

export interface ChatStatus {
  presence: ChatPresence;
  /** Status personalizado (ex.: "🧪 Testando o app"), se houver. */
  text?: string;
}

/** preload do Chat → main: o que o botão de status mostra. */
export const STATUS_CHANNEL = 'chat:status';
/** main → preload do Chat: abrir o menu de status do Chat. */
export const OPEN_STATUS_CHANNEL = 'chat:open-status';

export interface StatusReport {
  /** aria-label do botão (ex.: "Status: Ativo"). */
  label: string;
  /** Texto visível no botão. */
  text: string;
}

const STATUS_TEXT_MAX = 140;
const PRESENCE_WORDS: [RegExp, ChatPresence][] = [
  [/^(não perturbe|nao perturbe|do not disturb)/i, 'dnd'],
  [/^(ausente|away|inativo|idle)/i, 'away'],
  [/^(offline|desconectado)/i, 'offline'],
  [/^(ativo|active|online|disponível)/i, 'active'],
];

function clean(value: string): string {
  return [...value]
    .filter((c) => c.charCodeAt(0) > 0x1f && c.charCodeAt(0) !== 0x7f)
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

function presenceOf(value: string): { presence: ChatPresence; rest: string } | null {
  for (const [re, presence] of PRESENCE_WORDS) {
    const m = re.exec(value);
    if (m) return { presence, rest: value.slice(m[0].length).replace(/^[\s,:;·•–—-]+/, '') };
  }
  return null;
}

/** Interpreta o botão de status do Chat; null se não for reconhecível. */
export function parseStatusReport(input: unknown): ChatStatus | null {
  if (typeof input !== 'object' || input === null) return null;
  const r = input as Record<string, unknown>;
  if (typeof r['label'] !== 'string' || typeof r['text'] !== 'string') return null;
  if (r['label'].length > 500 || r['text'].length > 500) return null;
  const label = clean(r['label']).replace(/^status\s*:\s*/i, '');
  const text = clean(r['text']);

  const fromLabel = presenceOf(label);
  const fromText = presenceOf(text);
  const presence = fromLabel?.presence ?? fromText?.presence;
  if (!presence) return null;

  // Status personalizado: o que sobra depois da palavra da presença (no rótulo),
  // ou o texto visível quando ele não é a própria presença.
  const custom = fromLabel?.rest || (fromText ? fromText.rest : text);
  const status: ChatStatus = { presence };
  if (custom && !presenceOf(custom)) status.text = [...custom].slice(0, STATUS_TEXT_MAX).join('');
  return status;
}

/** Emoji no início do status (ex.: "☀️ Praise the Sun!" → "☀️"). */
export function leadingEmoji(text: string | undefined): string | null {
  if (!text) return null;
  const m =
    /^(?:\p{Extended_Pictographic}|\p{Regional_Indicator}{2})(?:️|\p{Emoji_Modifier}|‍\p{Extended_Pictographic}️?)*/u.exec(
      text,
    );
  return m ? m[0] : null;
}

export const PRESENCE_LABEL: Record<ChatPresence, string> = {
  active: 'Ativo',
  away: 'Ausente',
  dnd: 'Não perturbe',
  offline: 'Offline',
};
