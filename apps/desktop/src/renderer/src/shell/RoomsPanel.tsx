import { useState, type ReactNode } from 'react';
import {
  Check,
  Copy,
  Mic,
  MessageSquare,
  Pencil,
  PhoneOff,
  Plus,
  Signal,
  Trash2,
  Video,
  Volume2,
} from 'lucide-react';
import type { Room } from '../../../shared/rooms';
import { SHELL_LAYOUT, type ShellState } from '../../../shared/shell';
import { inputClass } from '../components/controls';
import { Tooltip } from '../components/Tooltip';
import { useElapsed } from '../hooks/useElapsed';

/**
 * Painel de salas (como os canais de voz do Discord): lista as salas do Meet,
 * cria novas e mostra o card "Em chamada" com cronômetro e controles.
 */
export function RoomsPanel({
  rooms,
  state,
  onCreate,
}: {
  rooms: Room[];
  state: ShellState;
  onCreate: () => void;
}) {
  const { call } = state;
  const [editing, setEditing] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const accountName = (id: string) => state.accounts.find((a) => a.id === id)?.name;

  const copy = async (id: string) => {
    await window.gchat.rooms.copyLink(id);
    setCopied(id);
    setTimeout(() => setCopied((c) => (c === id ? null : c)), 1500);
  };

  return (
    <aside
      aria-label="Salas"
      className="bg-sidebar flex shrink-0 flex-col rounded-tl-lg"
      style={{ width: SHELL_LAYOUT.roomsPanelWidth }}
    >
      <header className="border-rail flex h-12 shrink-0 items-center justify-between border-b px-4 shadow-sm">
        <h2 className="text-header font-semibold">Salas</h2>
        <Tooltip label="Criar sala">
          <button
            type="button"
            onClick={onCreate}
            aria-label="Criar sala"
            className="text-interactive hover:text-header rounded p-1"
          >
            <Plus size={18} />
          </button>
        </Tooltip>
      </header>

      <div className="flex-1 overflow-y-auto px-2 py-3">
        <p className="text-muted px-2 pb-1 text-xs font-bold tracking-wide uppercase">
          Salas de vídeo
        </p>
        {rooms.length === 0 && (
          <div className="text-muted px-2 py-3 text-sm">
            Crie uma sala e mande o link para os amigos: ela fica sempre no mesmo endereço.
            <button
              type="button"
              onClick={onCreate}
              className="bg-accent hover:bg-accent-hover mt-3 block w-full rounded-[3px] py-1.5 text-sm font-medium text-white"
            >
              Criar sala
            </button>
          </div>
        )}
        <ul className="space-y-0.5">
          {rooms.map((room) => {
            const inCall = call?.roomId === room.id;
            return (
              <li key={room.id}>
                {editing === room.id ? (
                  <form
                    className="px-1 py-1"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const name = new FormData(e.currentTarget).get('name');
                      void window.gchat.rooms
                        .rename(room.id, String(name ?? ''))
                        .then((r) => r.ok && setEditing(null));
                    }}
                  >
                    <input
                      name="name"
                      defaultValue={room.name}
                      autoFocus
                      aria-label={`Novo nome para ${room.name}`}
                      onBlur={(e) => e.currentTarget.form?.requestSubmit()}
                      onKeyDown={(e) => e.key === 'Escape' && setEditing(null)}
                      className={`${inputClass} w-full py-1`}
                    />
                  </form>
                ) : (
                  <div
                    className={`group/room flex items-center gap-1.5 rounded px-2 py-1.5 ${
                      inCall
                        ? 'bg-selected text-header'
                        : 'text-interactive hover:bg-hover hover:text-ink'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => void window.gchat.call.join(room.id)}
                      className="flex min-w-0 flex-1 items-center gap-1.5 text-left font-medium"
                      title={`Entrar em ${room.name}${accountName(room.accountId) ? ` (${accountName(room.accountId)})` : ''}`}
                    >
                      <Volume2
                        size={17}
                        aria-hidden
                        className={inCall ? 'text-success' : 'opacity-70'}
                      />
                      <span className="truncate">{room.name}</span>
                    </button>
                    {confirmDelete === room.id ? (
                      <span className="flex items-center gap-1 text-xs">
                        <button
                          type="button"
                          onClick={() => void window.gchat.rooms.remove(room.id)}
                          className="bg-danger rounded px-1.5 py-0.5 font-semibold text-white"
                        >
                          Excluir
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(null)}
                          className="px-1"
                        >
                          Não
                        </button>
                      </span>
                    ) : (
                      <span className="hidden shrink-0 items-center gap-0.5 group-hover/room:flex group-focus-within/room:flex">
                        <RoomAction label="Copiar link" onClick={() => void copy(room.id)}>
                          {copied === room.id ? (
                            <Check size={14} className="text-success" />
                          ) : (
                            <Copy size={14} />
                          )}
                        </RoomAction>
                        <RoomAction label="Renomear" onClick={() => setEditing(room.id)}>
                          <Pencil size={14} />
                        </RoomAction>
                        <RoomAction label="Excluir sala" onClick={() => setConfirmDelete(room.id)}>
                          <Trash2 size={14} />
                        </RoomAction>
                      </span>
                    )}
                  </div>
                )}
                {inCall && <p className="text-muted pb-1 pl-8 text-xs">Você está aqui</p>}
              </li>
            );
          })}
        </ul>
      </div>

      {call && <CallCard state={state} />}
    </aside>
  );
}

function RoomAction({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="text-interactive hover:text-header rounded p-1"
    >
      {children}
    </button>
  );
}

/** Card "Em chamada", fixo embaixo do painel (como o de voz do Discord). */
function CallCard({ state }: { state: ShellState }) {
  const call = state.call!;
  const elapsed = useElapsed(call.startedAt);
  const { call: api } = window.gchat;
  return (
    <div className="border-rail bg-rail/60 border-t px-2 py-2">
      <div className="flex items-center gap-2 px-1">
        <Signal size={18} className="text-success shrink-0" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-success text-sm font-semibold">Em chamada</p>
          <p className="text-muted truncate text-xs">
            {call.name} · <span className="tabular-nums">{elapsed}</span>
          </p>
        </div>
        <CallButton label="Sair da chamada" danger onClick={() => void api.leave()}>
          <PhoneOff size={17} />
        </CallButton>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        <CallButton label="Microfone (Ctrl+D)" onClick={() => void api.toggle('mic')} wide>
          <Mic size={16} />
        </CallButton>
        <CallButton label="Câmera (Ctrl+E)" onClick={() => void api.toggle('cam')} wide>
          <Video size={16} />
        </CallButton>
        <CallButton
          label={call.visible ? 'Voltar ao Chat (a chamada continua)' : 'Ver chamada'}
          onClick={() => void api.show(!call.visible)}
          wide
        >
          {call.visible ? (
            <MessageSquare size={16} />
          ) : (
            <Video size={16} className="text-success" />
          )}
        </CallButton>
      </div>
    </div>
  );
}

function CallButton({
  label,
  onClick,
  danger = false,
  wide = false,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <Tooltip label={label}>
      <button
        type="button"
        aria-label={label}
        onClick={onClick}
        className={`flex items-center justify-center rounded-md transition-colors ${wide ? 'h-8 w-full' : 'h-8 w-8'} ${
          danger
            ? 'text-interactive hover:bg-danger hover:text-white'
            : 'bg-selected text-header hover:bg-switch-off/60'
        }`}
      >
        {children}
      </button>
    </Tooltip>
  );
}
