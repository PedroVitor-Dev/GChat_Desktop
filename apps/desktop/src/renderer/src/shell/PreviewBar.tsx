import { ArrowLeftRight, Eye, Undo2, X } from 'lucide-react';
import { SHELL_LAYOUT, type ShellState } from '../../../shared/shell';

/**
 * Faixa acima da sala espiada: dá para ver quem está nela (tela de espera do
 * Meet) sem sair da chamada atual, e decidir se troca, como no Discord.
 */
export function PreviewBar({ state }: { state: ShellState }) {
  const { preview, call } = state;
  if (!preview) return null;
  return (
    <div
      className="bg-content border-rail flex shrink-0 animate-[fade-in_150ms_ease] items-center gap-3 rounded-tl-lg border-b px-4"
      style={{ height: SHELL_LAYOUT.previewBarHeight }}
    >
      <span className="bg-accent/15 text-accent flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
        <Eye size={16} aria-hidden />
      </span>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="text-header truncate font-semibold">Espiando {preview.name}</p>
        <p className="text-muted truncate text-xs">
          {call ? (
            <>
              Veja quem está na sala. Você continua em <strong>{call.name}</strong> até trocar.
            </>
          ) : (
            'Veja quem está na sala antes de entrar.'
          )}
        </p>
      </div>
      <button
        type="button"
        onClick={() => void window.gchat.call.switchToPreview()}
        className="bg-accent hover:bg-accent-hover flex h-8 shrink-0 items-center gap-1.5 rounded-[3px] px-3 text-sm font-medium text-white"
        title={
          call ? `Sair de ${call.name} e ir para ${preview.name}` : `Entrar em ${preview.name}`
        }
      >
        <ArrowLeftRight size={15} aria-hidden />
        {call ? 'Trocar para esta sala' : 'Entrar nesta sala'}
      </button>
      <button
        type="button"
        onClick={() => void window.gchat.call.closePreview()}
        className="text-interactive hover:text-header hover:bg-hover flex h-8 shrink-0 items-center gap-1.5 rounded-[3px] px-3 text-sm"
      >
        {call ? (
          <>
            <Undo2 size={15} aria-hidden /> Voltar para {call.name}
          </>
        ) : (
          <>
            <X size={15} aria-hidden /> Fechar
          </>
        )}
      </button>
    </div>
  );
}
