import type { CSSProperties } from 'react';

/**
 * Símbolos da marca flutuando no fundo (ex.: as moedas "$" do tema Cibus).
 * Ficam atrás do trilho e da barra de título; o Chat cobre o centro. Só CSS
 * (transform/opacity, na GPU) e desligado com "reduzir movimento" do Windows.
 */

/** Moedas subindo pelo trilho: posição, tamanho, tempo e balanço (fixos, sem sorteio). */
const RISING = [
  { left: 8, size: 22, duration: 19, delay: 0, sway: 10, opacity: 0.55 },
  { left: 40, size: 16, duration: 23, delay: 4, sway: -8, opacity: 0.4 },
  { left: 22, size: 28, duration: 27, delay: 9, sway: 12, opacity: 0.35 },
  { left: 46, size: 20, duration: 21, delay: 13, sway: -12, opacity: 0.5 },
  { left: 4, size: 14, duration: 17, delay: 16, sway: 8, opacity: 0.45 },
  { left: 30, size: 18, duration: 25, delay: 20, sway: -10, opacity: 0.4 },
  { left: 14, size: 24, duration: 29, delay: 24, sway: 9, opacity: 0.3 },
];

/** Moedas atravessando a barra de título. */
const DRIFTING = [
  { top: 6, size: 14, duration: 38, delay: 2, opacity: 0.35 },
  { top: 12, size: 11, duration: 46, delay: 18, opacity: 0.3 },
  { top: 4, size: 16, duration: 52, delay: 31, opacity: 0.25 },
];

export function ThemeParticles({ mark, color }: { mark: string; color: string }) {
  return (
    <div className="theme-particles" aria-hidden>
      {RISING.map((c, i) => (
        <Coin
          key={`r${i}`}
          mark={mark}
          color={color}
          size={c.size}
          className="coin-rise"
          style={
            {
              left: c.left,
              bottom: -c.size,
              animationDuration: `${c.duration}s`,
              animationDelay: `${c.delay}s`,
              '--sway': `${c.sway}px`,
              '--coin-opacity': c.opacity,
            } as CSSProperties
          }
        />
      ))}
      {DRIFTING.map((c, i) => (
        <Coin
          key={`d${i}`}
          mark={mark}
          color={color}
          size={c.size}
          className="coin-drift"
          style={
            {
              top: c.top,
              left: -c.size,
              animationDuration: `${c.duration}s`,
              animationDelay: `${c.delay}s`,
              '--coin-opacity': c.opacity,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

/** Moeda no estilo do logo: círculo colorido, anel branco por dentro e o símbolo. */
function Coin({
  mark,
  color,
  size,
  className,
  style,
}: {
  mark: string;
  color: string;
  size: number;
  className: string;
  style: CSSProperties;
}) {
  return (
    <span
      className={`coin ${className}`}
      style={{
        ...style,
        width: size,
        height: size,
        background: color,
        fontSize: size * 0.62,
        boxShadow: `inset 0 0 0 ${Math.max(1, size * 0.07)}px ${color}, inset 0 0 0 ${Math.max(2, size * 0.13)}px #ffffff`,
      }}
    >
      {mark}
    </span>
  );
}
