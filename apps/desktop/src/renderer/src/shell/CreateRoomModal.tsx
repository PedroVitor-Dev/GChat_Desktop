import { useEffect, useRef, useState } from 'react';
import { ROOM_LIMITS } from '../../../shared/rooms';
import { inputClass } from '../components/controls';

const SUGGESTIONS = ['Sala dos amigos', 'Bate-papo', 'Jogatina', 'Reunião rápida'];

/**
 * Criar sala (estilo "Criar canal" do Discord): nova sala no Meet ou uma sala
 * existente pelo link. Ao criar, o link vai para a área de transferência e o
 * usuário entra na sala.
 */
export function CreateRoomModal({
  accountName,
  onClose,
}: {
  accountName: string | null;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<'new' | 'link'>('new');
  const [name, setName] = useState('');
  const [link, setLink] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    input.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = async () => {
    setBusy(true);
    setError(null);
    const r =
      mode === 'new'
        ? await window.gchat.rooms.create(name)
        : await window.gchat.rooms.addFromLink(name, link);
    setBusy(false);
    if (!r.ok) return setError(r.error);
    if (mode === 'new') await window.gchat.rooms.copyLink(r.room.id);
    await window.gchat.call.join(r.room.id);
    onClose();
  };

  const tab = (id: 'new' | 'link', label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={mode === id}
      onClick={() => {
        setMode(id);
        setError(null);
      }}
      className={`flex-1 rounded py-1.5 text-sm font-medium ${
        mode === id ? 'bg-selected text-header' : 'text-interactive hover:text-header'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div
      className="absolute inset-0 z-20 flex animate-[fade-in_150ms_ease] items-center justify-center bg-black/70"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-room-title"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="bg-surface w-[460px] animate-[settings-in_180ms_cubic-bezier(0.2,0,0,1)] overflow-hidden rounded-lg shadow-2xl"
      >
        <div className="px-4 pt-6 pb-3 text-center">
          <h2 id="create-room-title" className="font-display text-header text-2xl font-bold">
            Criar sala
          </h2>
          <p className="text-interactive mt-2">
            Uma sala de vídeo do Google Meet que fica sempre no mesmo link. É só mandar para os
            amigos.
          </p>
        </div>

        <div className="px-4 pb-4">
          <div role="tablist" className="bg-field mb-4 flex gap-1 rounded-md p-1">
            {tab('new', 'Nova sala')}
            {tab('link', 'Já tenho um link')}
          </div>

          <label
            htmlFor="room-name"
            className="text-interactive mb-2 block text-xs font-bold tracking-wide uppercase"
          >
            Nome da sala
          </label>
          <input
            ref={input}
            id="room-name"
            value={name}
            maxLength={ROOM_LIMITS.nameLength}
            placeholder="Ex.: Sala dos amigos"
            onChange={(e) => setName(e.target.value)}
            className={`${inputClass} w-full`}
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setName(s)}
                className="bg-selected text-interactive hover:text-header rounded-full px-2.5 py-0.5 text-xs"
              >
                {s}
              </button>
            ))}
          </div>

          {mode === 'link' && (
            <>
              <label
                htmlFor="room-link"
                className="text-interactive mt-4 mb-2 block text-xs font-bold tracking-wide uppercase"
              >
                Link do Meet
              </label>
              <input
                id="room-link"
                value={link}
                placeholder="meet.google.com/abc-defg-hij"
                onChange={(e) => setLink(e.target.value)}
                className={`${inputClass} w-full`}
              />
            </>
          )}

          {error && (
            <p role="alert" className="text-danger mt-3 text-sm">
              {error}
            </p>
          )}
          <p className="text-muted mt-3 text-xs">
            {mode === 'new'
              ? `Criada na conta ${accountName ?? 'ativa'}. O link é copiado para você colar no Chat.`
              : 'Use o link de uma sala que alguém já criou.'}
            {busy &&
              ' Se preferir, feche esta janela: a sala aparece na lista quando ficar pronta.'}
          </p>
        </div>

        <div className="bg-sidebar flex items-center justify-between px-4 py-4">
          <button type="button" onClick={onClose} className="text-ink text-sm hover:underline">
            Voltar
          </button>
          <button
            type="submit"
            disabled={busy || !name.trim() || (mode === 'link' && !link.trim())}
            className="bg-accent hover:bg-accent-hover h-9 rounded-[3px] px-5 text-sm font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? 'Criando…' : mode === 'new' ? 'Criar e entrar' : 'Salvar e entrar'}
          </button>
        </div>
      </form>
    </div>
  );
}
