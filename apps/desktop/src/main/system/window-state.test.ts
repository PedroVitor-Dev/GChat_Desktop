import { describe, expect, it } from 'vitest';
import { DEFAULT_SIZE, fitToDisplays, parseWindowState } from './window-state';

const primary = { x: 0, y: 0, width: 1920, height: 1040 };
const right = { x: 1920, y: 0, width: 2560, height: 1400 };

describe('parseWindowState', () => {
  it('aceita estado válido e impõe tamanho mínimo', () => {
    expect(parseWindowState({ x: 10, y: 20, width: 300, height: 200, maximized: true })).toEqual({
      x: 10,
      y: 20,
      width: 860,
      height: 540,
      maximized: true,
    });
  });

  it('rejeita lixo', () => {
    expect(parseWindowState(null)).toBeNull();
    expect(parseWindowState({ x: '1', y: 0, width: 900, height: 600 })).toBeNull();
    expect(parseWindowState({ x: Infinity, y: 0, width: 900, height: 600 })).toBeNull();
  });
});

describe('fitToDisplays', () => {
  it('sem estado salvo: centraliza na tela principal', () => {
    const s = fitToDisplays(null, [primary]);
    expect(s).toMatchObject({ ...DEFAULT_SIZE, maximized: false });
    expect(s.x).toBe(320);
  });

  it('mantém a janela no segundo monitor', () => {
    const saved = { x: 2200, y: 100, width: 1400, height: 900, maximized: false };
    expect(fitToDisplays(saved, [primary, right])).toEqual(saved);
  });

  it('monitor desconectado: volta para a principal, preservando maximizado', () => {
    const saved = { x: 2200, y: 100, width: 1400, height: 900, maximized: true };
    const s = fitToDisplays(saved, [primary]);
    expect(s.x).toBeGreaterThanOrEqual(0);
    expect(s.x + s.width).toBeLessThanOrEqual(1920);
    expect(s.maximized).toBe(true);
  });

  it('barra de título fora da tela não vale (ex.: y negativo)', () => {
    const saved = { x: 100, y: -500, width: 1200, height: 800, maximized: false };
    expect(fitToDisplays(saved, [primary]).y).toBeGreaterThanOrEqual(0);
  });

  it('reduz janela maior que o monitor', () => {
    const saved = { x: 0, y: 0, width: 3000, height: 2000, maximized: false };
    expect(fitToDisplays(saved, [primary])).toMatchObject({ width: 1920, height: 1040 });
  });
});
