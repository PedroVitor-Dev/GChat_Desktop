import { execFile } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { promisify } from 'node:util';

const run = promisify(execFile);

/**
 * Programas de transmissão/gravação reconhecidos (nome do executável, minúsculo).
 * Ficam de fora gravadores que rodam o tempo todo em segundo plano (GeForce
 * Experience, Xbox Game Bar, Medal), senão o modo streamer nunca desligaria.
 */
export const STREAMING_APPS: Record<string, string> = {
  'obs64.exe': 'OBS Studio',
  'obs32.exe': 'OBS Studio',
  'obs.exe': 'OBS Studio',
  'streamlabs obs.exe': 'Streamlabs',
  'streamlabs desktop.exe': 'Streamlabs',
  'xsplit.core.exe': 'XSplit',
  'xsplitbroadcaster.exe': 'XSplit',
  'twitchstudio.exe': 'Twitch Studio',
  'twitch studio.exe': 'Twitch Studio',
  'prismlivestudio.exe': 'PRISM Live Studio',
  'vmix64.exe': 'vMix',
  'vmix.exe': 'vMix',
  'meld.exe': 'Meld Studio',
};

/** Nomes amigáveis dos programas detectados (sem repetição), em ordem alfabética. */
export function detectStreamingApps(processNames: readonly string[]): string[] {
  const found = new Set<string>();
  for (const name of processNames) {
    const label = STREAMING_APPS[name.trim().toLowerCase()];
    if (label) found.add(label);
  }
  return [...found].sort();
}

/** Extrai o nome da imagem de cada linha da saída CSV do `tasklist`. */
export function parseTasklistCsv(output: string): string[] {
  const names: string[] = [];
  for (const line of output.split(/\r?\n/)) {
    const m = /^"([^"]+)"/.exec(line);
    if (m?.[1]) names.push(m[1]);
  }
  return names;
}

/**
 * Verifica periodicamente os processos do Windows (só nomes, nada mais) e avisa
 * quando um programa de transmissão abre ou fecha.
 */
export class StreamingDetector extends EventEmitter<{ change: [string[]] }> {
  private timer: NodeJS.Timeout | null = null;
  private current: string[] = [];
  private checking = false;

  constructor(private readonly intervalMs = 8_000) {
    super();
  }

  /** Programas detectados na última verificação. */
  detected(): string[] {
    return this.current;
  }

  start(): void {
    if (this.timer || process.platform !== 'win32') return;
    void this.check();
    this.timer = setInterval(() => void this.check(), this.intervalMs);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.update([]);
  }

  private async check(): Promise<void> {
    if (this.checking) return;
    this.checking = true;
    try {
      const { stdout } = await run('tasklist.exe', ['/FO', 'CSV', '/NH'], {
        windowsHide: true,
        maxBuffer: 4 * 1024 * 1024,
      });
      this.update(detectStreamingApps(parseTasklistCsv(stdout)));
    } catch {
      // Falha pontual: mantém o último estado conhecido.
    } finally {
      this.checking = false;
    }
  }

  private update(next: string[]): void {
    if (next.join('|') === this.current.join('|')) return;
    this.current = next;
    this.emit('change', next);
  }
}
