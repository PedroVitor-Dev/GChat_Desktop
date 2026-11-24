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
import {
  APP_ID,
  WRITER_KEY,
  preserveUnknown,
  restoreMissing,
  writerOf,
} from '../../shared/settings-compat';

const SAVE_DELAY_MS = 300;

type Read =
  { kind: 'ok'; value: unknown } | { kind: 'missing' } | { kind: 'invalid'; text: string };

function readJson(file: string): Read {
  let text: string;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    return { kind: 'missing' };
  }
  try {
    return { kind: 'ok', value: JSON.parse(text) };
  } catch {
    return { kind: 'invalid', text };
  }
}

/**
 * Persistência de configurações em %APPDATA%\GChat Desktop+\settings.json.
 * - Leitura síncrona na inicialização (arquivo pequeno), com normalização.
 * - Escrita atômica (arquivo temporário + rename) e com debounce.
 * - Entre versões (ver shared/settings-compat.ts): mantém campos que esta versão
 *   não conhece e grava também settings.full.json, uma cópia completa com a
 *   marca `_writer`. Se uma versão antiga regravar o settings.json (sem a marca),
 *   o que ela apagou volta da cópia na próxima abertura.
 * - Arquivo corrompido não derruba o app: usa a cópia completa (ou os padrões) e
 *   preserva o original em settings.json.bak.
 */
export class SettingsStore extends EventEmitter<{ change: [Settings] }> {
  private current: Settings;
  private timer: NodeJS.Timeout | null = null;
  /** Fila de gravações (uma de cada vez). */
  private saving: Promise<void> = Promise.resolve();
  private readonly file: string;
  /** Cópia completa (com campos de versões mais novas e a marca de quem gravou). */
  private readonly fullFile: string;
  /** O que veio do disco, inclusive campos que esta versão não conhece. */
  private raw: unknown = {};

  constructor(
    dir = app.getPath('userData'),
    private readonly appVersion = app.getVersion(),
  ) {
    super();
    this.file = join(dir, 'settings.json');
    this.fullFile = join(dir, 'settings.full.json');
    const { settings, repaired } = this.load();
    this.current = settings;
    // Recuperou dados apagados por uma versão antiga: grava já, com a marca.
    if (repaired) this.scheduleSave();
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
    // O que esta versão conhece, por cima de tudo o que veio do disco.
    const data = {
      ...(preserveUnknown(this.raw, this.current) as object),
      [WRITER_KEY]: { app: APP_ID, version: this.appVersion, savedAt: Date.now() },
    };
    this.raw = data;
    const text = JSON.stringify(data, null, 2);
    for (const target of [this.file, this.fullFile]) {
      const tmp = `${target}.tmp`;
      await writeFile(tmp, text, 'utf8');
      await rename(tmp, target);
    }
  }

  private load(): { settings: Settings; repaired: boolean } {
    const main = readJson(this.file);
    const full = readJson(this.fullFile);
    const backup = full.kind === 'ok' && writerOf(full.value) ? full.value : null;

    let source: unknown = null;
    let repaired = false;
    if (main.kind === 'ok') {
      source = main.value;
      // Sem a marca, quem gravou foi uma versão antiga (0.0.1–0.0.5), que apaga
      // os campos que não conhece: devolve o que sumiu a partir da cópia.
      if (!writerOf(main.value) && backup) {
        source = restoreMissing(main.value, backup);
        repaired = JSON.stringify(source) !== JSON.stringify(main.value);
        if (repaired) {
          console.error('[settings] regravado por uma versão antiga; campos apagados restaurados');
        }
      }
    } else if (main.kind === 'invalid') {
      console.error('[settings] arquivo inválido; usando a cópia completa ou os padrões');
      void writeFile(`${this.file}.bak`, main.text, 'utf8').catch(() => undefined);
      source = backup;
      repaired = backup !== null;
    }
    // Sem settings.json: primeira execução ou o usuário apagou para recomeçar
    // (versões antigas nunca apagam o arquivo). Começa do padrão, sem a cópia.

    if (source === null) return { settings: DEFAULT_SETTINGS, repaired: false };
    this.raw = source;
    try {
      return { settings: normalizeSettings(source), repaired };
    } catch {
      this.raw = {};
      return { settings: DEFAULT_SETTINGS, repaired: false };
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
