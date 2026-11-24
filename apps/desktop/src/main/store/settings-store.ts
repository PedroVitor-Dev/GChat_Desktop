import { EventEmitter } from 'node:events';
import { readFileSync } from 'node:fs';
import { rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { app } from 'electron';
import {
  DEFAULT_SETTINGS,
  applyPatch,
  normalizeSettings,
  type Settings,
  type SettingsPatch,
} from '../../shared/settings';

const SAVE_DELAY_MS = 300;

/**
 * Persistência de configurações em %APPDATA%\GChat Desktop+\settings.json.
 * - Leitura síncrona na inicialização (arquivo pequeno), com normalização.
 * - Escrita atômica (arquivo temporário + rename) e com debounce.
 * - Arquivo corrompido não derruba o app: volta aos padrões e preserva o original.
 */
export class SettingsStore extends EventEmitter<{ change: [Settings] }> {
  private current: Settings;
  private timer: NodeJS.Timeout | null = null;
  /** Fila de gravações (uma de cada vez). */
  private saving: Promise<void> = Promise.resolve();
  private readonly file: string;

  constructor(dir = app.getPath('userData')) {
    super();
    this.file = join(dir, 'settings.json');
    this.current = this.load();
  }

  get(): Settings {
    return this.current;
  }

  /** Alteração proposta pelo renderer (não pode mexer na biblioteca de sons). */
  update(patch: unknown): Settings {
    return this.commit(applyPatch(this.current, patch));
  }

  /** Alteração feita pelo próprio main (pode alterar tudo, inclusive a biblioteca). */
  updateInternal(patch: SettingsPatch): Settings {
    return this.commit(normalizeSettings(patch, this.current));
  }

  private commit(next: Settings): Settings {
    this.current = next;
    this.emit('change', this.current);
    this.scheduleSave();
    return this.current;
  }

  /**
   * Grava imediatamente (usado ao sair). As gravações entram em fila: duas
   * seguidas não disputam o mesmo arquivo temporário, e cada uma grava o estado
   * mais recente no momento em que roda.
   */
  flush(): Promise<void> {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    const run = this.saving.then(() => this.write());
    this.saving = run.catch(() => undefined);
    return run;
  }

  private async write(): Promise<void> {
    const tmp = `${this.file}.tmp`;
    await writeFile(tmp, JSON.stringify(this.current, null, 2), 'utf8');
    await rename(tmp, this.file);
  }

  private load(): Settings {
    let text: string;
    try {
      text = readFileSync(this.file, 'utf8');
    } catch {
      return DEFAULT_SETTINGS; // primeira execução
    }
    try {
      return normalizeSettings(JSON.parse(text));
    } catch {
      console.error('[settings] arquivo inválido; usando padrões (cópia em settings.json.bak)');
      void writeFile(`${this.file}.bak`, text, 'utf8').catch(() => undefined);
      return DEFAULT_SETTINGS;
    }
  }

  private scheduleSave(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.flush().catch((err: Error) =>
        console.error(`[settings] falha ao salvar: ${err.message}`),
      );
    }, SAVE_DELAY_MS);
  }
}
