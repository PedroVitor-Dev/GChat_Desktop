import { ACCOUNT_COLORS, accountInitials } from '../../../shared/accounts';

/** Iniciais sobre a cor da conta (como servidores sem ícone no Discord). */
export function AccountAvatar({
  name,
  color,
  size = 48,
  className = '',
}: {
  name: string;
  color: number;
  size?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center font-semibold text-white select-none ${className}`}
      style={{
        width: size,
        height: size,
        background: ACCOUNT_COLORS[color % ACCOUNT_COLORS.length],
        fontSize: Math.round(size * 0.36),
      }}
    >
      {accountInitials(name)}
    </span>
  );
}
