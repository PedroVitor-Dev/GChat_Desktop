import { useEffect, useState } from 'react';
import { BellOff, Bell } from 'lucide-react';
import { Card } from '../components/Card';
import { Button, SectionTitle, TimeInput, Toggle } from '../components/controls';
import { useSettings } from '../hooks/useSettings';

export function NotificationsPage() {
  const [settings, update] = useSettings();
  const [recent, setRecent] = useState<string[]>([]);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    void window.gchat.getRecentConversations().then(setRecent);
  }, [settings]);

  if (!settings) return null;
  const n = settings.notifications;
  const muted = n.mutedConversations;
  const unmutedRecent = recent.filter((r) => !muted.includes(r));

  const test = async () => {
    const ok = await window.gchat.testNotification();
    setTestResult(
      ok
        ? 'Notificação enviada. Se não apareceu, verifique Configurações do Windows > Sistema > Notificações.'
        : 'Este sistema não suporta notificações nativas.',
    );
  };

  return (
    <div className="max-w-2xl">
      <SectionTitle>Geral</SectionTitle>
      <Card>
        <Toggle
          label="Mostrar notificações"
          description="Avisos do Windows para novas mensagens do Google Chat."
          checked={n.enabled}
          onChange={(enabled) => update({ notifications: { enabled } })}
        />
        <Toggle
          label="Som do Windows"
          description="Sons personalizados por conversa chegam na próxima versão."
          checked={n.systemSound}
          disabled={!n.enabled}
          onChange={(systemSound) => update({ notifications: { systemSound } })}
        />
        <div className="flex items-center gap-3 pt-3">
          <Button onClick={() => void test()}>Testar notificação</Button>
          {testResult && <p className="text-muted text-xs">{testResult}</p>}
        </div>
      </Card>

      <SectionTitle>Horário de silêncio</SectionTitle>
      <Card>
        <Toggle
          label="Silenciar em um horário"
          description="Nenhum aviso é exibido nesse intervalo. Pode atravessar a meia-noite."
          checked={n.quietHours.enabled}
          onChange={(enabled) => update({ notifications: { quietHours: { enabled } } })}
        />
        <TimeInput
          label="Início"
          value={n.quietHours.start}
          disabled={!n.quietHours.enabled}
          onChange={(start) =>
            update({ notifications: { quietHours: { start: start as `${number}:${number}` } } })
          }
        />
        <TimeInput
          label="Fim"
          value={n.quietHours.end}
          disabled={!n.quietHours.enabled}
          onChange={(end) =>
            update({ notifications: { quietHours: { end: end as `${number}:${number}` } } })
          }
        />
      </Card>

      <SectionTitle>Conversas silenciadas</SectionTitle>
      <Card>
        {muted.length === 0 && unmutedRecent.length === 0 && (
          <p className="text-muted">
            Use o botão <strong>Silenciar conversa</strong> em uma notificação, ou volte aqui depois
            de receber mensagens para escolher quais silenciar.
          </p>
        )}
        <ul>
          {muted.map((key) => (
            <ConversationRow
              key={key}
              name={key}
              muted
              onToggle={() =>
                update({ notifications: { mutedConversations: muted.filter((m) => m !== key) } })
              }
            />
          ))}
          {unmutedRecent.map((key) => (
            <ConversationRow
              key={key}
              name={key}
              muted={false}
              onToggle={() => update({ notifications: { mutedConversations: [...muted, key] } })}
            />
          ))}
        </ul>
        {(muted.length > 0 || unmutedRecent.length > 0) && (
          <p className="text-muted pt-3 text-xs">
            A conversa é identificada pelo nome exibido. Se o espaço for renomeado, silencie de
            novo.
          </p>
        )}
      </Card>
    </div>
  );
}

function ConversationRow({
  name,
  muted,
  onToggle,
}: {
  name: string;
  muted: boolean;
  onToggle: () => void;
}) {
  const Icon = muted ? BellOff : Bell;
  return (
    <li className="border-line flex items-center justify-between gap-4 border-b py-2.5 last:border-b-0">
      <span className="flex min-w-0 items-center gap-2">
        <Icon size={15} className={muted ? 'text-muted' : ''} aria-hidden />
        <span className="truncate select-text">{name}</span>
        {!muted && <span className="text-muted text-xs">recente</span>}
      </span>
      <Button onClick={onToggle}>{muted ? 'Reativar' : 'Silenciar'}</Button>
    </li>
  );
}
