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
    <div className="border-line flex items-center justify-between gap-6 border-b py-4 last:border-b-0">
      <div className="min-w-0">
        <label htmlFor={htmlFor} className="text-header block font-medium">
          {label}
        </label>
        {description && <p className="text-muted mt-1 text-sm">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

/** Interruptor estilo Discord: verde quando ligado, com ícone no botão. */
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
        className={`ease-snappy relative h-6 w-10 rounded-full transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-40 ${
          checked ? 'bg-success' : 'bg-switch-off'
        }`}
      >
        <span
          className={`ease-snappy absolute top-[3px] flex h-[18px] w-[18px] items-center justify-center rounded-full bg-white transition-all duration-200 ${
            checked ? 'left-[19px]' : 'left-[3px]'
          }`}
        >
          <svg viewBox="0 0 20 20" className="h-3 w-3" aria-hidden>
            {checked ? (
              <path
                d="M5 10.5l3.2 3L15 6.5"
                fill="none"
                stroke="var(--color-success)"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : (
              <path
                d="M6 6l8 8M14 6l-8 8"
                stroke="var(--color-switch-off)"
                strokeWidth="2.6"
                strokeLinecap="round"
              />
            )}
          </svg>
        </span>
        <span className="sr-only">{checked ? 'Ativado' : 'Desativado'}</span>
      </button>
    </SettingRow>
  );
}

const fieldClass =
  'bg-field text-ink rounded-[3px] px-2.5 py-2 outline-none transition-shadow focus:ring-2 focus:ring-accent disabled:opacity-40';

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
        className={`${fieldClass} [color-scheme:dark] [.theme-light_&]:[color-scheme:light]`}
      />
    </SettingRow>
  );
}

export const inputClass = fieldClass;

export function Button({
  children,
  onClick,
  variant = 'secondary',
}: {
  children: ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
}) {
  const styles = {
    primary: 'bg-accent hover:bg-accent-hover text-white',
    secondary: 'bg-selected hover:bg-switch-off/60 text-header',
    danger: 'bg-danger hover:brightness-90 text-white',
  }[variant];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-8 rounded-[3px] px-4 text-sm font-medium transition-colors duration-150 ${styles}`}
    >
      {children}
    </button>
  );
}

/** Título de grupo em caixa alta, como nas configurações do Discord. */
export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-muted mt-8 mb-2 text-xs font-bold tracking-wide uppercase first:mt-0">
      {children}
    </h2>
  );
}
