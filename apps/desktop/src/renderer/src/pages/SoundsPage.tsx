import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Play, Plus, Trash2, Upload } from 'lucide-react';
import type { SoundId, SoundOption } from '../../../shared/sounds';
import { Card } from '../components/Card';
import { Button, SectionTitle, SettingRow, Toggle, inputClass } from '../components/controls';
import { KeywordsInput } from '../components/KeywordsInput';
import { useSettings } from '../hooks/useSettings';

function useSoundOptions(): [SoundOption[], () => void] {
  const [options, setOptions] = useState<SoundOption[]>([]);
  const reload = useCallback(() => {
    void window.gchat.getSoundOptions().then(setOptions);
  }, []);
  useEffect(reload, [reload]);
  return [options, reload];
}

export function SoundsPage() {
  const [settings, update] = useSettings();
  const [options, reloadOptions] = useSoundOptions();
  const [recent, setRecent] = useState<string[]>([]);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  // A biblioteca muda quando um som é importado/removido: recarrega as opções.
  const libraryKey = settings?.sounds.library.map((s) => s.id).join();
  useEffect(reloadOptions, [libraryKey, reloadOptions]);
  useEffect(() => {
    void window.gchat.getRecentConversations().then(setRecent);
  }, []);

  if (!settings) return null;
  const s = settings.sounds;
  const preview = (id: SoundId) => void window.gchat.previewSound(id);

  const importSound = async () => {
    setMessage(null);
    const result = await window.gchat.importSound();
    if (!result) return;
    setMessage(
      result.ok
        ? { kind: 'ok', text: `“${result.sound.name}” foi importado.` }
        : { kind: 'error', text: result.error },
    );
  };

  const setConversationSound = (key: string, id: SoundId | null) => {
    const next = { ...s.conversationSounds };
    if (id) next[key] = id;
    else delete next[key];
    update({ sounds: { conversationSounds: next } });
  };

  const configured = Object.keys(s.conversationSounds);
  const available = recent.filter((r) => !configured.includes(r));

  return (
    <div className="max-w-2xl">
      <SectionTitle>Geral</SectionTitle>
      <Card>
        <Toggle
          label="Tocar sons"
          description="Desligado: as notificações continuam aparecendo, só que em silêncio."
          checked={s.enabled}
          onChange={(enabled) => update({ sounds: { enabled } })}
        />
        <SettingRow
          label="Volume"
          description="Vale para os sons do app. O som do Windows segue o volume do sistema."
        >
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={s.volume}
              disabled={!s.enabled}
              aria-label="Volume"
              onChange={(e) => update({ sounds: { volume: Number(e.target.value) } })}
              onPointerUp={() => preview(s.defaultSound)}
              className="accent-accent w-40 disabled:opacity-40"
            />
            <span className="w-10 text-right tabular-nums">{s.volume}%</span>
          </div>
        </SettingRow>
        <SoundPicker
          label="Som padrão"
          value={s.defaultSound}
          options={options}
          disabled={!s.enabled}
          onChange={(defaultSound) => update({ sounds: { defaultSound } })}
          onPreview={preview}
        />
        <SoundPicker
          label="Som de menções"
          description="Toca quando a mensagem cita você. Tem prioridade sobre o som da conversa."
          value={s.mentionSound}
          options={options}
          disabled={!s.enabled}
          allowDefault
          onChange={(mentionSound) => update({ sounds: { mentionSound } })}
          onPreview={preview}
        />
        {s.mentionSound && (
          <KeywordsInput
            key={settings.notifications.mentions.keywords.join(',')}
            keywords={settings.notifications.mentions.keywords}
            onChange={(keywords) => update({ notifications: { mentions: { keywords } } })}
          />
        )}
      </Card>

      <SectionTitle>Sons por conversa</SectionTitle>
      <Card>
        {configured.length === 0 && available.length === 0 && (
          <p className="text-muted">
            Depois de receber mensagens, as conversas aparecem aqui para você escolher um som
            exclusivo para cada uma.
          </p>
        )}
        {configured.map((key) => (
          <SoundPicker
            key={key}
            label={key}
            value={s.conversationSounds[key] ?? null}
            options={options}
            disabled={!s.enabled}
            allowDefault
            onChange={(id) => setConversationSound(key, id)}
            onPreview={preview}
          />
        ))}
        {available.length > 0 && (
          <div className="pt-3">
            <p className="text-muted mb-2 text-xs">Conversas recentes</p>
            <div className="flex flex-wrap gap-2">
              {available.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setConversationSound(key, s.defaultSound)}
                  className="bg-selected text-interactive hover:text-header inline-flex items-center gap-1 rounded-full px-3 py-1 text-[13px]"
                >
                  <Plus size={13} aria-hidden /> {key}
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>

      <SectionTitle>Sons importados</SectionTitle>
      <Card>
        <ul>
          {options
            .filter((o) => o.kind === 'custom')
            .map((o) => (
              <li
                key={o.id}
                className="border-line flex items-center justify-between gap-4 border-b py-2.5 last:border-b-0"
              >
                <span className="truncate select-text">{o.label}</span>
                <span className="flex shrink-0 gap-2">
                  <IconButton label={`Ouvir ${o.label}`} onClick={() => preview(o.id)}>
                    <Play size={14} />
                  </IconButton>
                  <IconButton
                    label={`Remover ${o.label}`}
                    onClick={() => void window.gchat.removeSound(o.id)}
                  >
                    <Trash2 size={14} />
                  </IconButton>
                </span>
              </li>
            ))}
        </ul>
        <div className="flex items-center gap-3 pt-3">
          <Button onClick={() => void importSound()}>
            <span className="inline-flex items-center gap-1.5">
              <Upload size={14} aria-hidden /> Importar som…
            </span>
          </Button>
          <p className="text-muted text-xs">MP3, WAV ou OGG · até 5 MB e 15 segundos</p>
        </div>
        {message && (
          <p
            role="status"
            className={`mt-3 text-[13px] ${message.kind === 'error' ? 'text-danger' : 'text-muted'}`}
          >
            {message.text}
          </p>
        )}
      </Card>
    </div>
  );
}

const DEFAULT_OPTION = '__default__';

function SoundPicker<Nullable extends boolean = false>({
  label,
  description,
  value,
  options,
  disabled,
  allowDefault,
  onChange,
  onPreview,
}: {
  label: string;
  description?: string;
  value: SoundId | null;
  options: SoundOption[];
  disabled?: boolean;
  allowDefault?: Nullable;
  onChange: (id: Nullable extends true ? SoundId | null : SoundId) => void;
  onPreview: (id: SoundId) => void;
}) {
  const groups: [string, SoundOption['kind']][] = [
    ['Geral', 'special'],
    ['Do app', 'builtin'],
    ['Importados', 'custom'],
  ];
  return (
    <SettingRow label={label} {...(description ? { description } : {})}>
      <div className="flex items-center gap-2">
        <select
          value={value ?? DEFAULT_OPTION}
          disabled={disabled}
          aria-label={label}
          onChange={(e) => {
            const v = e.target.value;
            (onChange as (id: SoundId | null) => void)(
              v === DEFAULT_OPTION ? null : (v as SoundId),
            );
          }}
          className={`${inputClass} w-52`}
        >
          {allowDefault && <option value={DEFAULT_OPTION}>Igual ao som padrão</option>}
          {groups.map(([groupLabel, kind]) => {
            const items = options.filter((o) => o.kind === kind);
            return items.length === 0 ? null : (
              <optgroup key={kind} label={groupLabel}>
                {items.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </optgroup>
            );
          })}
        </select>
        <IconButton
          label={`Ouvir ${label}`}
          disabled={disabled || value === 'none'}
          onClick={() => value && onPreview(value)}
        >
          <Play size={14} />
        </IconButton>
      </div>
    </SettingRow>
  );
}

function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean | undefined;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="bg-selected text-interactive hover:text-header rounded-[3px] p-1.5 disabled:opacity-40"
    >
      {children}
    </button>
  );
}
