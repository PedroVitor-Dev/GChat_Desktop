import { describe, expect, it } from 'vitest';
import { detectStreamingApps, parseTasklistCsv } from './streaming-detector';

describe('parseTasklistCsv', () => {
  it('extrai o nome da imagem de cada linha', () => {
    const out = [
      '"System Idle Process","0","Services","0","8 K"',
      '"obs64.exe","1234","Console","1","250.000 K"',
      '"Streamlabs Desktop.exe","99","Console","1","10 K"',
      '',
    ].join('\r\n');
    expect(parseTasklistCsv(out)).toEqual([
      'System Idle Process',
      'obs64.exe',
      'Streamlabs Desktop.exe',
    ]);
  });
});

describe('detectStreamingApps', () => {
  it('reconhece programas de transmissão sem repetir', () => {
    expect(
      detectStreamingApps(['explorer.exe', 'OBS64.EXE', 'obs64.exe', 'XSplit.Core.exe']),
    ).toEqual(['OBS Studio', 'XSplit']);
  });

  it('ignora gravadores que ficam sempre abertos', () => {
    expect(
      detectStreamingApps(['nvcontainer.exe', 'GameBar.exe', 'medal.exe', 'Discord.exe']),
    ).toEqual([]);
  });
});

describe('resolveStreamer', () => {
  const base = {
    enabled: false,
    auto: true,
    pauseNotifications: true,
    hideContent: true,
    muteSounds: true,
  };

  it('manual vence; automático depende de programa aberto', async () => {
    const { resolveStreamer } = await import('./streamer-mode');
    expect(resolveStreamer({ ...base, enabled: true }, [])).toMatchObject({
      active: true,
      reason: 'manual',
    });
    expect(resolveStreamer(base, ['OBS Studio'])).toMatchObject({ active: true, reason: 'auto' });
    expect(resolveStreamer(base, [])).toMatchObject({ active: false, reason: null });
    expect(resolveStreamer({ ...base, auto: false }, ['OBS Studio']).active).toBe(false);
    // Desligado pelo usuário durante a transmissão
    expect(resolveStreamer(base, ['OBS Studio'], true).active).toBe(false);
  });
});
