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
