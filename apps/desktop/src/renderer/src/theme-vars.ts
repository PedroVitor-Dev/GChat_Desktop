import { withAlpha, type Palette, type ResolvedTheme } from '../../shared/theme';

/** Variáveis CSS (--color-*) de um tema resolvido. */
export function themeVars(look: ResolvedTheme): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [key, value] of Object.entries(look.palette) as [keyof Palette, string][]) {
    vars[`--color-${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`] = value;
  }
  // Fundo liso e sem material: camadas sólidas (visual original). Com degradê ou
  // Mica/Acrílico, o trilho e a barra de título mostram o fundo, e os painéis
  // ficam translúcidos por cima dele.
  const layered = look.gradient !== null || look.material !== 'none';
  const a = look.opacity;
  vars['--color-shell'] = layered ? 'transparent' : look.palette.rail;
  vars['--color-pane'] = layered
    ? withAlpha(look.palette.sidebar, 0.45 + 0.4 * a)
    : look.palette.sidebar;
  vars['--color-content'] = layered
    ? withAlpha(look.palette.surface, 0.6 + 0.3 * a)
    : look.palette.surface;
  vars['--app-bg'] = look.background;
  vars['--app-opacity'] = String(a);
  return vars;
}

export function applyThemeVars(look: ResolvedTheme): void {
  const root = document.documentElement;
  for (const [name, value] of Object.entries(themeVars(look))) root.style.setProperty(name, value);
}
