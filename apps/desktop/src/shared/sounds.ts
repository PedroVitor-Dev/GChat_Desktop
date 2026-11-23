/**
 * Identificação de sons:
 * - `system`         → som padrão do Windows (o toast toca)
 * - `none`           → sem som
 * - `builtin:<nome>` → sons que acompanham o app (resources/sounds)
 * - `custom:<uuid>`  → sons importados pelo usuário (userData/sounds)
 */
export type SoundId = 'system' | 'none' | `builtin:${string}` | `custom:${string}`;

export interface BuiltinSound {
  id: `builtin:${string}`;
  label: string;
  file: string;
}

export const BUILTIN_SOUNDS: readonly BuiltinSound[] = [
  { id: 'builtin:gota', label: 'Gota', file: 'gota.wav' },
  { id: 'builtin:sino', label: 'Sino', file: 'sino.wav' },
  { id: 'builtin:pop', label: 'Pop', file: 'pop.wav' },
  { id: 'builtin:dois-toques', label: 'Dois toques', file: 'dois-toques.wav' },
  { id: 'builtin:suave', label: 'Suave', file: 'suave.wav' },
];

export const SOUND_EXTENSIONS = ['mp3', 'wav', 'ogg'] as const;
export type SoundExtension = (typeof SOUND_EXTENSIONS)[number];

/** Som importado (metadados guardados nas configurações; o arquivo fica em userData). */
export interface CustomSound {
  id: `custom:${string}`;
  name: string;
  ext: SoundExtension;
}

export const SOUND_LIMITS = {
  /** Tamanho máximo do arquivo importado. */
  maxBytes: 5 * 1024 * 1024,
  /** Duração máxima aceita na importação (segundos). */
  maxSeconds: 15,
  nameLength: 60,
  library: 50,
} as const;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function isSoundId(v: unknown): v is SoundId {
  if (v === 'system' || v === 'none') return true;
  if (typeof v !== 'string') return false;
  if (v.startsWith('builtin:')) return BUILTIN_SOUNDS.some((s) => s.id === v);
  return v.startsWith('custom:') && UUID.test(v.slice('custom:'.length));
}

export const isCustomSoundId = (v: unknown): v is `custom:${string}` =>
  isSoundId(v) && v.startsWith('custom:');

/** Opção de som para listas da interface. */
export interface SoundOption {
  id: SoundId;
  label: string;
  kind: 'special' | 'builtin' | 'custom';
}
