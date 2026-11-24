import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, normalizeSettings } from './settings';
import { preserveUnknown, restoreMissing, writerOf, WRITER_KEY } from './settings-compat';

describe('preserveUnknown (downgrade: esta versão abre um arquivo de uma mais nova)', () => {
  it('mantém campos desconhecidos em qualquer nível', () => {
    const raw = {
      general: { launchAtLogin: true, futuro: 'x' },
      novidade: { a: 1 },
      [WRITER_KEY]: { app: 'gchat-desktop-plus', version: '9.9.9', savedAt: 1 },
    };
    const known = { general: { launchAtLogin: false } };
    expect(preserveUnknown(raw, known)).toEqual({
      general: { launchAtLogin: false, futuro: 'x' },
      novidade: { a: 1 },
    });
  });

  it('casa itens de lista pelo id e respeita remoções', () => {
    const raw = {
      rooms: [
        { id: 'room-aaaaaa', name: 'A', campoNovo: 1 },
        { id: 'room-bbbbbb', name: 'B', campoNovo: 2 },
      ],
    };
    const known = { rooms: [{ id: 'room-aaaaaa', name: 'A renomeada' }] };
    expect(preserveUnknown(raw, known)).toEqual({
      rooms: [{ id: 'room-aaaaaa', name: 'A renomeada', campoNovo: 1 }],
    });
  });
});

describe('restoreMissing (uma versão antiga regravou o arquivo)', () => {
  it('devolve o que sumiu e mantém o que a versão antiga mudou', () => {
    const backup = {
      general: { launchAtLogin: false, closeToTray: true },
      rooms: [{ id: 'room-aaaaaa', name: 'Bate-papo' }],
      streamer: { enabled: false, auto: true },
      notifications: { enabled: true, vipConversations: ['Maria'] },
    };
    // A 0.0.1 não conhecia salas, modo streamer nem prioritárias; o usuário ligou o autostart nela.
    const old = {
      general: { launchAtLogin: true, closeToTray: true },
      notifications: { enabled: false },
    };
    expect(restoreMissing(old, backup)).toEqual({
      general: { launchAtLogin: true, closeToTray: true },
      notifications: { enabled: false, vipConversations: ['Maria'] },
      rooms: [{ id: 'room-aaaaaa', name: 'Bate-papo' }],
      streamer: { enabled: false, auto: true },
    });
  });

  it('não ressuscita itens removidos de uma lista que a versão antiga conhecia', () => {
    const backup = {
      list: [
        { id: 'a', x: 1, novo: 1 },
        { id: 'b', x: 2, novo: 2 },
      ],
    };
    const old = { list: [{ id: 'a', x: 9 }] };
    expect(restoreMissing(old, backup)).toEqual({ list: [{ id: 'a', x: 9, novo: 1 }] });
  });
});

describe('writerOf', () => {
  it('reconhece a marca desta família de versões', () => {
    expect(
      writerOf({ [WRITER_KEY]: { app: 'gchat-desktop-plus', version: '0.0.6', savedAt: 5 } }),
    ).toEqual({
      app: 'gchat-desktop-plus',
      version: '0.0.6',
      savedAt: 5,
    });
    expect(writerOf({})).toBeNull();
    expect(writerOf({ [WRITER_KEY]: { app: 'outro', version: '1' } })).toBeNull();
  });
});

describe('regra do projeto', () => {
  it('nenhum campo das configurações fica ausente ou undefined (vazio é null/[]/{})', () => {
    const walk = (v: unknown, path: string): void => {
      expect(v, path).not.toBeUndefined();
      if (v && typeof v === 'object') {
        for (const [k, child] of Object.entries(v)) walk(child, `${path}.${k}`);
      }
    };
    walk(normalizeSettings({}), 'settings');
    walk(DEFAULT_SETTINGS, 'defaults');
  });
});
