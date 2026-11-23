import type { CSSProperties, ReactNode } from 'react';
import { Headphones, Plus, Settings } from 'lucide-react';
import logo from '../../../../resources/icon.png';
import { ACCOUNT_COLORS, ACCOUNT_LIMITS, accountInitials } from '../../../shared/accounts';
import { SHELL_LAYOUT, type AccountView, type ShellView } from '../../../shared/shell';
import { PRESENCE_LABEL, leadingEmoji } from '../../../shared/profile';
import { PresenceDot } from '../components/PresenceDot';
import { Tooltip } from '../components/Tooltip';

/**
 * Trilho de ícones à esquerda (como a lista de servidores do Discord). Cada
 * ícone é um destino e só um fica ativo por vez:
 *   [contas do Google Chat] [+ conta] ── [Salas de vídeo] ··· [Configurações]
 */
export function Rail({
  accounts,
  activeAccount,
  view,
  settingsOpen,
  inCall,
  onSelect,
  onAdd,
  onRooms,
  onSettings,
  onProfile,
}: {
  accounts: AccountView[];
  activeAccount: string;
  view: ShellView;
  settingsOpen: boolean;
  inCall: boolean;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onRooms: () => void;
  onSettings: () => void;
  /** Abre o menu de status do Google Chat. */
  onProfile: () => void;
}) {
  const single = accounts.length === 1;
  const canAdd = accounts.length < ACCOUNT_LIMITS.max;

  return (
    <nav
      aria-label="Contas"
      className="bg-rail flex shrink-0 flex-col items-center gap-2 overflow-y-auto pt-1 pb-3"
      style={{ width: SHELL_LAYOUT.railWidth }}
    >
      {accounts.map((a, i) => {
        const active = !settingsOpen && view === 'chat' && a.id === activeAccount;
        // Com uma conta só, o ícone é o logo do app; com várias, as iniciais da conta.
        return (
          <RailItem
            key={a.id}
            label={
              single
                ? `Google Chat${a.displayName ? ` · ${a.displayName}` : ''}`
                : `${a.name}${a.displayName ? ` · ${a.displayName}` : ''}${i < 5 ? ` (Ctrl+${i + 1})` : ''}`
            }
            active={active}
            badge={a.unread}
            activeColor={single ? undefined : ACCOUNT_COLORS[a.color % ACCOUNT_COLORS.length]}
            onClick={() => onSelect(a.id)}
          >
            {single ? (
              <img src={logo} alt="" className="h-8 w-8" draggable={false} />
            ) : (
              <span className="text-[17px] font-semibold">{accountInitials(a.name)}</span>
            )}
          </RailItem>
        );
      })}

      <RailItem
        label={canAdd ? 'Adicionar conta' : `Limite de ${ACCOUNT_LIMITS.max} contas`}
        disabled={!canAdd}
        variant="action"
        onClick={onAdd}
      >
        <Plus size={22} />
      </RailItem>

      <div className="bg-line h-0.5 w-8 shrink-0 rounded-full" aria-hidden />

      <RailItem
        label={inCall ? 'Salas de vídeo · em chamada' : 'Salas de vídeo'}
        active={!settingsOpen && view === 'rooms'}
        badge={0}
        variant="action"
        onClick={onRooms}
      >
        <Headphones size={20} />
        {inCall && (
          <span
            aria-hidden
            className="bg-success border-rail absolute -right-0.5 -bottom-0.5 h-4 w-4 rounded-full border-[3px]"
          />
        )}
      </RailItem>

      <div className="flex-1" />

      <ProfileButton account={accounts.find((a) => a.id === activeAccount)} onClick={onProfile} />

      <RailItem
        label="Configurações (Ctrl+,)"
        active={settingsOpen}
        variant="action"
        onClick={onSettings}
      >
        <Settings size={20} />
      </RailItem>
    </nav>
  );
}

function RailItem({
  label,
  active = false,
  badge = 0,
  disabled = false,
  variant = 'default',
  activeColor,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  badge?: number;
  disabled?: boolean;
  variant?: 'default' | 'action';
  /** Cor da conta: fundo quando ativa ou no hover. */
  activeColor?: string | undefined;
  onClick?: () => void;
  children: ReactNode;
}) {
  const shape = active ? 'rounded-2xl' : 'rounded-3xl hover:rounded-2xl';
  const colors =
    variant === 'action'
      ? active
        ? 'bg-success text-white'
        : 'bg-surface text-success hover:bg-success hover:text-white'
      : activeColor
        ? 'text-header hover:text-white'
        : active
          ? 'bg-accent'
          : 'bg-surface hover:bg-accent';

  return (
    <div className="group/rail relative flex w-full shrink-0 justify-center">
      {/* Indicador à esquerda: ponto no hover/não lidas, barra alta quando ativo */}
      <span
        aria-hidden
        className={`bg-header ease-snappy absolute top-1/2 left-0 w-1 -translate-y-1/2 rounded-r-full transition-all duration-200 ${
          active ? 'h-10' : badge > 0 ? 'h-2 group-hover/rail:h-5' : 'h-0 group-hover/rail:h-5'
        }`}
      />
      <Tooltip label={label}>
        <button
          type="button"
          aria-label={label}
          aria-current={active ? 'page' : undefined}
          disabled={disabled}
          onClick={onClick}
          style={activeColor ? ({ '--account': activeColor } as CSSProperties) : undefined}
          className={`ease-snappy relative flex h-12 w-12 items-center justify-center transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${shape} ${colors} ${
            activeColor
              ? active
                ? 'bg-[var(--account)] text-white'
                : 'bg-surface hover:bg-[var(--account)]'
              : ''
          }`}
        >
          {children}
          {badge > 0 && (
            <span
              className="bg-danger border-rail absolute -right-1 -bottom-1 flex h-[22px] min-w-[22px] items-center justify-center rounded-full border-4 px-1 text-[11px] leading-none font-bold text-white"
              aria-label={`${badge} novas mensagens`}
            >
              {badge > 99 ? '99+' : badge}
            </span>
          )}
        </button>
      </Tooltip>
    </div>
  );
}

/**
 * Perfil da conta ativa, embaixo do trilho (como o painel de usuário do
 * Discord): foto do Google com a bolinha de status e o emoji do status
 * personalizado. O clique abre o menu de status do próprio Google Chat.
 */
function ProfileButton({
  account,
  onClick,
}: {
  account: AccountView | undefined;
  onClick: () => void;
}) {
  if (!account) return null;
  const name = account.displayName ?? account.name;
  const status = account.statusText ?? (account.presence ? PRESENCE_LABEL[account.presence] : null);
  const emoji = leadingEmoji(account.statusText);
  return (
    <Tooltip label={status ? `${name} · ${status} — Mudar status` : `${name} · Mudar status`}>
      <button
        type="button"
        aria-label={`Mudar status de ${name}${status ? ` (agora: ${status})` : ''}`}
        onClick={onClick}
        className="ring-rail hover:ring-accent relative h-10 w-10 shrink-0 rounded-full ring-2 transition-shadow"
      >
        {account.photo ? (
          <img
            src={account.photo}
            alt=""
            className="h-full w-full rounded-full object-cover"
            draggable={false}
          />
        ) : (
          <span
            className="flex h-full w-full items-center justify-center rounded-full text-sm font-semibold text-white"
            style={{ background: ACCOUNT_COLORS[account.color % ACCOUNT_COLORS.length] }}
          >
            {accountInitials(name)}
          </span>
        )}
        {emoji && (
          <span
            aria-hidden
            className="bg-rail absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full text-[13px] leading-none"
          >
            {emoji}
          </span>
        )}
        {account.presence && <PresenceDot presence={account.presence} />}
      </button>
    </Tooltip>
  );
}
