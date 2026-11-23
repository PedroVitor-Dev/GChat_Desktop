import type { ReactNode } from 'react';
import { Plus, Settings } from 'lucide-react';
import logo from '../../../../resources/icon.png';
import { SHELL_LAYOUT } from '../../../shared/shell';
import { Tooltip } from '../components/Tooltip';

/**
 * Trilho de ícones à esquerda (como a lista de servidores do Discord):
 * conta do Google Chat no topo, espaço para mais contas e configurações embaixo.
 */
export function Rail({
  chatActive,
  settingsActive,
  unread,
  onChat,
  onSettings,
}: {
  chatActive: boolean;
  settingsActive: boolean;
  unread: number;
  onChat: () => void;
  onSettings: () => void;
}) {
  return (
    <nav
      aria-label="Navegação principal"
      className="bg-rail flex shrink-0 flex-col items-center gap-2 pt-1 pb-3"
      style={{ width: SHELL_LAYOUT.railWidth }}
    >
      <RailItem label="Google Chat" active={chatActive} badge={unread} onClick={onChat}>
        <img src={logo} alt="" className="h-8 w-8" draggable={false} />
      </RailItem>

      <div className="bg-line h-0.5 w-8 rounded-full" aria-hidden />

      <RailItem label="Adicionar conta (em breve)" disabled variant="action">
        <Plus size={22} />
      </RailItem>

      <div className="flex-1" />

      <RailItem label="Configurações" active={settingsActive} variant="action" onClick={onSettings}>
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
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  badge?: number;
  disabled?: boolean;
  variant?: 'default' | 'action';
  onClick?: () => void;
  children: ReactNode;
}) {
  const shape = active ? 'rounded-2xl' : 'rounded-3xl hover:rounded-2xl';
  const colors =
    variant === 'action'
      ? active
        ? 'bg-success text-white'
        : 'bg-surface text-success hover:bg-success hover:text-white'
      : active
        ? 'bg-accent'
        : 'bg-surface hover:bg-accent';

  return (
    <div className="group/rail relative flex w-full justify-center">
      {/* Indicador à esquerda: ponto no hover, barra alta quando ativo */}
      <span
        aria-hidden
        className={`bg-header ease-snappy absolute top-1/2 left-0 w-1 -translate-y-1/2 rounded-r-full transition-all duration-200 ${
          active ? 'h-10' : badge > 0 ? 'h-2' : 'h-0 group-hover/rail:h-5'
        }`}
      />
      <Tooltip label={label}>
        <button
          type="button"
          aria-label={label}
          aria-current={active ? 'page' : undefined}
          disabled={disabled}
          onClick={onClick}
          className={`ease-snappy relative flex h-12 w-12 items-center justify-center transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${shape} ${colors}`}
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
