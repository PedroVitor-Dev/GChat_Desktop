import { describe, expect, it } from 'vitest';
import {
  THEME_PRESETS,
  buildPalette,
  chatThemeCss,
  contrast,
  mix,
  resolveTheme,
  titleBarColors,
  type ThemeSelection,
} from './theme';
import { DEFAULT_SETTINGS } from './settings';

const sel = (over: Partial<ThemeSelection> = {}): ThemeSelection => ({
  theme: 'dark',
  colorTheme: 'padrao',
  custom: DEFAULT_SETTINGS.appearance.custom,
  material: 'none',
  opacity: 80,
  ...over,
});

describe('cores', () => {
  it('mistura cores', () => {
    expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(mix('#102030', '#102030', 0.7)).toBe('#102030');
  });
});

describe('resolveTheme', () => {
  it('padrão escuro é a paleta original do app', () => {
    const t = resolveTheme(sel(), false);
    expect(t.base).toBe('dark');
    expect(t.palette.rail).toBe('#1e1f22');
    expect(t.palette.surface).toBe('#313338');
    expect(t.palette.accent).toBe('#5865f2');
    expect(t.background).toBe('#1e1f22');
    expect(t.opacity).toBe(1);
  });

  it('"sistema" segue o Windows', () => {
    expect(resolveTheme(sel({ theme: 'system' }), false).base).toBe('light');
    expect(resolveTheme(sel({ theme: 'system' }), true).base).toBe('dark');
  });

  it('tema pronto com degradê', () => {
    const t = resolveTheme(sel({ colorTheme: 'aurora' }), false);
    expect(t.gradient).not.toBeNull();
    expect(t.background).toMatch(/^linear-gradient\(135deg/);
  });

  it('material deixa a barra de título transparente e limita a opacidade', () => {
    const t = resolveTheme(sel({ material: 'mica', opacity: 10 }), false);
    expect(t.opacity).toBe(0.2);
    expect(titleBarColors(t).color).toBe('#00000000');
    expect(titleBarColors(resolveTheme(sel(), false)).color).toBe('#1e1f22');
  });

  it('todos os temas prontos mantêm o texto legível', () => {
    for (const p of THEME_PRESETS) {
      const pal = buildPalette(p);
      expect(contrast(pal.ink, pal.surface), p.id).toBeGreaterThan(4.5);
      expect(contrast(pal.header, pal.sidebar), p.id).toBeGreaterThan(4.5);
      expect(contrast(pal.onAccent, pal.accent), p.id).toBeGreaterThan(2.5);
    }
  });
});

describe('chatThemeCss', () => {
  it('gera os tokens do Chat com as cores do tema', () => {
    const css = chatThemeCss(resolveTheme(sel({ colorTheme: 'oceano' }), false));
    expect(css).toContain('--gm3-sys-color-primary-container: #00a8fc !important;');
    expect(css).not.toContain('undefined');
  });
});
