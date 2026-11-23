import { FlaskConical } from 'lucide-react';
import type { ThemeChoice } from '../../../shared/settings';
import { Card } from '../components/Card';
import { SectionTitle, Toggle } from '../components/controls';
import { useSettings } from '../hooks/useSettings';

const THEMES: { id: ThemeChoice; label: string; preview: [string, string, string] }[] = [
  { id: 'dark', label: 'Escuro', preview: ['#1e1f22', '#2b2d31', '#313338'] },
  { id: 'light', label: 'Claro', preview: ['#e3e5e8', '#f2f3f5', '#ffffff'] },
  { id: 'system', label: 'Sincronizar com o Windows', preview: ['#1e1f22', '#f2f3f5', '#313338'] },
];

export function AppearancePage() {
  const [settings, update] = useSettings();
  if (!settings) return null;
  const a = settings.appearance;

  return (
    <div>
      <SectionTitle>Tema</SectionTitle>
      <div role="radiogroup" aria-label="Tema" className="flex flex-wrap gap-4">
        {THEMES.map((t) => {
          const selected = a.theme === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => update({ appearance: { theme: t.id } })}
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
                  <span className="bg-accent block h-2 w-3/4 rounded-full opacity-80" />
                  <span className="bg-switch-off mt-1.5 block h-2 w-1/2 rounded-full opacity-60" />
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

      <SectionTitle>Google Chat</SectionTitle>
      <Card>
        <Toggle
          label="Aplicar o visual do app dentro do Google Chat"
          description="Recolore o Chat com a mesma paleta escura do app. Só muda cores: nada é escondido ou alterado nas mensagens."
          checked={a.chatTheme}
          onChange={(chatTheme) => update({ appearance: { chatTheme } })}
        />
        <div className="text-muted flex gap-2 py-3 text-sm">
          <FlaskConical size={16} className="mt-0.5 shrink-0" aria-hidden />
          <p>
            <strong className="text-interactive">Experimental.</strong> Depende de detalhes internos
            do Google Chat. Se o Google mudar a página, o Chat apenas volta ao visual original. Para
            o melhor resultado, use no Chat o tema <em>Escuro</em> ou <em>Padrão do sistema</em>{' '}
            (Configurações do Chat → Tema).
          </p>
        </div>
      </Card>
    </div>
  );
}
