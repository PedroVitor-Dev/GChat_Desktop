/**
 * Temas do app: paleta (camadas de cinza estilo Discord, tingidas por uma cor),
 * cor de destaque, degradê de fundo e material da janela (Mica/Acrílico do
 * Windows 11). Funções puras: o main usa para a janela e o Chat, o renderer
 * recebe o resultado pronto (`ResolvedTheme`) no estado do shell.
 */

export type ThemeBase = 'dark' | 'light';
export type WindowMaterial = 'none' | 'mica' | 'acrylic';

export interface CustomTheme {
  base: ThemeBase;
  /** Cor de destaque (botões, seleção, links). */
  accent: string;
  /** Cor que tinge o fundo e as superfícies. */
  tint: string;
  /** Quanto o fundo é tingido (0–100). */
  strength: number;
  /** Segunda cor do degradê do fundo; null = fundo liso. */
  gradientTo: string | null;
}

export interface ThemePreset extends CustomTheme {
  id: string;
  name: string;
  /** Miniatura própria (ex.: a cor da marca), em vez da gerada pelas cores. */
  swatch?: string;
  /** Símbolo branco no centro da miniatura (ex.: "$"). */
  mark?: string;
  /** Cor de "ligado" (interruptores, botões de adicionar); padrão: verde. */
  success?: string;
}

/** Paleta aplicada às variáveis --color-* da interface. */
export interface Palette {
  rail: string;
  sidebar: string;
  surface: string;
  card: string;
  field: string;
  hover: string;
  selected: string;
  line: string;
  header: string;
  ink: string;
  interactive: string;
  muted: string;
  accent: string;
  accentHover: string;
  onAccent: string;
  /** Interruptores ligados e botões de adicionar. */
  success: string;
  switchOff: string;
}

export interface ResolvedTheme {
  base: ThemeBase;
  palette: Palette;
  /** Fundo da janela (trilho, barra de título, configurações): cor ou degradê CSS. */
  background: string;
  /** Degradê nos dois extremos (para a barra de título e a prévia); null = liso. */
  gradient: [string, string] | null;
  material: WindowMaterial;
  /** Opacidade do fundo sobre o material (0.2–1). 1 = sólido. */
  opacity: number;
}

// ───────────────────────────── paletas base ─────────────────────────────

const BASE: Record<ThemeBase, Omit<Palette, 'accent' | 'accentHover' | 'onAccent' | 'success'>> = {
  dark: {
    rail: '#1e1f22',
    sidebar: '#2b2d31',
    surface: '#313338',
    card: '#2b2d31',
    field: '#1e1f22',
    hover: '#35373c',
    selected: '#404249',
    line: '#3f4147',
    header: '#f2f3f5',
    ink: '#dbdee1',
    interactive: '#b5bac1',
    muted: '#949ba4',
    switchOff: '#80848e',
  },
  light: {
    rail: '#e3e5e8',
    sidebar: '#f2f3f5',
    surface: '#ffffff',
    card: '#ebedef',
    field: '#dfe1e5',
    hover: '#e8e9eb',
    selected: '#d1d4d9',
    line: '#d4d7dc',
    header: '#060607',
    ink: '#313338',
    interactive: '#4e5058',
    muted: '#5c5e66',
    switchOff: '#80848e',
  },
};

export const DEFAULT_ACCENT = '#5865f2';

/** Temas prontos. "padrao" segue a escolha Escuro/Claro/Sistema. */
export const THEME_PRESETS: readonly ThemePreset[] = [
  {
    // Identidade da marca Cibus: laranja vivo com branco (o "$" do logo) sobre
    // um fundo escuro quente, em degradê para o laranja queimado.
    id: 'cibus',
    name: 'Cibus',
    base: 'dark',
    accent: '#f26522',
    tint: '#3d1606',
    strength: 60,
    gradientTo: '#7a2a08',
    swatch: '#f26522',
    mark: '$',
    // Tudo no laranja da marca, inclusive os interruptores.
    success: '#f26522',
  },
  {
    id: 'meia-noite',
    name: 'Meia-noite',
    base: 'dark',
    accent: '#5865f2',
    tint: '#000000',
    strength: 70,
    gradientTo: null,
  },
  {
    id: 'aurora',
    name: 'Aurora',
    base: 'dark',
    accent: '#3ba55d',
    tint: '#0b3d3a',
    strength: 55,
    gradientTo: '#2a1653',
  },
  {
    id: 'oceano',
    name: 'Oceano',
    base: 'dark',
    accent: '#00a8fc',
    tint: '#0b2a4a',
    strength: 60,
    gradientTo: '#06324a',
  },
  {
    id: 'crepusculo',
    name: 'Crepúsculo',
    base: 'dark',
    accent: '#f47b67',
    tint: '#3a1838',
    strength: 55,
    gradientTo: '#4a2412',
  },
  {
    id: 'ametista',
    name: 'Ametista',
    base: 'dark',
    accent: '#a970ff',
    tint: '#2b1650',
    strength: 55,
    gradientTo: '#16163d',
  },
  {
    id: 'floresta',
    name: 'Floresta',
    base: 'dark',
    accent: '#57b86e',
    tint: '#14301c',
    strength: 55,
    gradientTo: '#28331a',
  },
  {
    id: 'brasa',
    name: 'Brasa',
    base: 'dark',
    accent: '#ff6b3d',
    tint: '#3d1410',
    strength: 50,
    gradientTo: '#2a0d1c',
  },
  {
    id: 'grafite',
    name: 'Grafite',
    base: 'dark',
    accent: '#c9cdd4',
    tint: '#25282e',
    strength: 40,
    gradientTo: null,
  },
  {
    id: 'algodao-doce',
    name: 'Algodão-doce',
    base: 'light',
    accent: '#d6409f',
    tint: '#f7c6e3',
    strength: 45,
    gradientTo: '#c7d8ff',
  },
  {
    id: 'menta',
    name: 'Menta',
    base: 'light',
    accent: '#1f9d6b',
    tint: '#bdeedb',
    strength: 45,
    gradientTo: '#d6f0ff',
  },
  {
    id: 'areia',
    name: 'Areia',
    base: 'light',
    accent: '#c07a2c',
    tint: '#f2dfc0',
    strength: 50,
    gradientTo: null,
  },
];

export const DEFAULT_CUSTOM_THEME: CustomTheme = {
  base: 'dark',
  accent: '#eb459e',
  tint: '#2a1a4a',
  strength: 55,
  gradientTo: '#0f2f4a',
};

// ───────────────────────────── cores ─────────────────────────────

const HEX = /^#[0-9a-f]{6}$/i;

export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && HEX.test(value);
}

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function hex([r, g, b]: [number, number, number]): string {
  const c = (v: number) =>
    Math.round(Math.min(255, Math.max(0, v)))
      .toString(16)
      .padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Mistura `b` em `a` na proporção t (0 = a, 1 = b). */
export function mix(a: string, b: string, t: number): string {
  const x = rgb(a);
  const y = rgb(b);
  return hex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]);
}

/** Luminância relativa (WCAG). */
export function luminance(color: string): number {
  const [r, g, b] = rgb(color).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (l1 + 0.05) / (l2 + 0.05);
}

/** rgba() a partir de hex, para as camadas sobre o fundo/material. */
export function withAlpha(color: string, alpha: number): string {
  const [r, g, b] = rgb(color);
  return `rgba(${r}, ${g}, ${b}, ${Math.round(alpha * 1000) / 1000})`;
}

// ───────────────────────────── montagem ─────────────────────────────

/**
 * Paleta a partir de base + tinta + destaque. As camadas do fundo (trilho,
 * barra lateral) recebem mais tinta que o conteúdo, para manter a leitura; os
 * textos não são tingidos.
 */
export function buildPalette(theme: CustomTheme & { success?: string }): Palette {
  const b = BASE[theme.base];
  const s = Math.min(100, Math.max(0, theme.strength)) / 100;
  const t = (color: string, weight: number) => mix(color, theme.tint, s * weight);
  const accent = theme.accent;
  const onAccent = contrast(accent, '#ffffff') >= 3 ? '#ffffff' : '#060607';
  return {
    rail: t(b.rail, 0.75),
    sidebar: t(b.sidebar, 0.6),
    surface: t(b.surface, 0.45),
    card: t(b.card, 0.55),
    field: t(b.field, 0.65),
    hover: t(b.hover, 0.5),
    selected: t(b.selected, 0.5),
    line: t(b.line, 0.5),
    header: b.header,
    ink: b.ink,
    interactive: b.interactive,
    muted: b.muted,
    switchOff: b.switchOff,
    accent,
    accentHover: mix(accent, '#000000', 0.15),
    onAccent,
    success: theme.success ?? '#23a55a',
  };
}

export interface ThemeSelection {
  /** Escuro/Claro/Sistema (vale para "padrao"). */
  theme: 'dark' | 'light' | 'system';
  /** "padrao", id de um tema pronto ou "custom". */
  colorTheme: string;
  custom: CustomTheme;
  material: WindowMaterial;
  /** Opacidade do fundo com Mica/Acrílico (20–100). */
  opacity: number;
}

export function findPreset(id: string): ThemePreset | undefined {
  return THEME_PRESETS.find((p) => p.id === id);
}

/** Resolve a escolha do usuário num tema pronto para aplicar. */
export function resolveTheme(sel: ThemeSelection, systemDark: boolean): ResolvedTheme {
  let def: CustomTheme & { success?: string };
  if (sel.colorTheme === 'custom') def = sel.custom;
  else {
    const preset = findPreset(sel.colorTheme);
    if (preset) def = preset;
    else {
      const base = sel.theme === 'system' ? (systemDark ? 'dark' : 'light') : sel.theme;
      def = { base, accent: DEFAULT_ACCENT, tint: '#000000', strength: 0, gradientTo: null };
    }
  }
  const palette = buildPalette(def);
  // Degradê um pouco mais forte que a tinta das camadas, para se notar no trilho
  // e na barra de título sem atrapalhar a leitura.
  const g = Math.min(1, (def.strength / 100) * 1.3);
  const gradient: [string, string] | null = def.gradientTo
    ? [mix(BASE[def.base].rail, def.tint, g), mix(BASE[def.base].rail, def.gradientTo, g)]
    : null;
  const opacity =
    sel.material === 'none' ? 1 : Math.min(100, Math.max(20, Math.round(sel.opacity))) / 100;
  return {
    base: def.base,
    palette,
    background: gradient
      ? `linear-gradient(135deg, ${gradient[0]} 0%, ${gradient[1]} 100%)`
      : palette.rail,
    gradient,
    material: sel.material,
    opacity,
  };
}

/**
 * Fundo da miniatura de um tema (círculos de escolha): as cores dele com um
 * toque do destaque, para os temas escuros não parecerem todos pretos.
 */
export function swatchBackground(theme: CustomTheme): string {
  const k = theme.base === 'dark' ? 0.3 : 0.15;
  const from = mix(theme.tint, theme.accent, k);
  const to = mix(theme.gradientTo ?? theme.tint, theme.accent, k / 2);
  return `linear-gradient(135deg, ${from} 0%, ${to} 100%)`;
}

/** Cores da barra de título nativa (botões minimizar/maximizar/fechar). */
export function titleBarColors(t: ResolvedTheme): { color: string; symbolColor: string } {
  return {
    color: t.material === 'none' ? (t.gradient?.[0] ?? t.palette.rail) : '#00000000',
    symbolColor: t.palette.interactive,
  };
}

/** Normaliza o tema personalizado vindo do disco/IPC. */
export function normalizeCustomTheme(input: unknown, fallback: CustomTheme): CustomTheme {
  if (typeof input !== 'object' || input === null) return fallback;
  const r = input as Record<string, unknown>;
  const strength =
    typeof r['strength'] === 'number' && Number.isFinite(r['strength'])
      ? Math.round(Math.min(100, Math.max(0, r['strength'])))
      : fallback.strength;
  return {
    base: r['base'] === 'light' || r['base'] === 'dark' ? r['base'] : fallback.base,
    accent: isHexColor(r['accent']) ? r['accent'].toLowerCase() : fallback.accent,
    tint: isHexColor(r['tint']) ? r['tint'].toLowerCase() : fallback.tint,
    strength,
    gradientTo:
      r['gradientTo'] === null
        ? null
        : isHexColor(r['gradientTo'])
          ? r['gradientTo'].toLowerCase()
          : fallback.gradientTo,
  };
}

/**
 * CSS do tema experimental dentro do Google Chat, com as cores do tema atual.
 * Só troca tokens de cor do Material 3 (--gm3-sys-color-*): se o Google renomear
 * os tokens, o Chat apenas volta ao visual original.
 */
export function chatThemeCss(t: ResolvedTheme): string {
  const p = t.palette;
  const dark = t.base === 'dark';
  const primary = dark ? mix(p.accent, '#ffffff', 0.3) : p.accent;
  const v = (name: string, value: string) => `  --gm3-sys-color-${name}: ${value} !important;`;
  return [
    ':root, html, body {',
    v('background', p.surface),
    v('on-background', p.ink),
    v('surface', p.surface),
    v('surface-dim', p.sidebar),
    v('surface-bright', mix(p.surface, dark ? '#ffffff' : '#000000', 0.05)),
    v('surface-container-lowest', p.rail),
    v('surface-container-low', p.sidebar),
    v('surface-container', p.sidebar),
    v('surface-container-high', p.hover),
    v('surface-container-highest', p.selected),
    v('surface-variant', p.hover),
    v('on-surface', p.ink),
    v('on-surface-variant', p.interactive),
    v('outline', p.switchOff),
    v('outline-variant', p.line),
    v('primary', primary),
    v('on-primary', p.onAccent),
    v('primary-container', p.accent),
    v('on-primary-container', p.onAccent),
    v('secondary-container', p.selected),
    v('on-secondary-container', p.header),
    v('inverse-surface', p.header),
    v('inverse-on-surface', p.surface),
    '}',
    '::-webkit-scrollbar { width: 8px !important; height: 8px !important; }',
    `::-webkit-scrollbar-thumb { background: ${p.rail} !important; border-radius: 4px !important; }`,
    '::-webkit-scrollbar-track { background: transparent !important; }',
    `::selection { background: ${withAlpha(p.accent, 0.45)}; }`,
  ].join('\n');
}
