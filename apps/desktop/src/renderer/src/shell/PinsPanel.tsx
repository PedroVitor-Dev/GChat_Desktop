import {
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type MouseEvent,
  type ReactNode,
} from 'react';
import {
  ChevronDown,
  FolderPlus,
  MessageSquare,
  MoreHorizontal,
  PanelLeftClose,
  Pencil,
  Pin,
  PinOff,
  Star,
  Trash2,
} from 'lucide-react';
import {
  PIN_LIMITS,
  newId,
  type PinGroup,
  type PinItem,
  type PinsSettings,
} from '../../../shared/pins';
import { SHELL_LAYOUT, type ShellState } from '../../../shared/shell';

/** Emojis sugeridos para identificar conversas e grupos. */
const EMOJIS = [
  '💼',
  '🏠',
  '❤️',
  '⭐',
  '🔥',
  '🚀',
  '💬',
  '📌',
  '🎮',
  '🎵',
  '📚',
  '💰',
  '🛒',
  '⚽',
  '🍕',
  '☕',
  '👨‍👩‍👧',
  '👥',
  '🧑‍💻',
  '🛠️',
  '📈',
  '🎓',
  '✈️',
  '🐶',
];

type Drag = { kind: 'item'; id: string } | { kind: 'group'; id: string } | null;
type DropAt = { groupId: string; index: number } | { beforeGroup: string | null } | null;

/**
 * Conversas fixadas, ao lado do Chat (como a lista de canais do Discord):
 * grupos recolhíveis com as conversas do dia a dia, contador de mensagens novas,
 * arrastar para reorganizar e um clique para abrir. Não mexe no Google Chat: só
 * navega até o endereço da conversa.
 */
export function PinsPanel({
  state,
  pins,
  vip,
}: {
  state: ShellState;
  pins: PinsSettings;
  vip: readonly string[];
}) {
  const accountId = state.activeAccount;
  const account = state.accounts.find((a) => a.id === accountId);
  const groups = pins.groups.filter((g) => g.accountId === accountId);
  const all = groups.flatMap((g) => g.items);
  const current = state.pins.current;
  const currentPinned = current ? all.find((i) => i.path === current.path) : undefined;
  const [editing, setEditing] = useState<string | null>(null);
  const [emojiFor, setEmojiFor] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState<Drag>(null);
  const [dropAt, setDropAt] = useState<DropAt>(null);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 4000);
    return () => clearTimeout(t);
  }, [error]);

  /** Aplica uma alteração nos grupos desta conta e grava a lista inteira. */
  const commit = (change: (mine: PinGroup[]) => PinGroup[]) => {
    const mine = change(structuredClone(groups));
    const others = pins.groups.filter((g) => g.accountId !== accountId);
    void window.gchat.pins.save([...others, ...mine]);
  };
  const updateItem = (id: string, patch: Partial<PinItem>) =>
    commit((mine) =>
      mine.map((g) => ({
        ...g,
        items: g.items.map((i) => (i.id === id ? { ...i, ...patch } : i)),
      })),
    );
  const updateGroup = (id: string, patch: Partial<PinGroup>) =>
    commit((mine) => mine.map((g) => (g.id === id ? { ...g, ...patch } : g)));

  const pinCurrent = async (groupId: string | null) => {
    const r = await window.gchat.pins.pinCurrent(groupId);
    if (r.ok) {
      setFlash(r.pinId);
      setTimeout(() => setFlash((f) => (f === r.pinId ? null : f)), 1200);
    } else setError(r.error);
  };

  const addGroup = () => {
    if (groups.length >= PIN_LIMITS.groupsPerAccount) {
      setError(`Limite de ${PIN_LIMITS.groupsPerAccount} grupos.`);
      return;
    }
    const id = newId('grp');
    commit((mine) => [...mine, { id, accountId, name: 'Novo grupo', collapsed: false, items: [] }]);
    setEditing(id);
  };

  const removeGroup = (id: string) => {
    // As conversas do grupo vão para o primeiro outro grupo (nada se perde sem querer).
    commit((mine) => {
      const gone = mine.find((g) => g.id === id);
      const rest = mine.filter((g) => g.id !== id);
      if (gone && gone.items.length > 0 && rest[0]) rest[0].items.push(...gone.items);
      return rest;
    });
    setConfirmDelete(null);
  };

  // ── arrastar e soltar ──
  const onDragStart = (e: DragEvent, d: NonNullable<Drag>) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', d.id);
    setDrag(d);
  };
  const endDrag = () => {
    setDrag(null);
    setDropAt(null);
  };
  const overItem = (e: DragEvent, groupId: string, index: number) => {
    if (drag?.kind !== 'item') return;
    e.preventDefault();
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDropAt({ groupId, index: e.clientY > r.top + r.height / 2 ? index + 1 : index });
  };
  const overGroupHeader = (e: DragEvent, group: PinGroup) => {
    e.preventDefault();
    if (drag?.kind === 'item') setDropAt({ groupId: group.id, index: group.items.length });
    else if (drag?.kind === 'group') setDropAt({ beforeGroup: group.id });
  };
  const drop = (e: DragEvent) => {
    e.preventDefault();
    if (!drag || !dropAt) return endDrag();
    commit((mine) => {
      if (drag.kind === 'item' && 'groupId' in dropAt) {
        let moving: PinItem | undefined;
        let fromGroup = '';
        let fromIndex = -1;
        for (const g of mine) {
          const i = g.items.findIndex((x) => x.id === drag.id);
          if (i >= 0) {
            moving = g.items.splice(i, 1)[0];
            fromGroup = g.id;
            fromIndex = i;
          }
        }
        const target = mine.find((g) => g.id === dropAt.groupId);
        if (!moving || !target) return mine;
        const index =
          fromGroup === target.id && fromIndex < dropAt.index ? dropAt.index - 1 : dropAt.index;
        target.items.splice(index, 0, moving);
        target.collapsed = false;
        return mine;
      }
      if (drag.kind === 'group' && 'beforeGroup' in dropAt) {
        const moving = mine.find((g) => g.id === drag.id);
        if (!moving || dropAt.beforeGroup === drag.id) return mine;
        const rest = mine.filter((g) => g.id !== drag.id);
        const at =
          dropAt.beforeGroup === null
            ? rest.length
            : rest.findIndex((g) => g.id === dropAt.beforeGroup);
        rest.splice(at < 0 ? rest.length : at, 0, moving);
        return rest;
      }
      return mine;
    });
    endDrag();
  };

  return (
    <aside
      aria-label="Conversas fixadas"
      className="bg-pane flex shrink-0 flex-col rounded-tl-lg"
      style={{ width: SHELL_LAYOUT.pinsPanelWidth }}
      onClick={() => {
        setMenuFor(null);
        setEmojiFor(null);
      }}
    >
      <header className="border-rail flex h-12 shrink-0 items-center gap-1 border-b pr-2 pl-4 shadow-sm">
        {/* Nome da conta no topo, como o nome do servidor no Discord. */}
        <h2 className="min-w-0 flex-1">
          <span className="text-header block truncate leading-tight font-semibold">
            {account?.name ?? 'Conta'}
          </span>
          <span className="text-muted block text-[11px] leading-tight">Conversas fixadas</span>
        </h2>
        <HeaderButton label="Novo grupo" onClick={addGroup}>
          <FolderPlus size={17} />
        </HeaderButton>
        <HeaderButton
          label="Esconder o painel"
          onClick={() => void window.gchat.pins.setPanel(false)}
        >
          <PanelLeftClose size={17} />
        </HeaderButton>
      </header>

      {/* A conversa aberta no Chat ainda não está na lista: oferece fixar. */}
      {current && !currentPinned && (
        <div className="px-2 pt-2">
          <button
            type="button"
            onClick={() => void pinCurrent(null)}
            title="Fixar a conversa aberta no Chat"
            className="group/pin border-accent/40 bg-accent/10 hover:bg-accent/20 text-header flex w-full animate-[fade-in_200ms_ease] items-center gap-2 rounded-md border border-dashed px-2.5 py-2 text-left text-sm transition-colors"
          >
            <Pin size={15} className="text-accent shrink-0" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="text-muted block text-[11px] leading-tight">Fixar conversa</span>
              <span className="block truncate font-medium">
                {current.name ?? 'Conversa aberta'}
              </span>
            </span>
          </button>
        </div>
      )}

      <div
        className="flex-1 overflow-x-hidden overflow-y-auto px-2 pt-2 pb-4"
        onDragOver={(e) => {
          if (drag?.kind === 'group') {
            e.preventDefault();
            if (!dropAt) setDropAt({ beforeGroup: null });
          }
        }}
        onDrop={drop}
      >
        {groups.length === 0 && (
          <div className="text-muted px-2 py-4 text-sm leading-relaxed">
            <Pin size={28} className="text-interactive mb-2 opacity-60" aria-hidden />
            <p className="text-header font-medium">Suas conversas do dia a dia, sempre à mão.</p>
            <p className="mt-1">
              Abra uma conversa ou um espaço no Chat e clique em <strong>Fixar conversa</strong>.
              Depois, organize em grupos e arraste para mudar a ordem.
            </p>
          </div>
        )}

        {groups.map((group, gi) => {
          const groupUnread = group.items.reduce((n, i) => n + (state.pins.unread[i.id] ?? 0), 0);
          const showGroupDrop =
            drag?.kind === 'group' &&
            dropAt &&
            'beforeGroup' in dropAt &&
            dropAt.beforeGroup === group.id;
          return (
            <section key={group.id} className={gi > 0 ? 'mt-3' : ''}>
              {showGroupDrop && <DropLine />}
              <div
                draggable={editing !== group.id}
                onDragStart={(e) => onDragStart(e, { kind: 'group', id: group.id })}
                onDragEnd={endDrag}
                onDragOver={(e) => overGroupHeader(e, group)}
                onDrop={drop}
                className={`group/hdr relative flex h-7 items-center gap-0.5 rounded pr-1 ${
                  drag?.kind === 'item' &&
                  dropAt &&
                  'groupId' in dropAt &&
                  dropAt.groupId === group.id &&
                  group.collapsed
                    ? 'bg-accent/15'
                    : ''
                }`}
              >
                {editing === group.id ? (
                  <RenameInput
                    value={group.name}
                    max={PIN_LIMITS.groupNameLength}
                    onDone={(name) => {
                      if (name) updateGroup(group.id, { name });
                      setEditing(null);
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => updateGroup(group.id, { collapsed: !group.collapsed })}
                    onDoubleClick={() => setEditing(group.id)}
                    aria-expanded={!group.collapsed}
                    className="text-muted hover:text-ink flex min-w-0 flex-1 items-center gap-0.5 text-left text-xs font-bold tracking-wide uppercase"
                  >
                    <ChevronDown
                      size={12}
                      aria-hidden
                      className={`shrink-0 transition-transform duration-150 ${group.collapsed ? '-rotate-90' : ''}`}
                    />
                    <span className="truncate">{group.name}</span>
                    {group.collapsed && groupUnread > 0 && <UnreadBadge count={groupUnread} />}
                  </button>
                )}
                {editing !== group.id && (
                  <span className="flex opacity-0 transition-opacity group-hover/hdr:opacity-100 focus-within:opacity-100">
                    {current && !currentPinned && (
                      <RowButton
                        label={`Fixar a conversa aberta em “${group.name}”`}
                        onClick={() => void pinCurrent(group.id)}
                      >
                        <Pin size={13} />
                      </RowButton>
                    )}
                    <RowButton
                      label="Opções do grupo"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuFor(menuFor === group.id ? null : group.id);
                      }}
                    >
                      <MoreHorizontal size={14} />
                    </RowButton>
                  </span>
                )}
                {menuFor === group.id && (
                  <Menu>
                    <MenuItem icon={<Pencil size={14} />} onClick={() => setEditing(group.id)}>
                      Renomear grupo
                    </MenuItem>
                    <MenuItem
                      icon={<Trash2 size={14} />}
                      danger
                      onClick={() => setConfirmDelete(group.id)}
                    >
                      Excluir grupo
                    </MenuItem>
                  </Menu>
                )}
              </div>

              {confirmDelete === group.id && (
                <div className="bg-card border-danger/50 my-1 rounded-md border p-2 text-xs">
                  <p className="text-header">
                    Excluir “{group.name}”?{' '}
                    {group.items.length > 0 &&
                      (groups.length > 1
                        ? `As ${group.items.length} conversas vão para “${groups.find((g) => g.id !== group.id)?.name}”.`
                        : `As ${group.items.length} conversas serão desafixadas.`)}
                  </p>
                  <div className="mt-2 flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => removeGroup(group.id)}
                      className="bg-danger rounded px-2 py-1 font-medium text-white"
                    >
                      Excluir
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(null)}
                      className="text-interactive hover:text-header rounded px-2 py-1"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {!group.collapsed && (
                <ul
                  className="mt-0.5 space-y-px"
                  onDragOver={(e) => {
                    if (drag?.kind === 'item' && group.items.length === 0) {
                      e.preventDefault();
                      setDropAt({ groupId: group.id, index: 0 });
                    }
                  }}
                  onDrop={drop}
                >
                  {group.items.length === 0 && (
                    <li className="text-muted px-2 py-1.5 text-xs italic">
                      {drag?.kind === 'item' ? 'Solte aqui' : 'Arraste conversas para cá'}
                    </li>
                  )}
                  {group.items.map((item, index) => {
                    const active = state.view === 'chat' && current?.path === item.path;
                    const unread = state.pins.unread[item.id] ?? 0;
                    const showDrop =
                      drag?.kind === 'item' &&
                      dropAt &&
                      'groupId' in dropAt &&
                      dropAt.groupId === group.id &&
                      dropAt.index === index;
                    return (
                      <li
                        key={item.id}
                        className="relative"
                        onDragOver={(e) => overItem(e, group.id, index)}
                        onDrop={drop}
                      >
                        {showDrop && <DropLine />}
                        {editing === item.id ? (
                          <div className="px-1 py-0.5">
                            <RenameInput
                              value={item.name}
                              max={PIN_LIMITS.nameLength}
                              onDone={(name) => {
                                if (name) updateItem(item.id, { name });
                                setEditing(null);
                              }}
                            />
                          </div>
                        ) : (
                          <div
                            draggable
                            onDragStart={(e) => onDragStart(e, { kind: 'item', id: item.id })}
                            onDragEnd={endDrag}
                            className={`group/item relative flex h-[34px] items-center gap-2 rounded px-2 transition-colors ${
                              active
                                ? 'bg-selected text-header'
                                : unread > 0
                                  ? 'text-header hover:bg-hover'
                                  : 'text-interactive hover:bg-hover hover:text-ink'
                            } ${drag?.kind === 'item' && drag.id === item.id ? 'opacity-40' : ''} ${
                              flash === item.id ? 'animate-[pin-flash_1.2s_ease]' : ''
                            }`}
                          >
                            {/* Marcador de não lidas à esquerda, como no Discord. */}
                            {unread > 0 && !active && (
                              <span className="bg-header absolute top-1/2 -left-2 h-2 w-1 -translate-y-1/2 rounded-r-full" />
                            )}
                            <button
                              type="button"
                              title="Escolher um emoji"
                              aria-label={`Emoji de ${item.name}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setEmojiFor(emojiFor === item.id ? null : item.id);
                              }}
                              className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[15px] leading-none hover:bg-black/10"
                              style={{
                                fontFamily: '"Segoe UI Emoji", "Noto Color Emoji", sans-serif',
                              }}
                            >
                              {item.emoji ?? (
                                <MessageSquare size={16} className="opacity-70" aria-hidden />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => void window.gchat.pins.open(item.id)}
                              onDoubleClick={() => setEditing(item.id)}
                              title={
                                item.name !== item.chatName
                                  ? `${item.name} (${item.chatName} no Chat)`
                                  : `Abrir ${item.name}`
                              }
                              className={`min-w-0 flex-1 truncate text-left ${unread > 0 || active ? 'font-semibold' : 'font-medium'}`}
                            >
                              {item.name}
                            </button>
                            {vip.includes(item.chatName) && (
                              <Star
                                size={12}
                                aria-label="Prioritária"
                                className="shrink-0 fill-[#f0b232] text-[#f0b232] group-hover/item:hidden"
                              />
                            )}
                            {unread > 0 && (
                              <span className="group-hover/item:hidden">
                                <UnreadBadge count={unread} />
                              </span>
                            )}
                            <span className="hidden shrink-0 group-hover/item:flex">
                              <RowButton label="Renomear" onClick={() => setEditing(item.id)}>
                                <Pencil size={13} />
                              </RowButton>
                              <RowButton
                                label="Desafixar"
                                onClick={() =>
                                  commit((mine) =>
                                    mine.map((g) => ({
                                      ...g,
                                      items: g.items.filter((i) => i.id !== item.id),
                                    })),
                                  )
                                }
                              >
                                <PinOff size={13} />
                              </RowButton>
                            </span>
                          </div>
                        )}
                        {emojiFor === item.id && (
                          <EmojiPicker
                            onPick={(emoji) => {
                              updateItem(item.id, { emoji });
                              setEmojiFor(null);
                            }}
                          />
                        )}
                      </li>
                    );
                  })}
                  {drag?.kind === 'item' &&
                    dropAt &&
                    'groupId' in dropAt &&
                    dropAt.groupId === group.id &&
                    dropAt.index === group.items.length &&
                    group.items.length > 0 && <DropLine />}
                </ul>
              )}
            </section>
          );
        })}
        {drag?.kind === 'group' &&
          dropAt &&
          'beforeGroup' in dropAt &&
          dropAt.beforeGroup === null && <DropLine />}
      </div>

      {error && (
        <p role="alert" className="bg-danger/15 text-danger mx-2 mb-2 rounded px-2 py-1.5 text-xs">
          {error}
        </p>
      )}
      {all.length > 0 && (
        <p className="text-muted border-rail border-t px-4 py-2 text-[11px]">
          <kbd>Alt</kbd> + <kbd>1</kbd>…<kbd>9</kbd> abre as primeiras · arraste para organizar
        </p>
      )}
    </aside>
  );
}

// ───────────────────────────── peças ─────────────────────────────

function HeaderButton({
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
      className="text-interactive hover:text-header hover:bg-hover rounded p-1.5 transition-colors"
    >
      {children}
    </button>
  );
}

function RowButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: (e: MouseEvent) => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      className="text-interactive hover:text-header rounded p-1"
    >
      {children}
    </button>
  );
}

function UnreadBadge({ count }: { count: number }) {
  return (
    <span className="bg-danger ml-1 inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full px-1 text-[11px] leading-none font-bold text-white">
      {count > 99 ? '99+' : count}
    </span>
  );
}

function DropLine() {
  return <span className="bg-accent pointer-events-none my-px block h-0.5 rounded-full" />;
}

function Menu({ children }: { children: ReactNode }) {
  return (
    <div
      role="menu"
      onClick={(e) => e.stopPropagation()}
      className="absolute top-7 right-0 z-20 w-44 animate-[fade-in_120ms_ease] rounded-md bg-[#111214] p-1.5 shadow-xl"
    >
      {children}
    </div>
  );
}

function MenuItem({
  icon,
  danger = false,
  onClick,
  children,
}: {
  icon: ReactNode;
  danger?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm ${
        danger
          ? 'text-[#f23f43] hover:bg-[#da373c] hover:text-white'
          : 'text-[#dbdee1] hover:bg-[#5865f2] hover:text-white'
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function RenameInput({
  value,
  max,
  onDone,
}: {
  value: string;
  max: number;
  onDone: (value: string | null) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.select(), []);
  const finish = () => onDone(ref.current?.value.trim() || null);
  return (
    <input
      ref={ref}
      defaultValue={value}
      maxLength={max}
      aria-label="Novo nome"
      onBlur={finish}
      onKeyDown={(e) => {
        if (e.key === 'Enter') finish();
        if (e.key === 'Escape') onDone(null);
      }}
      className="bg-field text-header focus:ring-accent h-7 w-full rounded px-2 text-sm outline-none focus:ring-2"
    />
  );
}

function EmojiPicker({ onPick }: { onPick: (emoji: string | null) => void }) {
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="bg-card border-line absolute top-9 left-0 z-20 w-[220px] animate-[fade-in_120ms_ease] rounded-lg border p-2 shadow-xl"
    >
      <div
        className="grid grid-cols-8 gap-0.5"
        style={{ fontFamily: '"Segoe UI Emoji", "Noto Color Emoji", sans-serif' }}
      >
        {EMOJIS.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => onPick(e)}
            className="hover:bg-hover flex h-6 w-6 items-center justify-center rounded text-base"
          >
            {e}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onPick(null)}
        className="text-interactive hover:text-header mt-1.5 w-full rounded py-1 text-xs"
      >
        Sem emoji
      </button>
    </div>
  );
}
