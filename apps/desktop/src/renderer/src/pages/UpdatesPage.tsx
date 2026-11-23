import { useState } from 'react';
import { AlertCircle, CheckCircle2, Download, Loader2, RefreshCw, Rocket } from 'lucide-react';
import type { UpdateStatus } from '../../../shared/updates';
import { Card } from '../components/Card';
import { Button, SectionTitle, Toggle } from '../components/controls';
import { useSettings } from '../hooks/useSettings';
import { useUpdateStatus } from '../hooks/useUpdateStatus';

const when = (ms?: number) =>
  ms ? new Date(ms).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : null;

export function UpdatesPage() {
  const [settings, update] = useSettings();
  const status = useUpdateStatus();
  const [busy, setBusy] = useState(false);
  if (!settings || !status) return null;

  const check = async () => {
    setBusy(true);
    await window.gchat.updates.check();
    setBusy(false);
  };

  return (
    <div>
      <StatusCard status={status} busy={busy} onCheck={() => void check()} />

      <SectionTitle>Preferências</SectionTitle>
      <Card>
        <Toggle
          label="Atualizar automaticamente"
          description="Procura novas versões ao abrir o app e a cada 6 horas e baixa em segundo plano. Você escolhe quando reiniciar; se sair do app, a atualização é instalada ao fechar."
          checked={settings.updates.auto}
          onChange={(auto) => update({ updates: { auto } })}
        />
      </Card>

      <p className="text-muted mt-4 text-sm">
        As atualizações vêm dos{' '}
        <a
          href="https://github.com/PedroVitor-Dev/GChat_Desktop/releases"
          target="_blank"
          rel="noreferrer"
          className="text-accent hover:underline"
        >
          Releases oficiais no GitHub
        </a>{' '}
        e têm a integridade conferida (SHA-512) antes de instalar. Suas configurações, sons e logins
        são mantidos.
      </p>
    </div>
  );
}

function StatusCard({
  status,
  busy,
  onCheck,
}: {
  status: UpdateStatus;
  busy: boolean;
  onCheck: () => void;
}) {
  const { updates } = window.gchat;
  const checked = when(status.checkedAt);

  const view = (() => {
    switch (status.state) {
      case 'unsupported':
        return {
          icon: <AlertCircle size={22} />,
          tone: 'muted',
          title: 'Disponível no app instalado',
          text: 'Esta é a versão de desenvolvimento, que não se atualiza sozinha.',
        };
      case 'checking':
        return {
          icon: <Loader2 size={22} className="animate-spin" />,
          tone: 'muted',
          title: 'Procurando atualizações…',
          text: 'Consultando os Releases do GitHub.',
        };
      case 'not-available':
        return {
          icon: <CheckCircle2 size={22} />,
          tone: 'success',
          title: 'Você está na versão mais recente',
          text: checked ? `Última verificação: ${checked}.` : '',
        };
      case 'available':
        return {
          icon: <Download size={22} />,
          tone: 'accent',
          title: `Versão ${status.version} disponível`,
          text: 'Baixe agora; você escolhe quando reiniciar.',
        };
      case 'downloading':
        return {
          icon: <Loader2 size={22} className="animate-spin" />,
          tone: 'accent',
          title: `Baixando a versão ${status.version ?? ''}…`,
          text: `${status.percent ?? 0}% concluído. Pode continuar usando o app.`,
        };
      case 'downloaded':
        return {
          icon: <Rocket size={22} />,
          tone: 'success',
          title: `Versão ${status.version} pronta para instalar`,
          text: 'Reinicie para atualizar; leva poucos segundos.',
        };
      case 'error':
        return {
          icon: <AlertCircle size={22} />,
          tone: 'danger',
          title: 'Não foi possível atualizar',
          text: status.error ?? '',
        };
      default:
        return {
          icon: <RefreshCw size={22} />,
          tone: 'muted',
          title: 'Atualizações',
          text: checked ? `Última verificação: ${checked}.` : 'Ainda não verificado nesta sessão.',
        };
    }
  })();

  const toneClass = {
    muted: 'bg-selected text-interactive',
    success: 'bg-success/15 text-success',
    accent: 'bg-accent/15 text-accent',
    danger: 'bg-danger/15 text-danger',
  }[view.tone as 'muted' | 'success' | 'accent' | 'danger'];

  return (
    <div className="bg-card rounded-lg p-5">
      <div className="flex items-start gap-4">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${toneClass}`}
        >
          {view.icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-muted text-xs font-bold tracking-wide uppercase">
            Versão instalada: {status.currentVersion}
          </p>
          <p className="text-header mt-1 font-semibold">{view.title}</p>
          {view.text && <p className="text-interactive mt-0.5 text-sm">{view.text}</p>}
        </div>
      </div>

      {status.state === 'downloading' && (
        <div className="bg-field mt-4 h-2 overflow-hidden rounded-full" aria-hidden>
          <div
            className="bg-accent h-full rounded-full transition-[width] duration-300"
            style={{ width: `${status.percent ?? 0}%` }}
          />
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {status.state === 'downloaded' ? (
          <Button variant="primary" onClick={() => void updates.install()}>
            Reiniciar e atualizar
          </Button>
        ) : status.state === 'available' ? (
          <Button variant="primary" onClick={() => void updates.download()}>
            Baixar atualização
          </Button>
        ) : null}
        {status.state !== 'unsupported' &&
          status.state !== 'downloading' &&
          status.state !== 'downloaded' && (
            <Button onClick={onCheck}>
              <span className="inline-flex items-center gap-1.5">
                <RefreshCw
                  size={14}
                  aria-hidden
                  className={busy || status.state === 'checking' ? 'animate-spin' : ''}
                />
                Buscar atualizações
              </span>
            </Button>
          )}
      </div>
    </div>
  );
}
