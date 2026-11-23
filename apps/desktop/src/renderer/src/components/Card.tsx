import type { ReactNode } from 'react';

/** Grupo de configurações (fundo levemente destacado, sem borda). */
export function Card({ children }: { children: ReactNode }) {
  return <section className="bg-card rounded-lg px-4 py-1">{children}</section>;
}
