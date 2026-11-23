import type { ReactNode } from 'react';

/** Balão escuro à direita do elemento, como os do trilho do Discord. */
export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="group/tip relative flex justify-center">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute top-1/2 left-full z-50 ml-4 -translate-y-1/2 scale-95 rounded-md bg-[#111214] px-3 py-2 text-sm font-semibold whitespace-nowrap text-[#dbdee1] opacity-0 shadow-lg transition-all duration-100 group-hover/tip:scale-100 group-hover/tip:opacity-100"
      >
        <span className="absolute top-1/2 -left-1 h-2 w-2 -translate-y-1/2 rotate-45 bg-[#111214]" />
        {label}
      </span>
    </div>
  );
}
