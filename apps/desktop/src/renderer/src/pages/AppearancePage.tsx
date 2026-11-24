import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Check, FlaskConical, Layers, Palette, RotateCcw, Square, Sparkles } from 'lucide-react';
import type { AppearanceSettings, ThemeChoice } from '../../../shared/settings';
import {
  DEFAULT_CUSTOM_THEME,
  THEME_PRESETS,
  buildPalette,
  swatchBackground,
  type CustomTheme,
  type ResolvedTheme,
  type WindowMaterial,
} from '../../../shared/theme';
import { Card } from '../components/Card';
import { SectionTitle, SettingRow, Toggle } from '../components/controls';
import { useSettings } from '../hooks/useSettings';
import { useShellState } from '../hooks/useShellState';
import { themeVars } from '../theme-vars';

const BASE_THEMES: { id: ThemeChoice; label: string; preview: [string, string, string] }[] = [
  { id: 'dark', label: 'Escuro', preview: ['#1e1f22', '#2b2d31', '#313338'] },
  { id: 'light', label: 'Claro', preview: ['#e3e5e8', '#f2f3f5', '#ffffff'] },
  { id: 'system', label: 'Sincronizar com o Windows', preview: ['#1e1f22', '#f2f3f5', '#313338'] },
];

const MATERIALS: { id: WindowMaterial; label: string; description: string; icon: ReactNode }[] = [
  {
    id: 'none',
    label: 'Sólido',
    description: 'Fundo opaco, o mais leve.',
    icon: <Square size={18} aria-hidden />,
  },
  {
    id: 'mica',
    label: 'Mica',
    description: 'Pega só a cor do papel de parede, bem sutil (como o Explorador de Arquivos).',
    icon: <Layers size={18} aria-hidden />,
  },
  {
    id: 'acrylic',
    label: 'Acrílico',
    description: 'Vidro fosco: o que está atrás da janela aparece desfocado.',
    icon: <Sparkles size={18} aria-hidden />,
  },
];

const ACCENTS = [
  '#5865f2',
  '#eb459e',
  '#ed4245',
  '#f47b67',
  '#fee75c',
  '#57f287',
  '#00a8fc',
  '#a970ff',
];

/** Atualiza em tempo real sem salvar a cada pixel arrastado no seletor de cor. */
function useDebounced<T>(commit: (value: T) => void, ms = 90): (value: T) => void {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(commit);
  useEffect(() => {
    latest.current = commit;
  });
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);
  return (value: T) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => latest.current(value), ms);
  };
}

export function AppearancePage() {
  const [settings, update] = useSettings();
  const state = useShellState();
  const commitOpacity = useDebounced((opacity: number) => update({ appearance: { opacity } }));
  if (!settings || !state) return null;
  const a = settings.appearance;
  const setAppearance = (patch: Partial<AppearanceSettings>) => update({ appearance: patch });

  return (
    <div>
      <ThemePreview look={state.look} />

      <SectionTitle>Tema</SectionTitle>
      <div role="radiogroup" aria-label="Tema" className="flex flex-wrap gap-4">
        {BASE_THEMES.map((t) => {
          const selected = a.colorTheme === 'padrao' && a.theme === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setAppearance({ theme: t.id, colorTheme: 'padrao' })}
              className="group/theme flex w-40 flex-col items-center gap-2"
            >
              <span
                className={`flex h-20 w-full overflow-hidden rounded-lg ring-2 transition-all ${
                  selected ? 'ring-accent' : 'ring-line group-hover/theme:ring-switch-off'
                }`}
              >
                <span className="w-4" style={{ background: t.preview[0] }} />
                <span className="w-10" style={{ background: t.preview[1] }} />
                <span className="flex-1 p-2" style={{ background: t.preview[2] }}>
                  <span className="block h-2 w-3/4 rounded-full bg-[#5865f2] opacity-80" />
                  <span className="mt-1.5 block h-2 w-1/2 rounded-full bg-[#80848e] opacity-60" />
                </span>
              </span>
              <span
                className={`text-sm ${selected ? 'text-header font-semibold' : 'text-interactive'}`}
              >
                {t.label}
              </span>
            </button>
          );
        })}
      </div>

      <SectionTitle>Temas coloridos</SectionTitle>
      <div
        role="radiogroup"
        aria-label="Temas coloridos"
        className="flex flex-wrap gap-x-3 gap-y-4"
      >
        {THEME_PRESETS.map((p) => (
          <Swatch
            key={p.id}
            label={p.name}
            theme={p}
            {...(p.swatch ? { swatch: p.swatch } : {})}
            {...(p.mark ? { mark: p.mark } : {})}
            selected={a.colorTheme === p.id}
            onSelect={() => setAppearance({ colorTheme: p.id })}
          />
        ))}
        <Swatch
          label="Personalizado"
          theme={a.custom}
          selected={a.colorTheme === 'custom'}
          onSelect={() => setAppearance({ colorTheme: 'custom' })}
          icon={<Palette size={20} aria-hidden />}
        />
      </div>

      {a.colorTheme === 'custom' && (
        <CustomEditor custom={a.custom} onChange={(custom) => update({ appearance: { custom } })} />
      )}

      <SectionTitle>Janela</SectionTitle>
      <div role="radiogroup" aria-label="Material da janela" className="grid grid-cols-3 gap-3">
        {MATERIALS.map((m) => {
          const selected = a.material === m.id;
          return (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() =>
                setAppearance(
                  // Sem transparência o material não aparece: ao ligar, começa visível.
                  m.id !== 'none' && a.opacity > 75
                    ? { material: m.id, opacity: 60 }
                    : { material: m.id },
                )
              }
              className={`bg-card flex flex-col items-start gap-1.5 rounded-lg p-3 text-left ring-2 transition-all ${
                selected ? 'ring-accent' : 'hover:ring-switch-off ring-transparent'
              }`}
            >
              <span className={selected ? 'text-accent' : 'text-interactive'}>{m.icon}</span>
              <span className="text-header text-sm font-semibold">{m.label}</span>
              <span className="text-muted text-xs leading-snug">{m.description}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-3">
        <Card>
          <RangeRow
            label="Transparência"
            description={
              a.material === 'none'
                ? 'Escolha Mica ou Acrílico para deixar a janela translúcida.'
                : 'Em 0% a janela fica sólida; quanto maior, mais o material do Windows aparece.'
            }
            min={0}
            max={80}
            value={100 - a.opacity}
            disabled={a.material === 'none'}
            format={(v) => `${v}%`}
            onChange={(v) => commitOpacity(100 - v)}
          />
        </Card>
        <p className="text-muted mt-2 text-xs">
          Mica e Acrílico são efeitos do Windows 11. No Windows 10 a janela continua sólida.
        </p>
      </div>

      <SectionTitle>Google Chat</SectionTitle>
      <Card>
        <Toggle
          label="Aplicar as cores do tema dentro do Google Chat"
          description="Recolore o Chat com a paleta escolhida acima. Só muda cores: nada é escondido ou alterado nas mensagens."
          checked={a.chatTheme}
          onChange={(chatTheme) => setAppearance({ chatTheme })}
        />
        <div className="text-muted flex gap-2 py-3 text-sm">
          <FlaskConical size={16} className="mt-0.5 shrink-0" aria-hidden />
          <p>
            <strong className="text-interactive">Experimental.</strong> Depende de detalhes internos
            do Google Chat. Se o Google mudar a página, o Chat apenas volta ao visual original. Para
            o melhor resultado, use no Chat o tema <em>Padrão do sistema</em> (Configurações do Chat
            → Tema): ele acompanha o escuro/claro do tema do app.
          </p>
        </div>
      </Card>
    </div>
  );
}

// ───────────────────────────── prévia ─────────────────────────────

/** Miniatura do app com o tema atual: trilho, painel, conversa e destaque. */
function ThemePreview({ look }: { look: ResolvedTheme }) {
  const vars = themeVars(look);
  const p = look.palette;
  const bubble = (w: string, accent = false) => (
    <span
      className="block h-2.5 rounded-full"
      style={{ width: w, background: accent ? p.accent : p.selected }}
    />
  );
  return (
    <div
      aria-label="Prévia do tema"
      role="img"
      className="relative h-44 overflow-hidden rounded-xl shadow-lg ring-1 ring-black/20"
      style={{
        // Com material, simula o que está atrás da janela (o papel de parede).
        background:
          look.material === 'none'
            ? p.rail
            : 'linear-gradient(120deg, #6b7a8f 0%, #3b4a5e 40%, #a7896b 100%)',
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: look.background,
          opacity: look.opacity,
          backdropFilter: look.material === 'acrylic' ? 'blur(8px)' : undefined,
        }}
      />
      <div className="relative flex h-full flex-col">
        <div className="flex h-6 items-center gap-1.5 px-3">
          <span className="h-2 w-2 rounded-full" style={{ background: p.accent }} />
          <span className="h-1.5 w-16 rounded-full" style={{ background: p.muted, opacity: 0.6 }} />
        </div>
        <div className="flex min-h-0 flex-1">
          <div className="flex w-14 flex-col items-center gap-2 pt-1">
            <span className="h-8 w-8 rounded-xl" style={{ background: p.accent }} />
            <span
              className="h-8 w-8 rounded-full"
              style={{ background: vars['--color-content'] }}
            />
            <span
              className="h-8 w-8 rounded-full"
              style={{ background: vars['--color-content'] }}
            />
          </div>
          <div
            className="flex w-40 flex-col gap-2 rounded-tl-lg p-3"
            style={{ background: vars['--color-pane'] }}
          >
            <span
              className="h-2 w-20 rounded-full"
              style={{ background: p.header, opacity: 0.8 }}
            />
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className="flex h-6 items-center gap-2 rounded px-1.5"
                style={{ background: i === 1 ? p.selected : 'transparent' }}
              >
                <span className="h-3.5 w-3.5 rounded-full" style={{ background: p.muted }} />
                <span
                  className="h-1.5 flex-1 rounded-full"
                  style={{ background: i === 1 ? p.header : p.interactive, opacity: 0.7 }}
                />
              </span>
            ))}
          </div>
          <div
            className="flex flex-1 flex-col justify-end gap-2 p-4"
            style={{ background: vars['--color-content'] }}
          >
            <div className="flex gap-2">
              <span className="h-7 w-7 shrink-0 rounded-full" style={{ background: p.muted }} />
              <div className="flex flex-1 flex-col gap-1.5 pt-1">
                {bubble('30%')}
                {bubble('70%')}
              </div>
            </div>
            <div className="flex gap-2">
              <span className="h-7 w-7 shrink-0 rounded-full" style={{ background: p.accent }} />
              <div className="flex flex-1 flex-col gap-1.5 pt-1">
                {bubble('25%')}
                {bubble('55%', true)}
              </div>
            </div>
            <span className="mt-1 block h-7 rounded-lg" style={{ background: p.field }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────── temas ─────────────────────────────

function Swatch({
  label,
  theme,
  selected,
  onSelect,
  icon,
  swatch,
  mark,
}: {
  label: string;
  theme: CustomTheme;
  selected: boolean;
  onSelect: () => void;
  icon?: ReactNode;
  swatch?: string;
  mark?: string;
}) {
  const pal = buildPalette(theme);
  const background = swatch ?? swatchBackground(theme);
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={label}
      title={label}
      onClick={onSelect}
      className="group/sw flex w-[68px] flex-col items-center gap-1.5"
    >
      <span
        className={`relative flex h-14 w-14 items-center justify-center rounded-full ring-2 ring-offset-2 ring-offset-[var(--color-content)] transition-all ${
          selected ? 'ring-accent' : 'group-hover/sw:ring-switch-off ring-transparent'
        }`}
        style={{ background }}
      >
        {!mark && (
          <span
            className="absolute right-0.5 bottom-0.5 h-4 w-4 rounded-full ring-2"
            style={{ background: pal.accent, ['--tw-ring-color' as string]: pal.rail }}
          />
        )}
        {icon && <span style={{ color: pal.header }}>{icon}</span>}
        {mark && (
          // Símbolo da marca, branco com contorno interno como no logo.
          <span className="flex h-11 w-11 items-center justify-center rounded-full text-2xl leading-none font-black text-white ring-2 ring-white/90">
            {mark}
          </span>
        )}
        {selected && !icon && !mark && (
          <span className="rounded-full bg-black/35 p-1 text-white">
            <Check size={14} aria-hidden />
          </span>
        )}
      </span>
      <span
        className={`truncate text-xs ${selected ? 'text-header font-semibold' : 'text-interactive'}`}
      >
        {label}
      </span>
    </button>
  );
}

function CustomEditor({
  custom,
  onChange,
}: {
  custom: CustomTheme;
  onChange: (patch: Partial<CustomTheme>) => void;
}) {
  const commit = useDebounced(onChange);
  return (
    <div className="mt-4">
      <Card>
        <SettingRow label="Base" description="Camadas escuras ou claras por baixo das cores.">
          <div role="radiogroup" aria-label="Base" className="bg-field flex rounded-md p-0.5">
            {(['dark', 'light'] as const).map((b) => (
              <button
                key={b}
                type="button"
                role="radio"
                aria-checked={custom.base === b}
                onClick={() => onChange({ base: b })}
                className={`rounded px-3 py-1 text-sm transition-colors ${
                  custom.base === b ? 'bg-selected text-header font-medium' : 'text-interactive'
                }`}
              >
                {b === 'dark' ? 'Escuro' : 'Claro'}
              </button>
            ))}
          </div>
        </SettingRow>

        <SettingRow label="Cor de destaque" description="Botões, seleção e links.">
          <div className="flex items-center gap-1.5">
            {ACCENTS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Destaque ${c}`}
                onClick={() => onChange({ accent: c })}
                className={`h-6 w-6 rounded-full ring-2 ring-offset-2 ring-offset-[var(--color-card)] transition-all ${
                  custom.accent === c ? 'ring-header' : 'ring-transparent hover:scale-110'
                }`}
                style={{ background: c }}
              />
            ))}
            <ColorInput
              label="Outra cor de destaque"
              value={custom.accent}
              onChange={(accent) => commit({ accent })}
            />
          </div>
        </SettingRow>

        <SettingRow label="Cor do fundo" description="Tinge o trilho, os painéis e as superfícies.">
          <ColorInput
            label="Cor do fundo"
            value={custom.tint}
            onChange={(tint) => commit({ tint })}
          />
        </SettingRow>

        <RangeRow
          label="Intensidade"
          description="Quanto a cor do fundo aparece."
          min={0}
          max={100}
          value={custom.strength}
          format={(v) => `${v}%`}
          onChange={(strength) => commit({ strength })}
        />

        <SettingRow label="Degradê" description="Fundo em degradê diagonal até uma segunda cor.">
          <div className="flex items-center gap-3">
            {custom.gradientTo && (
              <ColorInput
                label="Segunda cor do degradê"
                value={custom.gradientTo}
                onChange={(gradientTo) => commit({ gradientTo })}
              />
            )}
            <button
              type="button"
              role="switch"
              aria-checked={custom.gradientTo !== null}
              aria-label="Degradê"
              onClick={() =>
                onChange({ gradientTo: custom.gradientTo ? null : DEFAULT_CUSTOM_THEME.gradientTo })
              }
              className={`ease-snappy relative h-6 w-10 rounded-full transition-colors duration-200 ${
                custom.gradientTo ? 'bg-success' : 'bg-switch-off'
              }`}
            >
              <span
                className={`ease-snappy absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white transition-all duration-200 ${
                  custom.gradientTo ? 'left-[19px]' : 'left-[3px]'
                }`}
              />
            </button>
          </div>
        </SettingRow>

        <div className="py-3">
          <button
            type="button"
            onClick={() => onChange(DEFAULT_CUSTOM_THEME)}
            className="text-interactive hover:text-header inline-flex items-center gap-1.5 text-sm"
          >
            <RotateCcw size={14} aria-hidden /> Restaurar cores sugeridas
          </button>
        </div>
      </Card>
    </div>
  );
}

/** Seletor de cor redondo (abre o seletor do sistema), com o hex ao lado. */
function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [local, setLocal] = useState(value);
  const [prev, setPrev] = useState(value);
  if (value !== prev) {
    setPrev(value);
    setLocal(value);
  }
  return (
    <label className="flex cursor-pointer items-center gap-2" title={label}>
      <span
        className="ring-line relative h-7 w-7 overflow-hidden rounded-full ring-2"
        style={{ background: local }}
      >
        <input
          type="color"
          aria-label={label}
          value={local}
          onChange={(e) => {
            setLocal(e.target.value);
            onChange(e.target.value);
          }}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </span>
      <span className="text-interactive w-[4.5rem] font-mono text-xs uppercase">{local}</span>
    </label>
  );
}

function RangeRow({
  label,
  description,
  min,
  max,
  value,
  disabled = false,
  format,
  onChange,
}: {
  label: string;
  description: string;
  min: number;
  max: number;
  value: number;
  disabled?: boolean;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const [local, setLocal] = useState(value);
  const [prev, setPrev] = useState(value);
  if (value !== prev) {
    setPrev(value);
    setLocal(value);
  }
  return (
    <SettingRow label={label} description={description}>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={local}
          disabled={disabled}
          aria-label={label}
          onChange={(e) => {
            setLocal(Number(e.target.value));
            onChange(Number(e.target.value));
          }}
          className="accent-accent w-40 disabled:opacity-40"
        />
        <span className="text-interactive w-10 text-right text-sm tabular-nums">
          {format(local)}
        </span>
      </div>
    </SettingRow>
  );
}
