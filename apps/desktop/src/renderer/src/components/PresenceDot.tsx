import { PRESENCE_LABEL, type ChatPresence } from '../../../shared/profile';

/** Cores de presença no padrão do Discord. */
export const PRESENCE_COLOR: Record<ChatPresence, string> = {
  active: '#23a55a',
  away: '#f0b232',
  dnd: '#f23f43',
  offline: '#80848e',
};

/**
 * Bolinha de presença no canto da foto (Ativo, Ausente, Não perturbe), com o
 * contorno da cor do fundo para "recortar" a foto, como no Discord.
 */
export function PresenceDot({
  presence,
  ring = 'var(--color-rail)',
  size = 14,
}: {
  presence: ChatPresence;
  ring?: string;
  size?: number;
}) {
  return (
    <span
      role="img"
      aria-label={PRESENCE_LABEL[presence]}
      className="absolute -right-0.5 -bottom-0.5 flex items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        background: PRESENCE_COLOR[presence],
        boxShadow: `0 0 0 3px ${ring}`,
      }}
    >
      {presence === 'dnd' && (
        <span
          className="block rounded-full"
          style={{ width: size * 0.55, height: size * 0.18, background: ring }}
        />
      )}
      {presence === 'away' && (
        <span
          className="block rounded-full"
          style={{
            width: size * 0.5,
            height: size * 0.5,
            background: ring,
            transform: `translate(-${size * 0.18}px, -${size * 0.18}px)`,
          }}
        />
      )}
      {presence === 'offline' && (
        <span
          className="block rounded-full"
          style={{ width: size * 0.4, height: size * 0.4, background: ring }}
        />
      )}
    </span>
  );
}
