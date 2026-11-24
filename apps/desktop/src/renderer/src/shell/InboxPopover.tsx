import { useEffect, useState } from 'react';
import { AtSign, BellOff, Inbox, Moon, MonitorOff, Radio, Star, Trash2, X } from 'lucide-react';
import {
  INBOX_REASON_LABEL,
  relativeTime,
  type InboxEntry,
  type InboxReason,
} from '../../../shared/inbox';
import { ACCOUNT_COLORS } from '../../../shared/accounts';

const REASON_ICON: Record<InboxReason, typeof Moon> = {
  away: MonitorOff,
  paused: BellOff,
  disabled: BellOff,
  'quiet-hours': Moon,
  streamer: Radio,
};

/** Cor estável por conversa, para o círculo com a inicial. */
function colorFor(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return ACCOUNT_COLORS[h % ACCOUNT_COLORS.length]!;
}

/**
 * "Caixa de entrada" com as notificações perdidas (como a do Discord): o que
 * chegou com você fora da janela ou com os avisos pausados. Só memória: some ao
 * fechar o app. Clicar num item abre a conversa no Chat.
 */
export function InboxPopover({ version, onClose }: { version: number; onClose: () => void }) {
  const [entries, setEntries] = useState<InboxEntry[] | null>(null);
  const [tab, setTab] = useState<'all' | 'mentions'>('all');
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let alive = true;
    void window.gchat.inbox.list().then((list) => alive && setEntries(list));
    return () => {
      alive = false;
    };
  }, [version]);

  // Abriu: tudo passa a "visto" (o contador do botão zera).
  useEffect(() => {
    void window.gchat.inbox.markSeen();
    const t = setInterval(() => setNow(Date.now()), 30_000);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      clearInterval(t);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const shown = (entries ?? []).filter((e) => tab === 'all' || e.mention || e.vip);
  const mentions = (entries ?? []).filter((e) => e.mention || e.vip).length;

  return (
    <div className="absolute inset-0 z-30" onMouseDown={onClose}>
      <div className="absolute inset-0 animate-[fade-in_150ms_ease] bg-black/30" />
      <section
        role="dialog"
        aria-label="Notificações perdidas"
        onMouseDown={(e) => e.stopPropagation()}
        className="bg-sidebar border-line absolute top-2 right-3 flex max-h-[min(640px,calc(100%-16px))] w-[440px] max-w-[calc(100%-24px)] animate-[settings-in_160ms_cubic-bezier(0.2,0,0,1)] flex-col overflow-hidden rounded-lg border shadow-2xl"
      >
        <header className="border-rail border-b px-4 pt-3">
          <div className="flex items-center gap-2">
            <Inbox size={18} className="text-interactive" aria-hidden />
            <h2 className="text-header flex-1 font-semibold">Notificações perdidas</h2>
            {(entries?.length ?? 0) > 0 && (
              <button
                type="button"
                onClick={() => void window.gchat.inbox.clear()}
                title="Limpar tudo"
                className="text-interactive hover:text-header hover:bg-hover flex items-center gap-1 rounded px-2 py-1 text-xs"
              >
                <Trash2 size={13} aria-hidden /> Limpar
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="text-interactive hover:text-header hover:bg-hover rounded p-1"
            >
              <X size={16} />
            </button>
          </div>
          <div role="tablist" className="mt-2 flex gap-4 text-sm">
            {(
              [
                ['all', 'Tudo', entries?.length ?? 0],
                ['mentions', 'Menções e prioritárias', mentions],
              ] as const
            ).map(([id, label, count]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={`-mb-px border-b-2 pb-2 font-medium transition-colors ${
                  tab === id
                    ? 'border-accent text-header'
                    : 'text-interactive hover:text-ink border-transparent'
                }`}
              >
                {label}
                {count > 0 && <span className="text-muted ml-1 text-xs">{count}</span>}
              </button>
            ))}
          </div>
        </header>

        <ul className="flex-1 overflow-y-auto p-2">
          {entries && shown.length === 0 && (
            <li className="flex flex-col items-center px-6 py-10 text-center">
              <Inbox size={36} className="text-interactive mb-3 opacity-50" aria-hidden />
              <p className="text-header font-medium">
                {tab === 'all' ? 'Nada perdido por aqui' : 'Nenhuma menção perdida'}
              </p>
              <p className="text-muted mt-1 text-sm">
                O que chegar com você fora da janela ou no silêncio aparece aqui.
              </p>
            </li>
          )}
          {shown.map((e) => {
            const Icon = REASON_ICON[e.reason];
            return (
              <li key={e.id} className="group/item relative">
                <button
                  type="button"
                  onClick={() => {
                    void window.gchat.inbox.open(e.id);
                    onClose();
                  }}
                  className="hover:bg-hover flex w-full gap-3 rounded-md px-2.5 py-2.5 text-left transition-colors"
                >
                  <span
                    aria-hidden
                    className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                    style={{ background: colorFor(e.title) }}
                  >
                    {[...e.title][0]?.toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span
                        className={`truncate ${e.seen ? 'text-ink' : 'text-header font-semibold'}`}
                      >
                        {e.title}
                      </span>
                      {e.vip && (
                        <Star
                          size={12}
                          aria-label="Prioritária"
                          className="shrink-0 fill-[#f0b232] text-[#f0b232]"
                        />
                      )}
                      {e.mention && (
                        <AtSign size={12} aria-label="Menção" className="text-accent shrink-0" />
                      )}
                      {e.accountName && (
                        <span className="bg-selected text-interactive shrink-0 rounded px-1 text-[10px]">
                          {e.accountName}
                        </span>
                      )}
                      <span className="text-muted ml-auto shrink-0 pl-2 text-[11px]">
                        {relativeTime(e.at, now)}
                      </span>
                    </span>
                    {e.body && (
                      <span className="text-interactive mt-0.5 line-clamp-2 text-sm break-words">
                        {e.body}
                      </span>
                    )}
                    <span className="text-muted mt-1 flex items-center gap-1 text-[11px]">
                      <Icon size={11} aria-hidden /> {INBOX_REASON_LABEL[e.reason]}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  title="Remover da lista"
                  aria-label="Remover da lista"
                  onClick={() => void window.gchat.inbox.remove(e.id)}
                  className="text-interactive hover:text-header bg-sidebar absolute top-2 right-2 hidden rounded p-1 group-hover/item:block"
                >
                  <X size={13} />
                </button>
              </li>
            );
          })}
        </ul>

        <footer className="text-muted border-rail border-t px-4 py-2 text-[11px]">
          Fica só na memória do app e some ao fechar. Nada é gravado em disco.
        </footer>
      </section>
    </div>
  );
}
