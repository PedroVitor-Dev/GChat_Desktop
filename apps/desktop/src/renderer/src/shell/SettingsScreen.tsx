import { useState } from 'react';
import { RotateCw, X } from 'lucide-react';
import { sections, type SectionId } from '../sections';

/**
 * Configurações em tela cheia, no estilo das configurações de usuário do Discord:
 * navegação à esquerda (alinhada à direita), conteúdo à direita, fechar com Esc.
 */
export function SettingsScreen({
  onClose,
  initialSection = 'notificacoes',
}: {
  onClose: () => void;
  initialSection?: SectionId;
}) {
  const [active, setActive] = useState<SectionId>(initialSection);
  const current = sections.find((s) => s.id === active) ?? sections[0]!;
  const Page = current.page;

  return (
    <div className="absolute inset-0 z-10 flex animate-[settings-in_180ms_cubic-bezier(0.2,0,0,1)]">
      <aside className="bg-pane flex flex-[1_0_218px] justify-end overflow-y-auto">
        <nav aria-label="Configurações" className="w-[218px] px-1.5 py-[60px] pr-1.5 pl-5">
          <p className="text-muted px-2.5 pb-1.5 text-xs font-bold tracking-wide uppercase">
            Configurações do app
          </p>
          <ul className="space-y-0.5">
            {sections.map(({ id, label, icon: Icon }) => {
              const selected = id === active;
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => setActive(id)}
                    aria-current={selected ? 'page' : undefined}
                    className={`flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left font-medium transition-colors duration-100 ${
                      selected
                        ? 'bg-selected text-header'
                        : 'text-interactive hover:bg-hover hover:text-ink'
                    }`}
                  >
                    <Icon size={16} aria-hidden className="shrink-0 opacity-80" />
                    {label}
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="bg-line mx-2.5 my-2 h-px" />
          <button
            type="button"
            onClick={() => void window.gchat.shell.reloadChat()}
            className="text-interactive hover:bg-hover hover:text-ink flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left font-medium"
          >
            <RotateCw size={16} aria-hidden className="opacity-80" />
            Recarregar Google Chat
          </button>
        </nav>
      </aside>

      <main className="bg-content flex flex-[1_1_800px] overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[740px] px-10 pt-[60px] pb-20">
            <h1 className="font-display text-header mb-5 text-xl font-semibold">{current.label}</h1>
            <Page />
          </div>
        </div>
        <div className="shrink-0 pt-[60px] pr-5">
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar configurações"
            className="group/close flex flex-col items-center gap-2"
          >
            <span className="border-interactive text-interactive group-hover/close:bg-selected flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors">
              <X size={18} />
            </span>
            <span className="text-interactive text-[13px] font-semibold">ESC</span>
          </button>
        </div>
      </main>
    </div>
  );
}
