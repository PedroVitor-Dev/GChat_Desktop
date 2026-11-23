import { join } from 'node:path';
import { BrowserWindow, app, ipcMain } from 'electron';
import { AudioChannel, type PlayRequest, type ProbeResult } from '../../shared/audio';
import type { SoundId } from '../../shared/sounds';
import type { SoundLibrary } from './library';

/** Entre dois sons, no mínimo este intervalo (evita cacofonia em rajadas). */
const MIN_INTERVAL_MS = 1_200;
const PROBE_TIMEOUT_MS = 10_000;

/**
 * Toca os sons numa janela oculta e isolada (o processo principal não tem áudio).
 * A janela é criada sob demanda e reaproveitada.
 */
export class SoundPlayer {
  private window: BrowserWindow | null = null;
  private ready: Promise<BrowserWindow> | null = null;
  private lastPlayedAt = 0;
  private nextProbeId = 1;
  private readonly pendingProbes = new Map<number, (r: ProbeResult) => void>();
  private library: SoundLibrary | null = null;

  constructor() {
    ipcMain.on(AudioChannel.ProbeResult, (event, raw: unknown) => {
      if (!this.window || event.sender !== this.window.webContents) return;
      const r = raw as ProbeResult;
      if (typeof r?.requestId !== 'number') return;
      this.pendingProbes.get(r.requestId)?.(r);
      this.pendingProbes.delete(r.requestId);
    });
  }

  attach(library: SoundLibrary): void {
    this.library = library;
  }

  /**
   * Toca um som da biblioteca. `system`/`none` não tocam nada aqui (o toast cuida).
   * Retorna false se o som não pôde ser lido (quem chama decide o fallback).
   */
  async play(id: SoundId, volume: number, { force = false } = {}): Promise<boolean> {
    if (id === 'system' || id === 'none' || !this.library) return true;
    const now = Date.now();
    if (!force && now - this.lastPlayedAt < MIN_INTERVAL_MS) return true;

    const bytes = await this.library.read(id);
    if (!bytes) return false;
    this.lastPlayedAt = now;
    const win = await this.ensureWindow();
    win.webContents.send(AudioChannel.Play, { key: id, bytes, volume } satisfies PlayRequest);
    return true;
  }

  /** Decodifica de verdade e devolve a duração (lança se não for áudio válido). */
  async probe(bytes: Uint8Array): Promise<number> {
    const win = await this.ensureWindow();
    const requestId = this.nextProbeId++;
    const result = await new Promise<ProbeResult>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingProbes.delete(requestId);
        reject(new Error('tempo esgotado'));
      }, PROBE_TIMEOUT_MS);
      this.pendingProbes.set(requestId, (r) => {
        clearTimeout(timer);
        resolve(r);
      });
      win.webContents.send(AudioChannel.Probe, { requestId, bytes });
    });
    if (!result.ok) throw new Error('áudio inválido');
    return result.seconds;
  }

  destroy(): void {
    this.window?.destroy();
    this.window = null;
    this.ready = null;
  }

  private ensureWindow(): Promise<BrowserWindow> {
    if (this.ready) return this.ready;
    const win = new BrowserWindow({
      show: false,
      width: 1,
      height: 1,
      skipTaskbar: true,
      webPreferences: {
        preload: join(import.meta.dirname, '../preload/audio.cjs'),
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
        // Sem isso o Chromium suspende o áudio de janelas ocultas/em segundo plano.
        backgroundThrottling: false,
        autoplayPolicy: 'no-user-gesture-required',
      },
    });
    this.window = win;
    win.on('closed', () => {
      this.window = null;
      this.ready = null;
    });

    const devUrl = process.env['ELECTRON_RENDERER_URL'];
    const load =
      !app.isPackaged && devUrl
        ? win.loadURL(`${devUrl}/audio.html`)
        : win.loadFile(join(import.meta.dirname, '../renderer/audio.html'));
    this.ready = load.then(() => win);
    return this.ready;
  }
}
