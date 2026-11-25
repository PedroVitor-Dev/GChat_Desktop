import type { CSSProperties } from 'react';

/**
 * Bolinhas do tema flutuando no fundo (ex.: as esferas de metal do Iron Ball).
 * Ficam atrás do trilho e da barra de título; o Chat cobre o centro. Só CSS
 * (transform/opacity, na GPU) e desligado com "reduzir movimento" do Windows.
 */

/** Bolinhas subindo pelo trilho: posição, tamanho, tempo e balanço (fixos, sem sorteio). */
const RISING = [
  { left: 8, size: 22, duration: 19, delay: 0, sway: 10, opacity: 0.7 },
  { left: 40, size: 16, duration: 23, delay: 4, sway: -8, opacity: 0.55 },
  { left: 22, size: 28, duration: 27, delay: 9, sway: 12, opacity: 0.5 },
  { left: 46, size: 20, duration: 21, delay: 13, sway: -12, opacity: 0.65 },
  { left: 4, size: 14, duration: 17, delay: 16, sway: 8, opacity: 0.6 },
  { left: 30, size: 18, duration: 25, delay: 20, sway: -10, opacity: 0.55 },
  { left: 14, size: 24, duration: 29, delay: 24, sway: 9, opacity: 0.45 },
];

/** Bolinhas atravessando a barra de título. */
const DRIFTING = [
  { top: 6, size: 14, duration: 38, delay: 2, opacity: 0.5 },
  { top: 12, size: 11, duration: 46, delay: 18, opacity: 0.45 },
  { top: 4, size: 16, duration: 52, delay: 31, opacity: 0.4 },
];

export function ThemeParticles({ background }: { background: string }) {
  return (
    <div className="theme-particles" aria-hidden>
      {RISING.map((c, i) => (
        <Ball
          key={`r${i}`}
          background={background}
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
        <Ball
          key={`d${i}`}
          background={background}
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

/** Esfera de metal: o fundo do tema (brilho e reflexo) com sombra embaixo. */
function Ball({
  background,
  size,
  className,
  style,
}: {
  background: string;
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
        background,
        boxShadow: `0 ${Math.max(1, size * 0.12)}px ${Math.max(2, size * 0.25)}px rgba(0, 0, 0, 0.45)`,
      }}
    />
  );
}
