import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Play, Square } from 'lucide-react';
import { GtcrnWorkletNode, loadGtcrn } from '@sapphi-red/web-noise-suppressor';
import gtcrnWorkletUrl from '@sapphi-red/web-noise-suppressor/gtcrnWorklet.js?url';
import gtcrnWasmUrl from '@sapphi-red/web-noise-suppressor/gtcrn.wasm?url';
import { Button } from './controls';

const SECONDS = 5;
const SILENT_DB = -90;

type Take = { raw: string; clean: string; noiseCut: number; voiceKept: number };
type Phase =
  | { kind: 'idle' }
  | { kind: 'recording'; left: number }
  | { kind: 'done'; take: Take }
  | { kind: 'silent' }
  | { kind: 'error'; message: string };

const db = (rms: number) => 20 * Math.log10(rms + 1e-9);
const percentile = (values: number[], p: number) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))] ?? -180;
};

/**
 * "Testar microfone", como o do Discord: grava alguns segundos do microfone,
 * puro e pelo supressor de ruído ao mesmo tempo, para ouvir a diferença.
 * A gravação fica só na memória e some ao sair da tela.
 */
export function MicTest() {
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [level, setLevel] = useState(0);
  const urls = useRef<string[]>([]);
  const stopRef = useRef<(() => void) | null>(null);

  // Ao sair da tela: para a gravação e libera os áudios da memória.
  useEffect(
    () => () => {
      stopRef.current?.();
      for (const u of urls.current) URL.revokeObjectURL(u);
    },
    [],
  );

  const start = async () => {
    for (const u of urls.current.splice(0)) URL.revokeObjectURL(u);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        // O mesmo tratamento das chamadas: eco cancelado; o ruído, só pelo filtro.
        audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: true },
      });
    } catch {
      setPhase({
        kind: 'error',
        message:
          'Não foi possível usar o microfone. Confira em Configurações do Windows → Privacidade → Microfone se os apps da área de trabalho podem usá-lo.',
      });
      return;
    }

    const ctx = new AudioContext({ sampleRate: 48000 });
    try {
      await ctx.audioWorklet.addModule(gtcrnWorkletUrl);
      const wasmBinary = await loadGtcrn({ url: gtcrnWasmUrl });
      const source = ctx.createMediaStreamSource(stream);
      const filter = new GtcrnWorkletNode(ctx, { maxChannels: 1, wasmBinary });
      // Mono de ponta a ponta (igual nas chamadas): o filtro limpa um canal só; com
      // microfone estéreo, o outro ficava mudo e o som saía só de um lado do fone.
      filter.channelCount = 1;
      filter.channelCountMode = 'explicit';
      filter.channelInterpretation = 'speakers';
      const rawOut = ctx.createMediaStreamDestination();
      const cleanOut = ctx.createMediaStreamDestination();
      const rawMeter = ctx.createAnalyser();
      const cleanMeter = ctx.createAnalyser();
      source.connect(rawOut);
      source.connect(rawMeter);
      source.connect(filter);
      filter.connect(cleanOut);
      filter.connect(cleanMeter);

      const record = (s: MediaStream) => {
        const chunks: Blob[] = [];
        const rec = new MediaRecorder(s);
        rec.ondataavailable = (e) => chunks.push(e.data);
        const done = new Promise<string>((resolve) => {
          rec.onstop = () => resolve(URL.createObjectURL(new Blob(chunks, { type: rec.mimeType })));
        });
        rec.start();
        return { rec, done };
      };
      const a = record(rawOut.stream);
      const b = record(cleanOut.stream);

      const buf = new Float32Array(2048);
      const rms = (an: AnalyserNode) => {
        an.getFloatTimeDomainData(buf);
        let sum = 0;
        for (const v of buf) sum += v * v;
        return Math.sqrt(sum / buf.length);
      };
      const rawLevels: number[] = [];
      const cleanLevels: number[] = [];
      const meter = setInterval(() => {
        const r = rms(rawMeter);
        rawLevels.push(db(r));
        cleanLevels.push(db(rms(cleanMeter)));
        setLevel(Math.min(1, r * 6));
      }, 50);

      let left = SECONDS;
      setPhase({ kind: 'recording', left });
      const countdown = setInterval(() => {
        left -= 1;
        if (left > 0) setPhase({ kind: 'recording', left });
      }, 1000);

      const finish = async () => {
        stopRef.current = null;
        clearInterval(meter);
        clearInterval(countdown);
        a.rec.stop();
        b.rec.stop();
        const [raw, clean] = await Promise.all([a.done, b.done]);
        urls.current.push(raw, clean);
        stream.getTracks().forEach((t) => t.stop());
        filter.destroy();
        void ctx.close();
        setLevel(0);
        if (Math.max(...rawLevels) < SILENT_DB) {
          setPhase({ kind: 'silent' });
          return;
        }
        // Ruído de fundo: os trechos mais baixos; voz: os mais altos.
        const noiseCut = percentile(rawLevels, 20) - percentile(cleanLevels, 20);
        const voiceKept = percentile(cleanLevels, 90) - percentile(rawLevels, 90);
        setPhase({ kind: 'done', take: { raw, clean, noiseCut, voiceKept } });
      };
      const timer = setTimeout(() => void finish(), SECONDS * 1000);
      stopRef.current = () => {
        clearTimeout(timer);
        void finish();
      };
    } catch {
      stream.getTracks().forEach((t) => t.stop());
      void ctx.close();
      setPhase({ kind: 'error', message: 'Não foi possível carregar o supressor de ruído.' });
    }
  };

  return (
    <div className="border-line border-t py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-header font-medium">Testar microfone</p>
          <p className="text-muted mt-1 text-sm">
            Fale normalmente por {SECONDS} segundos, de preferência com algum barulho por perto
            (teclado, ventilador). Depois ouça sem e com o filtro. A gravação fica só na memória.
          </p>
        </div>
        {phase.kind === 'recording' ? (
          <Button onClick={() => stopRef.current?.()}>
            <span className="inline-flex items-center gap-1.5">
              <Square size={14} aria-hidden /> Parar ({phase.left}s)
            </span>
          </Button>
        ) : (
          <Button variant="primary" onClick={() => void start()}>
            <span className="inline-flex items-center gap-1.5">
              <Mic size={15} aria-hidden /> {phase.kind === 'done' ? 'Gravar de novo' : 'Gravar'}
            </span>
          </Button>
        )}
      </div>

      {phase.kind === 'recording' && (
        <div
          className="bg-field mt-3 h-2 overflow-hidden rounded-full"
          aria-label="Volume do microfone"
        >
          <div
            className="bg-success h-full rounded-full transition-[width] duration-75"
            style={{ width: `${Math.round(level * 100)}%` }}
          />
        </div>
      )}

      {phase.kind === 'done' && (
        <div className="mt-3 space-y-2">
          <Listen label="Sem filtro" src={phase.take.raw} />
          <Listen label="Com o supressor de ruído" src={phase.take.clean} accent />
          <p className="text-muted text-xs">
            Ruído de fundo{' '}
            <strong className="text-interactive">
              {phase.take.noiseCut > 1
                ? `${phase.take.noiseCut.toFixed(0)} dB mais baixo`
                : 'praticamente igual (ambiente já silencioso)'}
            </strong>
            {' · '}voz{' '}
            <strong className="text-interactive">
              {Math.abs(phase.take.voiceKept) < 3
                ? 'preservada'
                : `${phase.take.voiceKept > 0 ? '+' : ''}${phase.take.voiceKept.toFixed(0)} dB`}
            </strong>
            . Confie mais no ouvido do que nos números.
          </p>
        </div>
      )}

      {phase.kind === 'silent' && (
        <p role="alert" className="text-danger mt-3 flex gap-2 text-sm">
          <MicOff size={16} className="mt-0.5 shrink-0" aria-hidden />O microfone mandou só
          silêncio. Confira se o headset está ligado e fora do mudo, se é o microfone padrão do
          Windows e se em Privacidade → Microfone os apps da área de trabalho têm acesso.
        </p>
      )}
      {phase.kind === 'error' && (
        <p role="alert" className="text-danger mt-3 text-sm">
          {phase.message}
        </p>
      )}
    </div>
  );
}

function Listen({ label, src, accent = false }: { label: string; src: string; accent?: boolean }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  return (
    <div
      className={`flex items-center gap-3 rounded-md px-3 py-2 ${accent ? 'bg-success/10' : 'bg-field'}`}
    >
      <button
        type="button"
        aria-label={`${playing ? 'Parar' : 'Ouvir'}: ${label}`}
        onClick={() => {
          const el = audio.current;
          if (!el) return;
          if (playing) {
            el.pause();
            el.currentTime = 0;
          } else void el.play();
        }}
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white ${
          accent ? 'bg-success' : 'bg-accent'
        }`}
      >
        {playing ? <Square size={13} /> : <Play size={14} className="ml-0.5" />}
      </button>
      <span className={`text-sm ${accent ? 'text-header font-medium' : 'text-interactive'}`}>
        {label}
      </span>
      <audio
        ref={audio}
        src={src}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
    </div>
  );
}
