import { useEffect, type ReactNode } from 'react';
import { Maximize2, PhoneOff, Signal, X } from 'lucide-react';
import { MINIPLAYER } from '../../../shared/shell';
import { useElapsed } from '../hooks/useElapsed';
import { useShellState } from '../hooks/useShellState';
import { applyThemeVars } from '../theme-vars';

/**
 * Faixa de cima do miniplayer (janelinha flutuante da chamada). O vídeo do Meet
 * fica logo abaixo, posicionado pelo main. A faixa arrasta a janela.
 */
export function MiniPlayerBar() {
  const state = useShellState();
  const elapsed = useElapsed(state?.call?.startedAt);

  useEffect(() => {
    if (state) applyThemeVars(state.look);
  }, [state]);

  const call = state?.call;
  return (
    <div className="bg-rail flex h-full flex-col">
      <header
        className="drag flex shrink-0 items-center gap-2 pr-1 pl-3 text-xs"
        style={{ height: MINIPLAYER.headerHeight }}
      >
        <Signal size={13} className="text-success shrink-0 animate-pulse" aria-hidden />
        <span className="text-header min-w-0 flex-1 truncate font-semibold">
          {call?.name ?? 'Chamada'}
        </span>
        <span className="text-interactive shrink-0 tabular-nums">{elapsed}</span>
        <div className="no-drag flex shrink-0 items-center">
          <MiniButton
            label="Voltar para a chamada"
            onClick={() => void window.gchat.call.backFromMini()}
          >
            <Maximize2 size={14} />
          </MiniButton>
          <MiniButton label="Sair da chamada" danger onClick={() => void window.gchat.call.leave()}>
            <PhoneOff size={14} />
          </MiniButton>
          <MiniButton
            label="Fechar o miniplayer (a chamada continua)"
            onClick={() => void window.gchat.call.hideMini()}
          >
            <X size={14} />
          </MiniButton>
        </div>
      </header>
      {/* Área do vídeo: o main coloca a página do Meet aqui. */}
      <div className="flex-1 bg-[#202124]" />
    </div>
  );
}

function MiniButton({
  label,
  danger = false,
  onClick,
  children,
}: {
  label: string;
  danger?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`rounded p-1.5 transition-colors ${
        danger
          ? 'text-danger hover:bg-danger hover:text-white'
          : 'text-interactive hover:text-header hover:bg-hover'
      }`}
    >
      {children}
    </button>
  );
}
