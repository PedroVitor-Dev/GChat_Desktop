import { useEffect, useState } from 'react';
import { Info } from 'lucide-react';
import type { AutostartStatus } from '../../../shared/ipc';
import { Card } from '../components/Card';
import { SectionTitle, Toggle } from '../components/controls';
import { useSettings } from '../hooks/useSettings';

export function GeneralPage() {
  const [settings, update] = useSettings();
  const [autostart, setAutostart] = useState<AutostartStatus | null>(null);

  useEffect(() => {
    void window.gchat.getAutostartStatus().then(setAutostart);
  }, [settings?.general.launchAtLogin]);

  if (!settings) return null;
  const g = settings.general;
  const unsupported = autostart !== null && !autostart.supported;
  // Ligado aqui, mas o Windows não vai abrir (desativado no Gerenciador de Tarefas).
  const blockedByWindows = autostart?.supported && g.launchAtLogin && !autostart.active;

  return (
    <div>
      <SectionTitle>Inicialização</SectionTitle>
      <Card>
        <Toggle
          label="Abrir com o Windows"
          description="O GChat Desktop+ abre sozinho quando você entra no Windows."
          checked={g.launchAtLogin}
          disabled={unsupported}
          onChange={(launchAtLogin) => update({ general: { launchAtLogin } })}
        />
        <Toggle
          label="Iniciar minimizado na bandeja"
          description="Ao abrir com o Windows, fica só na bandeja, sem mostrar a janela. As notificações funcionam normalmente."
          checked={g.startMinimized}
          disabled={!g.launchAtLogin || unsupported}
          onChange={(startMinimized) => update({ general: { startMinimized } })}
        />
        {(unsupported || blockedByWindows) && (
          <p className="text-muted flex gap-2 py-3 text-sm">
            <Info size={16} className="mt-0.5 shrink-0" aria-hidden />
            {unsupported
              ? autostart?.reason === 'store'
                ? 'Ainda não disponível na versão da Microsoft Store. Use o instalador do site se precisar abrir o app com o Windows.'
                : 'Disponível no app instalado. Na versão de desenvolvimento o Windows abriria o Electron genérico.'
              : 'O Windows está bloqueando a inicialização automática. Ative o GChat Desktop+ em Gerenciador de Tarefas → Aplicativos de inicialização.'}
          </p>
        )}
      </Card>

      <SectionTitle>Janela</SectionTitle>
      <Card>
        <Toggle
          label="Fechar minimiza para a bandeja"
          description="O ✕ esconde a janela e o app continua avisando sobre novas mensagens. Para sair de vez, use “Sair” no ícone da bandeja ou Ctrl + Q."
          checked={g.closeToTray}
          onChange={(closeToTray) => update({ general: { closeToTray } })}
        />
      </Card>

      <p className="text-muted mt-4 text-sm">
        Com o app totalmente fechado, não há como receber notificações: o Google Chat precisa estar
        aberto (mesmo que só na bandeja).
      </p>
    </div>
  );
}
