/**
 * Player de sons (janela oculta). Web Audio: decodifica uma vez, guarda em cache
 * e toca com ganho controlado. Nada aqui acessa rede ou disco.
 */
import {
  MAX_PLAY_SECONDS,
  type PlayRequest,
  type ProbeRequest,
  type ProbeResult,
} from '../../shared/audio';

interface AudioHost {
  onPlay(listener: (req: PlayRequest) => void): void;
  onProbe(listener: (req: ProbeRequest) => void): void;
  probeResult(result: ProbeResult): void;
}

const host = (window as unknown as { audioHost: AudioHost }).audioHost;
const context = new AudioContext();
const cache = new Map<string, AudioBuffer>();
const MAX_CACHE = 30;

/** decodeAudioData consome o buffer: sempre trabalha numa cópia. */
const decode = (bytes: Uint8Array) => context.decodeAudioData(bytes.slice().buffer);

host.onPlay(async ({ key, bytes, volume }) => {
  try {
    if (context.state === 'suspended') await context.resume();
    let buffer = cache.get(key);
    if (!buffer) {
      buffer = await decode(bytes);
      cache.set(key, buffer);
      if (cache.size > MAX_CACHE) cache.delete(cache.keys().next().value!);
    }
    const source = context.createBufferSource();
    const gain = context.createGain();
    // Curva quadrática: o controle de volume soa mais natural ao ouvido.
    gain.gain.value = (Math.min(100, Math.max(0, volume)) / 100) ** 2;
    source.buffer = buffer;
    source.connect(gain).connect(context.destination);
    source.start();
    source.stop(context.currentTime + MAX_PLAY_SECONDS);
  } catch {
    cache.delete(key); // o main volta para o som padrão na próxima vez
  }
});

host.onProbe(async ({ requestId, bytes }) => {
  try {
    const buffer = await decode(bytes);
    host.probeResult({ requestId, ok: true, seconds: buffer.duration });
  } catch {
    host.probeResult({ requestId, ok: false });
  }
});
