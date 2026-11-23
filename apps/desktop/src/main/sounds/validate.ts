import { SOUND_LIMITS, type SoundExtension } from '../../shared/sounds';

/**
 * Identifica o formato pelo conteúdo (magic bytes), não pela extensão.
 * - WAV: "RIFF" .... "WAVE"
 * - OGG: "OggS"
 * - MP3: tag "ID3" ou sincronismo de quadro MPEG (11 bits em 1, layer III)
 */
export function detectAudioFormat(bytes: Uint8Array): SoundExtension | null {
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.subarray(start, end));
  if (bytes.length >= 12 && ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WAVE') return 'wav';
  if (bytes.length >= 4 && ascii(0, 4) === 'OggS') return 'ogg';
  if (bytes.length >= 3 && ascii(0, 3) === 'ID3') return 'mp3';
  if (bytes.length >= 2 && bytes[0] === 0xff && ((bytes[1] ?? 0) & 0xe6) === 0xe2) return 'mp3';
  return null;
}

export type ValidationResult = { ok: true; ext: SoundExtension } | { ok: false; error: string };

/** Validação estrutural antes de copiar o arquivo. A decodificação real vem depois. */
export function validateAudioFile(fileName: string, bytes: Uint8Array): ValidationResult {
  const declared = fileName.toLowerCase().split('.').pop();
  if (declared !== 'mp3' && declared !== 'wav' && declared !== 'ogg') {
    return { ok: false, error: 'Formato não suportado. Use MP3, WAV ou OGG.' };
  }
  if (bytes.length === 0) return { ok: false, error: 'O arquivo está vazio.' };
  if (bytes.length > SOUND_LIMITS.maxBytes) {
    return { ok: false, error: 'O arquivo é maior que 5 MB.' };
  }
  const detected = detectAudioFormat(bytes);
  if (!detected) return { ok: false, error: 'O conteúdo não é um áudio MP3, WAV ou OGG válido.' };
  if (detected !== declared) {
    return {
      ok: false,
      error: `A extensão diz ${declared.toUpperCase()}, mas o conteúdo é ${detected.toUpperCase()}.`,
    };
  }
  return { ok: true, ext: detected };
}

/** Nome exibido a partir do nome do arquivo: sem extensão, sem caracteres de controle. */
export function displayName(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, '');
  const clean = [...base]
    .filter((c) => c.charCodeAt(0) > 0x1f && c.charCodeAt(0) !== 0x7f) // sem caracteres de controle
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
  return (clean || 'Som importado').slice(0, SOUND_LIMITS.nameLength);
}
