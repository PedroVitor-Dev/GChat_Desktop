import { useState, type ReactNode } from 'react';
import { LogOut, Pencil, Plus, Trash2 } from 'lucide-react';
import { ACCOUNT_LIMITS } from '../../../shared/accounts';
import type { AccountView } from '../../../shared/shell';
import { AccountAvatar } from '../components/AccountAvatar';
import { Card } from '../components/Card';
import { Button, SectionTitle, inputClass } from '../components/controls';
import { useShellActions } from '../hooks/shellActions';
import { useShellState } from '../hooks/useShellState';

type Confirm = { kind: 'signOut' | 'remove'; account: AccountView } | null;

export function AccountsPage() {
  const state = useShellState();
  const { openAddAccount } = useShellActions();
  const [editing, setEditing] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [error, setError] = useState<string | null>(null);

  if (!state) return null;
  const { accounts } = state;

  const rename = async (id: string, name: string) => {
    const r = await window.gchat.accounts.rename(id, name);
    if (r.ok) {
      setEditing(null);
      setError(null);
    } else setError(r.error);
  };

  const runConfirm = async () => {
    if (!confirm) return;
    const { kind, account } = confirm;
    setConfirm(null);
    if (kind === 'signOut') {
      await window.gchat.accounts.signOut(account.id);
    } else {
      const r = await window.gchat.accounts.remove(account.id);
      if (!r.ok) setError(r.error ?? 'Não foi possível remover a conta.');
    }
  };

  return (
    <div>
      <p className="text-interactive mb-6">
        Cada conta tem a sua própria sessão do Google, isolada das outras. Todas continuam abertas
        em segundo plano para avisar sobre mensagens. Use <kbd>Ctrl</kbd> + <kbd>1</kbd>…
        <kbd>5</kbd> para alternar.
      </p>

      <SectionTitle>
        Contas ({accounts.length}/{ACCOUNT_LIMITS.max})
      </SectionTitle>
      <Card>
        <ul>
          {accounts.map((a) => (
            <li
              key={a.id}
              className="border-line flex items-center gap-3 border-b py-3 last:border-b-0"
            >
              <AccountAvatar name={a.name} color={a.color} size={40} className="rounded-full" />
              <div className="min-w-0 flex-1">
                {editing === a.id ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const value = new FormData(e.currentTarget).get('name');
                      void rename(a.id, String(value ?? ''));
                    }}
                    className="flex gap-2"
                  >
                    <input
                      name="name"
                      defaultValue={a.name}
                      maxLength={ACCOUNT_LIMITS.nameLength}
                      autoFocus
                      aria-label={`Novo nome para ${a.name}`}
                      onKeyDown={(e) => e.key === 'Escape' && setEditing(null)}
                      className={`${inputClass} w-56`}
                    />
                    <button
                      type="submit"
                      className="bg-accent hover:bg-accent-hover h-8 rounded-[3px] px-4 text-sm font-medium text-white"
                    >
                      Salvar
                    </button>
                  </form>
                ) : (
                  <>
                    <p className="text-header truncate font-semibold select-text">{a.name}</p>
                    <p className="text-muted text-sm">
                      {a.id === state.activeAccount ? 'Aberta agora' : 'Em segundo plano'}
                      {a.unread > 0 && ` · ${a.unread} novas`}
                    </p>
                  </>
                )}
              </div>
              {editing !== a.id && (
                <div className="flex shrink-0 gap-1.5">
                  <IconAction label={`Renomear ${a.name}`} onClick={() => setEditing(a.id)}>
                    <Pencil size={15} />
                  </IconAction>
                  <IconAction
                    label={`Sair da conta Google em ${a.name}`}
                    onClick={() => setConfirm({ kind: 'signOut', account: a })}
                  >
                    <LogOut size={15} />
                  </IconAction>
                  <IconAction
                    label={`Remover ${a.name}`}
                    danger
                    disabled={accounts.length === 1}
                    onClick={() => setConfirm({ kind: 'remove', account: a })}
                  >
                    <Trash2 size={15} />
                  </IconAction>
                </div>
              )}
            </li>
          ))}
        </ul>
      </Card>

      {error && (
        <p role="alert" className="text-danger mt-3 text-sm">
          {error}
        </p>
      )}

      {confirm && (
        <div
          role="alertdialog"
          aria-labelledby="confirm-title"
          className="bg-card border-danger/60 mt-4 rounded-lg border p-4"
        >
          <p id="confirm-title" className="text-header font-semibold">
            {confirm.kind === 'signOut'
              ? `Sair da conta Google em “${confirm.account.name}”?`
              : `Remover “${confirm.account.name}”?`}
          </p>
          <p className="text-interactive mt-1 text-sm">
            {confirm.kind === 'signOut'
              ? 'A sessão salva neste computador será apagada e o Google pedirá login de novo. A entrada continua no trilho.'
              : 'A conta sai do trilho e todos os dados da sessão dela neste computador são apagados. Isso não pode ser desfeito (mas você pode adicioná-la de novo e fazer login).'}
          </p>
          <div className="mt-3 flex gap-2">
            <Button variant="danger" onClick={() => void runConfirm()}>
              {confirm.kind === 'signOut' ? 'Sair da conta' : 'Remover conta'}
            </Button>
            <Button onClick={() => setConfirm(null)}>Cancelar</Button>
          </div>
        </div>
      )}

      <div className="mt-4">
        {accounts.length < ACCOUNT_LIMITS.max ? (
          <Button variant="primary" onClick={openAddAccount}>
            <span className="inline-flex items-center gap-1.5">
              <Plus size={15} aria-hidden /> Adicionar conta
            </span>
          </Button>
        ) : (
          <p className="text-muted text-sm">Limite de {ACCOUNT_LIMITS.max} contas atingido.</p>
        )}
      </div>
    </div>
  );
}

function IconAction({
  label,
  danger = false,
  disabled = false,
  onClick,
  children,
}: {
  label: string;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`bg-selected rounded-full p-2 transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
        danger
          ? 'text-danger hover:bg-danger hover:text-white'
          : 'text-interactive hover:text-header'
      }`}
    >
      {children}
    </button>
  );
}
