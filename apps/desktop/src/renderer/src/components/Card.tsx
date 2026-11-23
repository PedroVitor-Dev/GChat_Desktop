import type { ReactNode } from 'react';

export function Card({ children }: { children: ReactNode }) {
  return (
    <section className="bg-card border-line rounded-lg border p-5 shadow-sm">{children}</section>
  );
}
