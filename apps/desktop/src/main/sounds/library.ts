import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { app } from 'electron';
import {
  BUILTIN_SOUNDS,
  SOUND_LIMITS,
  type CustomSound,
  type SoundId,
  type SoundOption,
} from '../../shared/sounds';
import type { SettingsStore } from '../store/settings-store';
import { displayName, validateAudioFile } from './validate';

export type ImportResult = { ok: true; sound: CustomSound } | { ok: false; error: string };

/** Decodifica de verdade o áudio (no player) e devolve a duração em segundos. */
export type AudioProbe = (bytes: Uint8Array) => Promise<number>;

const builtinDir = () =>
  app.isPackaged
    ? join(process.resourcesPath, 'sounds')
    : join(app.getAppPath(), 'resources', 'sounds');

const customDir = () => join(app.getPath('userData'), 'sounds');

/**
 * Biblioteca de sons: predefinidos (somente leitura) e importados (copiados para
 * %APPDATA%\GChat Desktop+\sounds com nome gerado; o nome original é só exibição).
 */
export class SoundLibrary {
  constructor(
    private readonly settings: SettingsStore,
    private readonly probe: AudioProbe,
  ) {}

  options(): SoundOption[] {
    return [
      { id: 'system', label: 'Som padrão do Windows', kind: 'special' },
      { id: 'none', label: 'Nenhum', kind: 'special' },
      ...BUILTIN_SOUNDS.map((s) => ({ id: s.id, label: s.label, kind: 'builtin' as const })),
      ...this.settings
        .get()
        .sounds.library.map((s) => ({ id: s.id, label: s.name, kind: 'custom' as const })),
    ];
  }

  /** Caminho do arquivo de um som tocável, ou null (system/none/inexistente). */
  private pathOf(id: SoundId): string | null {
    const builtin = BUILTIN_SOUNDS.find((s) => s.id === id);
    if (builtin) return join(builtinDir(), builtin.file);
    const custom = this.settings.get().sounds.library.find((s) => s.id === id);
    if (custom) return join(customDir(), `${custom.id.slice('custom:'.length)}.${custom.ext}`);
    return null;
  }

  async read(id: SoundId): Promise<Uint8Array | null> {
    const path = this.pathOf(id);
    if (!path) return null;
    try {
      return await readFile(path);
    } catch {
      return null; // arquivo removido por fora: o chamador cai no som padrão
    }
  }

  async import(filePath: string): Promise<ImportResult> {
    const library = this.settings.get().sounds.library;
    if (library.length >= SOUND_LIMITS.library) {
      return { ok: false, error: `Limite de ${SOUND_LIMITS.library} sons importados atingido.` };
    }

    let bytes: Uint8Array;
    try {
      const info = await stat(filePath);
      if (!info.isFile()) return { ok: false, error: 'Selecione um arquivo de áudio.' };
      if (info.size > SOUND_LIMITS.maxBytes) {
        return { ok: false, error: 'O arquivo é maior que 5 MB.' };
      }
      bytes = await readFile(filePath);
    } catch {
      return { ok: false, error: 'Não foi possível ler o arquivo.' };
    }

    const name = basename(filePath);
    const check = validateAudioFile(name, bytes);
    if (!check.ok) return check;

    try {
      const seconds = await this.probe(bytes);
      if (seconds > SOUND_LIMITS.maxSeconds) {
        return {
          ok: false,
          error: `O som tem ${Math.round(seconds)} s. Use um de até ${SOUND_LIMITS.maxSeconds} s.`,
        };
      }
    } catch {
      return { ok: false, error: 'O arquivo está corrompido ou não pôde ser decodificado.' };
    }

    const uuid = randomUUID();
    const sound: CustomSound = { id: `custom:${uuid}`, name: displayName(name), ext: check.ext };
    await mkdir(customDir(), { recursive: true });
    await writeFile(join(customDir(), `${uuid}.${check.ext}`), bytes);
    this.settings.updateInternal({ sounds: { library: [...library, sound] } });
    return { ok: true, sound };
  }

  /** Remove o som e todas as referências a ele (voltam ao padrão). */
  async remove(id: SoundId): Promise<boolean> {
    const { sounds } = this.settings.get();
    const target = sounds.library.find((s) => s.id === id);
    if (!target) return false;

    const conversationSounds = Object.fromEntries(
      Object.entries(sounds.conversationSounds).filter(([, v]) => v !== id),
    );
    this.settings.updateInternal({
      sounds: {
        library: sounds.library.filter((s) => s.id !== id),
        conversationSounds,
        defaultSound: sounds.defaultSound === id ? 'builtin:gota' : sounds.defaultSound,
        mentionSound: sounds.mentionSound === id ? null : sounds.mentionSound,
      },
    });
    await rm(join(customDir(), `${id.slice('custom:'.length)}.${target.ext}`), { force: true });
    return true;
  }
}
