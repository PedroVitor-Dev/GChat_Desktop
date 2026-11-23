/**
 * Posição e tamanho da janela entre execuções, com suporte a vários monitores.
 * A parte de geometria é pura (testável); a persistência fica em WindowStateFile.
 */
import { readFileSync } from 'node:fs';
import { rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WindowState extends Rect {
  maximized: boolean;
}

export const DEFAULT_SIZE = { width: 1280, height: 860 } as const;
export const MIN_SIZE = { width: 860, height: 540 } as const;
/** Quanto da barra de título precisa estar visível para a posição valer. */
const MIN_VISIBLE = 100;

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export function parseWindowState(input: unknown): WindowState | null {
  if (typeof input !== 'object' || input === null) return null;
  const r = input as Record<string, unknown>;
  if (!isNum(r['x']) || !isNum(r['y']) || !isNum(r['width']) || !isNum(r['height'])) return null;
  return {
    x: Math.round(r['x']),
    y: Math.round(r['y']),
    width: Math.max(MIN_SIZE.width, Math.round(r['width'])),
    height: Math.max(MIN_SIZE.height, Math.round(r['height'])),
    maximized: r['maximized'] === true,
  };
}

const overlap = (a: Rect, b: Rect) => ({
  w: Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x),
  h: Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y),
});

/**
 * Ajusta o estado salvo às telas atuais. Se o monitor onde a janela estava foi
 * desconectado (ou a resolução mudou), centraliza na tela principal.
 * @param workAreas áreas úteis dos monitores; a primeira é a principal
 */
export function fitToDisplays(saved: WindowState | null, workAreas: Rect[]): WindowState {
  const primary = workAreas[0] ?? { x: 0, y: 0, ...DEFAULT_SIZE };
  const center = (w: number, h: number): WindowState => {
    const width = Math.min(w, primary.width);
    const height = Math.min(h, primary.height);
    return {
      x: primary.x + Math.round((primary.width - width) / 2),
      y: primary.y + Math.round((primary.height - height) / 2),
      width,
      height,
      maximized: false,
    };
  };
  if (!saved) return center(DEFAULT_SIZE.width, DEFAULT_SIZE.height);

  // A faixa superior (barra de título) precisa aparecer em algum monitor.
  const titleStrip: Rect = { x: saved.x, y: saved.y, width: saved.width, height: 32 };
  const host = workAreas.find((area) => {
    const o = overlap(titleStrip, area);
    return o.w >= MIN_VISIBLE && o.h > 0;
  });
  if (!host) return { ...center(saved.width, saved.height), maximized: saved.maximized };

  return {
    ...saved,
    width: Math.min(saved.width, host.width),
    height: Math.min(saved.height, host.height),
  };
}

/** Leitura síncrona na criação da janela; escrita atômica e com debounce. */
export class WindowStateFile {
  private readonly file: string;
  private timer: NodeJS.Timeout | null = null;

  constructor(dir: string) {
    this.file = join(dir, 'window-state.json');
  }

  load(): WindowState | null {
    try {
      return parseWindowState(JSON.parse(readFileSync(this.file, 'utf8')));
    } catch {
      return null;
    }
  }

  save(state: WindowState, delayMs = 500): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      const tmp = `${this.file}.tmp`;
      void writeFile(tmp, JSON.stringify(state))
        .then(() => rename(tmp, this.file))
        .catch(() => undefined);
    }, delayMs);
  }
}
