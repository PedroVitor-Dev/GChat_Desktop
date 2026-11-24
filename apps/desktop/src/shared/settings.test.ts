import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, applyPatch, normalizeSettings } from './settings';

const UUID = '0b9f3c1e-2a4d-4e5f-9a8b-7c6d5e4f3a2b';

describe('normalizeSettings', () => {
  it('lixo vira padrão', () => {
    expect(normalizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings('x')).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings({ notifications: { enabled: 'sim' } })).toEqual(DEFAULT_SETTINGS);
  });

  it('rejeita horários inválidos', () => {
    const s = normalizeSettings({ notifications: { quietHours: { start: '25:00', end: '7:00' } } });
    expect(s.notifications.quietHours).toEqual(DEFAULT_SETTINGS.notifications.quietHours);
  });

  it('limpa a lista de conversas silenciadas', () => {
    const s = normalizeSettings({
      notifications: { mutedConversations: [' Maria ', 'Maria', '', 42, 'x'.repeat(201), 'Time'] },
    });
    expect(s.notifications.mutedConversations).toEqual(['Maria', 'Time']);
  });

  it('limita volume e valida ids de som', () => {
    const s = normalizeSettings({
      sounds: {
        volume: 140,
        defaultSound: 'builtin:inexistente',
        mentionSound: 'builtin:sino',
        conversationSounds: { Maria: 'builtin:pop', Time: 'custom:../../etc', ' ': 'none' },
      },
    });
    expect(s.sounds.volume).toBe(100);
    expect(s.sounds.defaultSound).toBe('builtin:gota');
    expect(s.sounds.mentionSound).toBe('builtin:sino');
    expect(s.sounds.conversationSounds).toEqual({ Maria: 'builtin:pop' });
  });

  it('valida a biblioteca de sons importados', () => {
    const s = normalizeSettings({
      sounds: {
        library: [
          { id: `custom:${UUID}`, name: 'Meu som', ext: 'mp3' },
          { id: `custom:${UUID}`, name: 'Duplicado', ext: 'mp3' },
          { id: 'custom:nao-uuid', name: 'X', ext: 'mp3' },
          { id: `custom:${UUID.replace('0', '1')}`, name: 'Exe', ext: 'exe' },
        ],
      },
    });
    expect(s.sounds.library).toEqual([{ id: `custom:${UUID}`, name: 'Meu som', ext: 'mp3' }]);
  });
});

describe('aparência', () => {
  it('valida o tema e mantém o padrão escuro', () => {
    expect(normalizeSettings({}).appearance).toEqual(DEFAULT_SETTINGS.appearance);
    const bad = normalizeSettings({
      appearance: { theme: 'neon', chatTheme: 1, colorTheme: 'x', material: 'vidro', opacity: 5 },
    }).appearance;
    expect(bad).toMatchObject({
      theme: 'dark',
      chatTheme: false,
      colorTheme: 'padrao',
      material: 'none',
      opacity: 35,
    });
    expect(
      normalizeSettings({ appearance: { theme: 'light', chatTheme: true } }).appearance,
    ).toMatchObject({ theme: 'light', chatTheme: true });
  });

  it('aceita temas prontos, personalizado e material da janela', () => {
    const a = applyPatch(DEFAULT_SETTINGS, {
      appearance: {
        colorTheme: 'aurora',
        material: 'acrylic',
        opacity: 70,
        custom: { accent: '#FF0000', gradientTo: null },
      },
    }).appearance;
    expect(a.colorTheme).toBe('aurora');
    expect(a.material).toBe('acrylic');
    expect(a.opacity).toBe(70);
    expect(a.custom.accent).toBe('#ff0000');
    expect(a.custom.gradientTo).toBeNull();
    expect(a.custom.tint).toBe(DEFAULT_SETTINGS.appearance.custom.tint);
    const bad = applyPatch(DEFAULT_SETTINGS, {
      appearance: { custom: { accent: 'red', strength: 400 } },
    }).appearance.custom;
    expect(bad.accent).toBe(DEFAULT_SETTINGS.appearance.custom.accent);
    expect(bad.strength).toBe(100);
  });
});

describe('atualizações', () => {
  it('automático por padrão e aceita desligar', () => {
    expect(normalizeSettings({}).updates).toEqual({ auto: true });
    expect(applyPatch(DEFAULT_SETTINGS, { updates: { auto: false } }).updates.auto).toBe(false);
    expect(applyPatch(DEFAULT_SETTINGS, { updates: { auto: 'x' } }).updates.auto).toBe(true);
  });
});

describe('modo streamer', () => {
  it('padrão: automático, protegendo tudo', () => {
    expect(normalizeSettings({}).streamer).toEqual({
      enabled: false,
      auto: true,
      pauseNotifications: true,
      hideContent: true,
      muteSounds: true,
    });
  });

  it('patch parcial mantém o resto', () => {
    const s = applyPatch(DEFAULT_SETTINGS, { streamer: { pauseNotifications: false, auto: 'x' } });
    expect(s.streamer.pauseNotifications).toBe(false);
    expect(s.streamer.auto).toBe(true);
  });
});

describe('migração v1 → v2', () => {
  it('preserva a escolha de som do Windows', () => {
    const v1 = (systemSound: boolean) => ({
      version: 1,
      notifications: { enabled: true, systemSound, mutedConversations: ['Maria'] },
    });
    expect(normalizeSettings(v1(true)).sounds.defaultSound).toBe('system');
    expect(normalizeSettings(v1(false)).sounds.defaultSound).toBe('none');
    expect(normalizeSettings(v1(true)).notifications.mutedConversations).toEqual(['Maria']);
  });
});

describe('applyPatch', () => {
  it('altera só o que veio no patch', () => {
    const s = applyPatch(DEFAULT_SETTINGS, {
      notifications: { showPreview: false, quietHours: { enabled: true } },
    });
    expect(s.notifications.showPreview).toBe(false);
    expect(s.notifications.quietHours).toEqual({ enabled: true, start: '22:00', end: '07:00' });
    expect(s.notifications.enabled).toBe(true);
  });

  it('renderer não consegue alterar a biblioteca de sons', () => {
    const s = applyPatch(DEFAULT_SETTINGS, {
      sounds: { library: [{ id: `custom:${UUID}`, name: 'Injetado', ext: 'mp3' }] },
    });
    expect(s.sounds.library).toEqual([]);
  });

  it('renderer não altera campos internos do geral', () => {
    const s = applyPatch(DEFAULT_SETTINGS, {
      general: { trayHintShown: true, closeToTray: false },
    });
    expect(s.general.trayHintShown).toBe(false);
    expect(s.general.closeToTray).toBe(false);
  });

  it('mentionSound null volta para o padrão', () => {
    const withMention = applyPatch(DEFAULT_SETTINGS, { sounds: { mentionSound: 'builtin:sino' } });
    expect(applyPatch(withMention, { sounds: { mentionSound: null } }).sounds.mentionSound).toBe(
      null,
    );
  });
});
