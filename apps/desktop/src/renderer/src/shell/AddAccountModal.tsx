import { useEffect, useRef, useState } from 'react';
import { ACCOUNT_LIMITS } from '../../../shared/accounts';
import { inputClass } from '../components/controls';

const SUGGESTIONS = ['Pessoal', 'Trabalho', 'Faculdade', 'Cliente'];

/**
 * Modal no estilo "Criar servidor" do Discord. Pede só um nome: o login acontece
 * na página oficial do Google, que abre logo em seguida na nova conta.
 */
export function AddAccountModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
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
    const result = await window.gchat.accounts.add(name);
    setBusy(false);
    if (result.ok) onClose();
    else setError(result.error);
  };

  return (
    <div
      className="absolute inset-0 z-20 flex animate-[fade-in_150ms_ease] items-center justify-center bg-black/70"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-account-title"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="bg-surface w-[440px] animate-[settings-in_180ms_cubic-bezier(0.2,0,0,1)] overflow-hidden rounded-lg shadow-2xl"
      >
        <div className="px-4 pt-6 pb-4 text-center">
          <h2 id="add-account-title" className="font-display text-header text-2xl font-bold">
            Adicionar conta
          </h2>
          <p className="text-interactive mt-2">
            Cada conta tem sua própria sessão do Google Chat e continua recebendo notificações,
            mesmo quando não está aberta.
          </p>
        </div>

        <div className="px-4 pb-4">
          <label
            htmlFor="account-name"
            className="text-interactive mb-2 block text-xs font-bold tracking-wide uppercase"
          >
            Nome da conta
          </label>
          <input
            ref={input}
            id="account-name"
            value={name}
            maxLength={ACCOUNT_LIMITS.nameLength}
            placeholder="Ex.: Trabalho"
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
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
          {error && (
            <p role="alert" className="text-danger mt-2 text-sm">
              {error}
            </p>
          )}
          <p className="text-muted mt-3 text-xs">
            Depois de adicionar, faça login na página do Google que vai aparecer. Cada conta aberta
            usa um pouco mais de memória.
          </p>
        </div>

        <div className="bg-sidebar flex items-center justify-between px-4 py-4">
          <button type="button" onClick={onClose} className="text-ink text-sm hover:underline">
            Voltar
          </button>
          <button
            type="submit"
            disabled={busy || !name.trim()}
            className="bg-accent hover:bg-accent-hover h-9 rounded-[3px] px-5 text-sm font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            Adicionar
          </button>
        </div>
      </form>
    </div>
  );
}
