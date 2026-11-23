import { useId, type ReactNode } from 'react';

/** Linha de configuração: rótulo + descrição à esquerda, controle à direita. */
export function SettingRow({
  label,
  description,
  htmlFor,
  children,
}: {
  label: string;
  description?: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="border-line flex items-center justify-between gap-6 border-b py-3 last:border-b-0">
      <div>
        <label htmlFor={htmlFor} className="block">
          {label}
        </label>
        {description && <p className="text-muted mt-0.5 text-xs">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

/** Interruptor no estilo Windows 11. */
export function Toggle({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  const id = useId();
  return (
    <SettingRow label={label} {...(description ? { description } : {})} htmlFor={id}>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-10 rounded-full border transition-colors duration-150 disabled:opacity-40 ${
          checked ? 'bg-accent border-accent' : 'border-muted bg-transparent'
        }`}
      >
        <span
          className={`absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full transition-all duration-150 ${
            checked ? 'left-[22px] bg-white' : 'bg-muted left-[4px]'
          }`}
        />
        <span className="sr-only">{checked ? 'Ativado' : 'Desativado'}</span>
      </button>
    </SettingRow>
  );
}

export function TimeInput({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <SettingRow label={label} htmlFor={id}>
      <input
        id={id}
        type="time"
        value={value}
        disabled={disabled}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        className="bg-surface border-line focus:border-accent rounded-md border px-2 py-1 outline-none disabled:opacity-40"
      />
    </SettingRow>
  );
}

export function Button({
  children,
  onClick,
  variant = 'secondary',
}: {
  children: ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}) {
  const styles =
    variant === 'primary'
      ? 'bg-accent text-white hover:opacity-90'
      : 'bg-surface border-line border hover:bg-line/60';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-[13px] transition-colors duration-150 ${styles}`}
    >
      {children}
    </button>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="mt-6 mb-2 text-sm font-semibold first:mt-0">{children}</h2>;
}
