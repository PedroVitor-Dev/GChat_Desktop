import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, applyPatch, normalizeSettings } from './settings';

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
});
