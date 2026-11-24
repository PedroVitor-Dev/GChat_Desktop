import type { ReactNode } from 'react';
import {
  BellOff,
  Expand,
  Inbox,
  Maximize2,
  Minimize2,
  PanelLeftClose,
  PanelLeftOpen,
  Radio,
  Rocket,
  Shrink,
  Signal,
} from 'lucide-react';
import { describeDnd, type DndStatus } from '../../../shared/dnd';
import { useUpdateStatus } from '../hooks/useUpdateStatus';
import type { CallState } from '../../../shared/rooms';
import { useElapsed } from '../hooks/useElapsed';
import logo from '../../../../resources/icon.png';
import { SHELL_LAYOUT, type CallLayout } from '../../../shared/shell';
import type { StreamerStatus } from '../../../shared/streamer';

/**
 * Barra de título própria. Os botões minimizar/maximizar/fechar são os nativos do
 * Windows (titleBarOverlay), desenhados à direita sobre esta faixa.
 * Com o modo streamer ativo, mostra um selo (clique desliga, como no Discord).
 */
export function TitleBar({
  title,
  streamer,
  dnd,
  pins,
  call,
  onShowCall,
  inbox,
  callLayout,
}: {
  title: string;
  streamer: StreamerStatus;
  dnd: DndStatus;
  /** Botão do painel de fixados (null = fora do Chat). */
  pins: { open: boolean; unread: number } | null;
  call: CallState | null;
  onShowCall: () => void;
  /** Notificações perdidas: contador e abrir/fechar a lista. */
  inbox: { unseen: number; open: boolean; onToggle: () => void };
  /** Na tela da chamada: lista de salas, modo foco e tela cheia (null = fora dela). */
  callLayout: CallLayout | null;
}) {
  const elapsed = useElapsed(call?.startedAt);
  const update = useUpdateStatus();
  const why =
    streamer.reason === 'auto'
      ? `Ativado automaticamente: ${streamer.apps.join(', ')} aberto. Clique para desligar.`
      : 'Ativado manualmente. Clique para desligar.';
  return (
    <header
      className="drag bg-shell text-muted relative flex shrink-0 items-center px-3 text-xs font-semibold"
      style={{ height: SHELL_LAYOUT.titleBarHeight }}
    >
      <div className="flex items-center gap-2">
        <img src={logo} alt="" className="h-4 w-4" draggable={false} />
        <span className="text-interactive">GChat Desktop+</span>
        {pins && (
          <button
            type="button"
            title={pins.open ? 'Esconder conversas fixadas' : 'Mostrar conversas fixadas'}
            aria-label={pins.open ? 'Esconder conversas fixadas' : 'Mostrar conversas fixadas'}
            aria-pressed={pins.open}
            onClick={() => void window.gchat.pins.setPanel(!pins.open)}
            className="no-drag text-interactive hover:text-header hover:bg-hover relative ml-2 rounded p-1 transition-colors"
          >
            {pins.open ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}
            {!pins.open && pins.unread > 0 && (
              <span className="bg-danger absolute -top-0.5 -right-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-0.5 text-[9px] leading-none font-bold text-white">
                {pins.unread > 9 ? '9+' : pins.unread}
              </span>
            )}
          </button>
        )}
      </div>
      <span className="absolute left-1/2 max-w-[40%] -translate-x-1/2 truncate">{title}</span>
      {call && (
        <button
          type="button"
          title={`Ir para a chamada: ${call.name}`}
          onClick={onShowCall}
          className="no-drag bg-success/15 text-success hover:bg-success/25 ml-4 flex animate-[fade-in_200ms_ease] items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold"
        >
          <Signal size={12} aria-hidden />
          <span className="max-w-40 truncate">{call.name}</span>
          <span className="tabular-nums">{elapsed}</span>
        </button>
      )}
      {callLayout && (
        <div className="no-drag ml-2 flex items-center gap-0.5">
          <BarButton
            label={callLayout.panel ? 'Esconder a lista de salas' : 'Mostrar a lista de salas'}
            pressed={callLayout.panel && !callLayout.focus}
            disabled={callLayout.focus}
            onClick={() => void window.gchat.call.setLayout({ panel: !callLayout.panel })}
          >
            {callLayout.panel ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}
          </BarButton>
          <BarButton
            label={callLayout.focus ? 'Sair do modo foco (Esc)' : 'Modo foco: só o vídeo'}
            pressed={callLayout.focus}
            onClick={() => void window.gchat.call.setLayout({ focus: !callLayout.focus })}
          >
            {callLayout.focus ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </BarButton>
          <BarButton
            label={callLayout.fullscreen ? 'Sair da tela cheia (Esc)' : 'Tela cheia'}
            pressed={callLayout.fullscreen}
            onClick={() => void window.gchat.call.setLayout({ fullscreen: !callLayout.fullscreen })}
          >
            {callLayout.fullscreen ? <Shrink size={15} /> : <Expand size={15} />}
          </BarButton>
        </div>
      )}
      {update?.state === 'downloaded' && (
        <button
          type="button"
          title={`Versão ${update.version} pronta. Clique para reiniciar e atualizar.`}
          onClick={() => void window.gchat.updates.install()}
          className="no-drag bg-success hover:bg-success/85 ml-4 flex animate-[fade-in_200ms_ease] items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white"
        >
          <Rocket size={12} aria-hidden />
          Reiniciar para atualizar
        </button>
      )}
      {dnd.active && (
        <button
          type="button"
          title="Notificações pausadas. Clique para reativar ou mudar o tempo."
          onClick={() => void window.gchat.dnd.showMenu()}
          className="no-drag bg-danger/15 text-danger hover:bg-danger/25 ml-4 flex animate-[fade-in_200ms_ease] items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold"
        >
          <BellOff size={12} aria-hidden />
          Não perturbe {describeDnd(dnd, new Date())}
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
      {/* À esquerda dos botões nativos do Windows (minimizar/maximizar/fechar). */}
      <button
        type="button"
        title={
          inbox.unseen > 0
            ? `${inbox.unseen} ${inbox.unseen === 1 ? 'notificação perdida' : 'notificações perdidas'}`
            : 'Notificações perdidas'
        }
        aria-label="Notificações perdidas"
        aria-pressed={inbox.open}
        onClick={inbox.onToggle}
        className={`no-drag hover:text-header hover:bg-hover absolute top-1/2 right-[150px] -translate-y-1/2 rounded p-1 transition-colors ${
          inbox.open ? 'text-header bg-hover' : 'text-interactive'
        }`}
      >
        <Inbox size={16} />
        {inbox.unseen > 0 && (
          <span className="bg-danger border-rail absolute -top-1 -right-1.5 flex h-4 min-w-4 animate-[fade-in_200ms_ease] items-center justify-center rounded-full px-1 text-[10px] leading-none font-bold text-white">
            {inbox.unseen > 99 ? '99+' : inbox.unseen}
          </span>
        )}
      </button>
    </header>
  );
}

function BarButton({
  label,
  pressed,
  disabled = false,
  onClick,
  children,
}: {
  label: string;
  pressed: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className={`rounded p-1 transition-colors disabled:opacity-30 ${
        pressed ? 'text-header bg-hover' : 'text-interactive hover:text-header hover:bg-hover'
      }`}
    >
      {children}
    </button>
  );
}
