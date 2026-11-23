import { useState } from 'react';
import { Check, Copy, Headphones, Plus, Volume2 } from 'lucide-react';
import type { Room } from '../../../shared/rooms';
import type { AccountView } from '../../../shared/shell';

/**
 * Área principal das Salas quando não há chamada: cartões das salas com
 * "Entrar" e o convite, como o saguão de um servidor no Discord.
 */
export function RoomsLobby({
  rooms,
  accounts,
  onCreate,
}: {
  rooms: Room[];
  accounts: AccountView[];
  onCreate: () => void;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const accountName = (id: string) =>
    accounts.length > 1 ? accounts.find((a) => a.id === id)?.name : undefined;

  return (
    <div className="bg-surface flex min-w-0 flex-1 flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-10 py-12">
        <div className="mb-8 flex items-center gap-4">
          <span className="bg-success/15 text-success flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl">
            <Headphones size={28} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-header text-2xl font-bold">Salas de vídeo</h1>
            <p className="text-interactive">
              Salas do Google Meet que ficam sempre no mesmo link. Entre quando quiser e chame os
              amigos.
            </p>
          </div>
          <button
            type="button"
            onClick={onCreate}
            className="bg-accent hover:bg-accent-hover flex h-9 shrink-0 items-center gap-1.5 rounded-[3px] px-4 text-sm font-medium text-white"
          >
            <Plus size={16} aria-hidden /> Criar sala
          </button>
        </div>

        {rooms.length === 0 ? (
          <div className="border-line text-muted rounded-xl border-2 border-dashed p-10 text-center">
            Nenhuma sala ainda. Crie a primeira e mande o link no Chat.
          </div>
        ) : (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
            {rooms.map((room) => (
              <li
                key={room.id}
                className="bg-card hover:bg-hover group/card flex flex-col rounded-xl p-4 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Volume2 size={18} className="text-interactive shrink-0" aria-hidden />
                  <p className="text-header truncate font-semibold">{room.name}</p>
                </div>
                <p className="text-muted mt-1 text-xs">
                  meet.google.com/{room.code}
                  {accountName(room.accountId) && ` · ${accountName(room.accountId)}`}
                </p>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => void window.gchat.call.join(room.id)}
                    className="bg-success flex h-8 flex-1 items-center justify-center rounded-[3px] text-sm font-medium text-white hover:brightness-110"
                  >
                    Entrar
                  </button>
                  <button
                    type="button"
                    title="Copiar link para convidar"
                    aria-label={`Copiar link de ${room.name}`}
                    onClick={() => {
                      void window.gchat.rooms.copyLink(room.id).then(() => {
                        setCopied(room.id);
                        setTimeout(() => setCopied((c) => (c === room.id ? null : c)), 1500);
                      });
                    }}
                    className="bg-selected text-interactive hover:text-header flex h-8 w-9 items-center justify-center rounded-[3px]"
                  >
                    {copied === room.id ? (
                      <Check size={15} className="text-success" />
                    ) : (
                      <Copy size={15} />
                    )}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
