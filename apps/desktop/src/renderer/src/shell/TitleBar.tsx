import { Radio, Signal } from 'lucide-react';
import type { CallState } from '../../../shared/rooms';
import { useElapsed } from '../hooks/useElapsed';
import logo from '../../../../resources/icon.png';
import { SHELL_LAYOUT } from '../../../shared/shell';
import type { StreamerStatus } from '../../../shared/streamer';

/**
 * Barra de título própria. Os botões minimizar/maximizar/fechar são os nativos do
 * Windows (titleBarOverlay), desenhados à direita sobre esta faixa.
 * Com o modo streamer ativo, mostra um selo (clique desliga, como no Discord).
 */
export function TitleBar({
  title,
  streamer,
  call,
  onShowCall,
}: {
  title: string;
  streamer: StreamerStatus;
  call: CallState | null;
  onShowCall: () => void;
}) {
  const elapsed = useElapsed(call?.startedAt);
  const why =
    streamer.reason === 'auto'
      ? `Ativado automaticamente: ${streamer.apps.join(', ')} aberto. Clique para desligar.`
      : 'Ativado manualmente. Clique para desligar.';
  return (
    <header
      className="drag bg-rail text-muted relative flex shrink-0 items-center px-3 text-xs font-semibold"
      style={{ height: SHELL_LAYOUT.titleBarHeight }}
    >
      <div className="flex items-center gap-2">
        <img src={logo} alt="" className="h-4 w-4" draggable={false} />
        <span className="text-interactive">GChat Desktop+</span>
      </div>
      <span className="absolute left-1/2 max-w-[40%] -translate-x-1/2 truncate">{title}</span>
      {call && (
        <button
          type="button"
          title={call.visible ? call.name : 'Voltar para a chamada'}
          onClick={onShowCall}
          className="no-drag bg-success/15 text-success hover:bg-success/25 ml-4 flex animate-[fade-in_200ms_ease] items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold"
        >
          <Signal size={12} aria-hidden />
          <span className="max-w-40 truncate">{call.name}</span>
          <span className="tabular-nums">{elapsed}</span>
        </button>
      )}
      {streamer.active && (
        <button
          type="button"
          title={why}
          onClick={() => void window.gchat.toggleStreamer()}
          className="no-drag ml-4 flex animate-[fade-in_200ms_ease] items-center gap-1.5 rounded-full bg-[#593695] px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-white uppercase hover:bg-[#6e45b3]"
        >
          <Radio size={12} aria-hidden />
          Modo streamer
        </button>
      )}
    </header>
  );
}
