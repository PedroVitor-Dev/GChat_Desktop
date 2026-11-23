import { describe, expect, it } from 'vitest';
import { detectAudioFormat, displayName, validateAudioFile } from './validate';

const bytes = (...parts: (string | number[])[]) =>
  Uint8Array.from(
    parts.flatMap((p) => (typeof p === 'string' ? [...p].map((c) => c.charCodeAt(0)) : p)),
  );

const WAV = bytes('RIFF', [0, 0, 0, 0], 'WAVE', 'fmt ');
const OGG = bytes('OggS', [0, 2]);
const MP3_ID3 = bytes('ID3', [4, 0]);
const MP3_FRAME = bytes([0xff, 0xfb, 0x90, 0x00]);

describe('detectAudioFormat', () => {
  it('reconhece os formatos pelo conteúdo', () => {
    expect(detectAudioFormat(WAV)).toBe('wav');
    expect(detectAudioFormat(OGG)).toBe('ogg');
    expect(detectAudioFormat(MP3_ID3)).toBe('mp3');
    expect(detectAudioFormat(MP3_FRAME)).toBe('mp3');
  });

  it('rejeita outros conteúdos', () => {
    expect(detectAudioFormat(bytes('MZ', [0x90, 0]))).toBeNull(); // executável
    expect(detectAudioFormat(bytes('RIFF', [0, 0, 0, 0], 'AVI '))).toBeNull();
    expect(detectAudioFormat(new Uint8Array())).toBeNull();
  });
});

describe('validateAudioFile', () => {
  it('aceita arquivo coerente', () => {
    expect(validateAudioFile('alerta.WAV', WAV)).toEqual({ ok: true, ext: 'wav' });
  });

  it('rejeita extensão errada, disfarce e tamanho', () => {
    expect(validateAudioFile('som.flac', WAV).ok).toBe(false);
    expect(validateAudioFile('som.mp3', WAV)).toMatchObject({ ok: false });
    expect(validateAudioFile('som.mp3', bytes('MZ'))).toMatchObject({ ok: false });
    expect(validateAudioFile('som.wav', new Uint8Array(5 * 1024 * 1024 + 1)).ok).toBe(false);
  });
});

describe('displayName', () => {
  it('limpa o nome do arquivo', () => {
    expect(displayName('Meu   alerta.mp3')).toBe('Meu alerta');
    expect(displayName('\u0007.mp3')).toBe('Som importado');
    expect(displayName(`${'a'.repeat(80)}.ogg`)).toHaveLength(60);
  });
});
