import { useId, useState } from 'react';
import { inputClass } from './controls';

/**
 * Como o usuário costuma ser citado (palavras separadas por vírgula).
 * Salva ao sair do campo ou com Enter. Use `key` no pai para ressincronizar
 * quando a lista mudar por fora.
 */
export function KeywordsInput({
  keywords,
  onChange,
}: {
  keywords: string[];
  onChange: (keywords: string[]) => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState(keywords.join(', '));
  const commit = () =>
    onChange(
      draft
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean),
    );

  return (
    <div className="border-line border-b py-4">
      <label htmlFor={id} className="text-header block font-medium">
        Como citam você
      </label>
      <p className="text-muted mt-1 mb-2 text-sm">
        O Google Chat não marca menções na notificação. Vazio: qualquer <code>@nome</code> na
        mensagem conta como menção. Para ser preciso, informe como costumam citar você, separado por
        vírgulas (ex.: <code>@Pedro, Pedro Vitor</code>). Maiúsculas e acentos não importam.
      </p>
      <input
        id={id}
        value={draft}
        placeholder="Vazio = qualquer @menção"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && commit()}
        className={`${inputClass} w-full`}
      />
    </div>
  );
}
