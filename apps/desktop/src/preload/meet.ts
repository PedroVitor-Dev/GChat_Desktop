/**
 * Preload da página do Google Meet (sandbox + contextIsolation).
 *
 * Só para o supressor de ruído opcional: quando ligado, o microfone que o Meet
 * pede passa por um filtro de IA (GTCRN) rodando no próprio computador, e o Meet
 * recebe a faixa já limpa. Nada da tela do Meet é lido ou alterado, e nenhum
 * áudio sai do computador por causa disso.
 */
import { contextBridge, ipcRenderer } from 'electron';
import {
  NOISE_EVENT_OFF,
  NOISE_EVENT_ON,
  NOISE_SET_CHANNEL,
  NOISE_STATE_CHANNEL,
} from '../shared/noise';

const MEET_ORIGIN = 'https://meet.google.com';

if (location.origin === MEET_ORIGIN && window === window.top) {
  // Estado vindo do app → gancho na página (mesma janela, outro "mundo").
  const tell = (enabled: boolean) =>
    window.dispatchEvent(new Event(enabled ? NOISE_EVENT_ON : NOISE_EVENT_OFF));
  void ipcRenderer.invoke(NOISE_STATE_CHANNEL).then((on: unknown) => tell(on === true));
  ipcRenderer.on(NOISE_SET_CHANNEL, (_e, on: unknown) => tell(on === true));

  // Roda no mundo da página antes dos scripts do Meet. Função serializada: não
  // pode usar nada de fora dela (por isso os nomes dos eventos vão como argumentos).
  contextBridge.executeInMainWorld({
    args: [NOISE_EVENT_ON, NOISE_EVENT_OFF],
    func: (eventOn: string, eventOff: string) => {
      const md = navigator.mediaDevices;
      if (!md || typeof md.getUserMedia !== 'function') return;
      const original = md.getUserMedia.bind(md);
      const WORKLET = 'gchat-audio://noise/gtcrn-worklet.js';
      const WASM = 'gchat-audio://noise/gtcrn.wasm';
      const PROCESSOR = '@sapphi-red/web-noise-suppressor/gtcrn';

      let enabled = false;
      const live = new Set<(on: boolean) => void>();
      const setEnabled = (on: boolean) => {
        enabled = on;
        for (const set of live) set(on);
      };
      addEventListener(eventOn, () => setEnabled(true));
      addEventListener(eventOff, () => setEnabled(false));

      let wasm: Promise<ArrayBuffer> | null = null;
      const loadWasm = () =>
        (wasm ??= fetch(WASM).then((r) => {
          if (!r.ok) throw new Error(`wasm ${r.status}`);
          return r.arrayBuffer();
        }));

      md.getUserMedia = async function (constraints?: MediaStreamConstraints) {
        const stream = await original(constraints);
        // Desligado ao pegar o microfone: o Meet recebe o microfone puro (zero custo).
        if (!enabled || !constraints?.audio) return stream;
        const track = stream.getAudioTracks()[0];
        if (!track) return stream;
        try {
          const ctx = new AudioContext({ sampleRate: 48000, latencyHint: 'interactive' });
          await ctx.audioWorklet.addModule(WORKLET);
          const wasmBinary = (await loadWasm()).slice(0);
          const source = ctx.createMediaStreamSource(new MediaStream([track]));
          // Mono de ponta a ponta: o filtro limpa um canal só. Com o microfone em
          // estéreo, o outro canal ficaria mudo (voz pela metade no Meet). Aqui o
          // estéreo vira mono na entrada e a saída mono vale para os dois lados.
          const node = new AudioWorkletNode(ctx, PROCESSOR, {
            channelCount: 1,
            channelCountMode: 'explicit',
            channelInterpretation: 'speakers',
            outputChannelCount: [1],
            processorOptions: { maxChannels: 1, wasmBinary },
          });
          const dest = ctx.createMediaStreamDestination();
          // Liga/desliga ao vivo: com o filtro ou direto para a saída.
          const route = (on: boolean) => {
            try {
              source.disconnect();
              node.disconnect();
            } catch {
              // ainda não conectado
            }
            if (on) {
              source.connect(node);
              node.connect(dest);
            } else source.connect(dest);
          };
          route(true);
          if (ctx.state === 'suspended') void ctx.resume();

          const out = dest.stream.getAudioTracks()[0]!;
          // A faixa limpa se apresenta como o microfone escolhido (nome e ajustes).
          const fwd = out as unknown as Record<string, unknown>;
          fwd['getSettings'] = () => track.getSettings();
          fwd['getCapabilities'] = () => track.getCapabilities();
          fwd['getConstraints'] = () => track.getConstraints();
          fwd['applyConstraints'] = (c?: MediaTrackConstraints) => track.applyConstraints(c);
          Object.defineProperty(out, 'label', { get: () => track.label });

          live.add(route);
          const stopOut = out.stop.bind(out);
          let stopped = false;
          const stopAll = () => {
            if (stopped) return;
            stopped = true;
            live.delete(route);
            stopOut();
            track.stop();
            node.port.postMessage('destroy');
            void ctx.close();
          };
          out.stop = stopAll;
          track.addEventListener('ended', stopAll); // microfone desconectado
          return new MediaStream([out, ...stream.getVideoTracks()]);
        } catch (err) {
          // Qualquer falha: o Meet recebe o microfone puro, a chamada segue.
          console.warn('[GChat Desktop+] supressor de ruído indisponível:', err);
          return stream;
        }
      } as typeof md.getUserMedia;
    },
  });
}
