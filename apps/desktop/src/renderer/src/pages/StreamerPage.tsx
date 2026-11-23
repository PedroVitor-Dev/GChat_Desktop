import { Radio } from 'lucide-react';
import { Card } from '../components/Card';
import { SectionTitle, Toggle } from '../components/controls';
import { useSettings } from '../hooks/useSettings';
import { useShellState } from '../hooks/useShellState';

const SUPPORTED = [
  'OBS Studio',
  'Streamlabs',
  'XSplit',
  'Twitch Studio',
  'PRISM Live Studio',
  'vMix',
  'Meld Studio',
];

export function StreamerPage() {
  const [settings, update] = useSettings();
  const shell = useShellState();
  if (!settings || !shell) return null;
  const st = settings.streamer;
  const status = shell.streamer;

  const statusText = status.active
    ? status.reason === 'auto'
      ? `Ativo agora: ${status.apps.join(', ')} detectado.`
      : 'Ativo agora (ligado manualmente).'
    : status.apps.length > 0
      ? `Desligado por você enquanto ${status.apps.join(', ')} estiver aberto.`
      : 'Desligado.';

  return (
    <div>
      <p className="text-interactive mb-6">
        Esconde suas mensagens enquanto você transmite ou grava a tela, para nada aparecer na live.
        Como no Discord, liga sozinho quando um programa de transmissão abre.
      </p>

      <div
        className={`mb-2 flex items-center gap-4 rounded-lg p-4 ${
          status.active ? 'bg-[#593695] text-white' : 'bg-card'
        }`}
      >
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
            status.active ? 'bg-white/20' : 'bg-selected text-interactive'
          }`}
        >
          <Radio size={20} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className={`font-semibold ${status.active ? 'text-white' : 'text-header'}`}>
            Modo streamer
          </p>
          <p className={`text-sm ${status.active ? 'text-white/80' : 'text-muted'}`}>
            {statusText}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void window.gchat.toggleStreamer()}
          className={`h-8 shrink-0 rounded-[3px] px-4 text-sm font-medium transition-colors ${
            status.active
              ? 'bg-white text-[#593695] hover:bg-white/90'
              : 'bg-accent hover:bg-accent-hover text-white'
          }`}
        >
          {status.active ? 'Desligar' : 'Ligar agora'}
        </button>
      </div>

      <SectionTitle>Ativação</SectionTitle>
      <Card>
        <Toggle
          label="Ligar automaticamente"
          description={`Ativa enquanto um destes programas estiver aberto: ${SUPPORTED.join(', ')}.`}
          checked={st.auto}
          onChange={(auto) => update({ streamer: { auto } })}
        />
      </Card>

      <SectionTitle>Enquanto o modo streamer estiver ativo</SectionTitle>
      <Card>
        <Toggle
          label="Pausar notificações"
          description="Nenhum aviso aparece na tela. As mensagens continuam chegando no Chat normalmente."
          checked={st.pauseNotifications}
          onChange={(pauseNotifications) => update({ streamer: { pauseNotifications } })}
        />
        <Toggle
          label="Esconder remetente e mensagem"
          description="Se as notificações não estiverem pausadas, mostram apenas “Você recebeu uma nova mensagem”."
          checked={st.hideContent}
          disabled={st.pauseNotifications}
          onChange={(hideContent) => update({ streamer: { hideContent } })}
        />
        <Toggle
          label="Silenciar sons"
          description="Nenhum som de notificação toca, para não vazar na transmissão."
          checked={st.muteSounds}
          disabled={st.pauseNotifications}
          onChange={(muteSounds) => update({ streamer: { muteSounds } })}
        />
      </Card>

      <p className="text-muted mt-4 text-sm">
        A detecção olha só os nomes dos programas abertos, a cada poucos segundos. Nada é gravado
        nem enviado. Atalho: menu da bandeja → Modo streamer.
      </p>
    </div>
  );
}
