import { useEffect, useRef, useState } from 'react';
import { Loader2, MessageSquare, Pin, Search, Users, X } from 'lucide-react';
import type { ChatConversation } from '../../../shared/pins';

const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

/**
 * Escolher conversas para fixar sem abri-las: lista as conversas e espaços da
 * barra lateral do Chat (só nome e endereço) que ainda não estão fixados.
 */
export function AddConversationPicker({
  groupName,
  current,
  onPick,
  onPickCurrent,
  onClose,
}: {
  /** Grupo de destino (null = primeiro grupo). */
  groupName: string | null;
  /** Conversa aberta no Chat agora, se ainda não fixada. */
  current: { name: string } | null;
  onPick: (c: ChatConversation) => void;
  onPickCurrent: () => void;
  onClose: () => void;
}) {
  const [list, setList] = useState<ChatConversation[] | null>(null);
  const [query, setQuery] = useState('');
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    void window.gchat.pins.available().then((l) => alive && setList(l));
    input.current?.focus();
    return () => {
      alive = false;
    };
  }, []);

  const shown = (list ?? []).filter((c) => fold(c.name).includes(fold(query.trim())));

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      className="bg-card border-line mx-2 mt-2 flex max-h-[60%] animate-[fade-in_120ms_ease] flex-col overflow-hidden rounded-lg border shadow-xl"
    >
      <div className="flex items-center gap-1 px-2.5 pt-2">
        <p className="text-header min-w-0 flex-1 truncate text-xs font-semibold">
          Fixar conversa{groupName ? ` em “${groupName}”` : ''}
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="text-interactive hover:text-header rounded p-0.5"
        >
          <X size={14} />
        </button>
      </div>
      <label className="bg-field mx-2 mt-1.5 mb-1 flex items-center gap-1.5 rounded px-2">
        <Search size={13} className="text-muted shrink-0" aria-hidden />
        <input
          ref={input}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar conversa ou espaço"
          aria-label="Buscar conversa ou espaço"
          className="text-header placeholder:text-muted h-7 min-w-0 flex-1 bg-transparent text-sm outline-none"
        />
      </label>

      <ul className="min-h-0 flex-1 overflow-y-auto px-1 pb-1.5">
        {current && !query && (
          <li>
            <button
              type="button"
              onClick={onPickCurrent}
              className="hover:bg-hover text-header flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm"
            >
              <Pin size={14} className="text-accent shrink-0" aria-hidden />
              <span className="min-w-0 flex-1 truncate">
                {current.name}
                <span className="text-muted ml-1 text-[11px]">aberta agora</span>
              </span>
            </button>
          </li>
        )}
        {list === null && (
          <li className="text-muted flex items-center gap-2 px-2 py-2 text-xs">
            <Loader2 size={13} className="animate-spin" aria-hidden /> Lendo a lista do Chat…
          </li>
        )}
        {list && shown.length === 0 && (
          <li className="text-muted px-2 py-2 text-xs leading-relaxed">
            {query
              ? 'Nenhuma conversa com esse nome na barra lateral do Chat.'
              : 'As conversas da barra lateral do Chat já estão fixadas (ou o Chat ainda está carregando).'}
          </li>
        )}
        {shown.map((c) => (
          <li key={c.path}>
            <button
              type="button"
              onClick={() => onPick(c)}
              className="hover:bg-hover text-interactive hover:text-header flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm"
            >
              {c.kind === 'space' ? (
                <Users size={14} className="shrink-0 opacity-70" aria-label="Espaço" />
              ) : (
                <MessageSquare size={14} className="shrink-0 opacity-70" aria-label="Conversa" />
              )}
              <span className="min-w-0 flex-1 truncate">{c.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
