import { useState } from 'react';
import logo from '../../../resources/icon.png';
import { sections, type SectionId } from './sections';

export function App() {
  const [active, setActive] = useState<SectionId>('geral');
  const current = sections.find((s) => s.id === active) ?? sections[0]!;
  const Page = current.page;

  return (
    <div className="flex h-full">
      <nav className="w-60 shrink-0 p-3" aria-label="Configurações">
        <div className="flex items-center gap-2.5 px-3 pt-2 pb-5">
          <img src={logo} alt="" className="h-8 w-8" draggable={false} />
          <div>
            <p className="text-base leading-tight font-semibold">GChat Desktop+</p>
            <p className="text-muted text-xs">Configurações</p>
          </div>
        </div>
        <ul className="space-y-0.5">
          {sections.map(({ id, label, icon: Icon }) => {
            const selected = id === active;
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => setActive(id)}
                  aria-current={selected ? 'page' : undefined}
                  className={`relative flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors duration-150 ${
                    selected ? 'bg-card shadow-sm' : 'hover:bg-card/60'
                  }`}
                >
                  {selected && (
                    <span className="bg-accent absolute top-2.5 bottom-2.5 left-0 w-[3px] rounded-full" />
                  )}
                  <Icon size={16} aria-hidden />
                  {label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <main className="flex-1 overflow-y-auto px-8 py-6">
        <h1 className="mb-5 text-2xl font-semibold">{current.label}</h1>
        <Page />
      </main>
    </div>
  );
}
