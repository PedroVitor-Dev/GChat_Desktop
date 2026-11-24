import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { SettingsStore } from './settings-store';

const dirs: string[] = [];
const tempDir = () => {
  const d = mkdtempSync(join(tmpdir(), 'gchat-settings-'));
  dirs.push(d);
  return d;
};
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

const room = {
  id: 'room-aaaaaa1',
  name: 'Bate-papo',
  code: 'abc-defg-hij',
  accountId: 'account-1',
};
// Arquivo de configurações lido como JSON livre (inclui campos desconhecidos).
type Saved = {
  _writer?: { version: string };
  general: Record<string, unknown>;
  notifications: unknown;
  rooms: Array<Record<string, unknown>>;
  coisaNova?: unknown;
};
const read = (dir: string, file = 'settings.json') =>
  JSON.parse(readFileSync(join(dir, file), 'utf8')) as Saved;

describe('SettingsStore entre versões', () => {
  it('recupera o que uma versão antiga apagou (salas, streamer) e mantém o que ela mudou', async () => {
    const dir = tempDir();
    const v6 = new SettingsStore(dir, '0.0.6');
    v6.updateInternal({ rooms: [room], streamer: { auto: false } });
    await v6.flush();
    expect(read(dir)._writer?.version).toBe('0.0.6');

    // A 0.0.1 abre o mesmo perfil e regrava só o que conhece (sem marca, sem salas).
    const old = read(dir);
    writeFileSync(
      join(dir, 'settings.json'),
      JSON.stringify({
        version: 2,
        general: { ...old.general, launchAtLogin: true },
        notifications: old.notifications,
      }),
    );

    const again = new SettingsStore(dir, '0.0.6');
    expect(again.get().rooms).toEqual([room]);
    expect(again.get().streamer.auto).toBe(false);
    expect(again.get().general.launchAtLogin).toBe(true); // mudança feita na versão antiga fica
    await again.flush();
    expect(read(dir)._writer).toBeTruthy();
    expect(read(dir).rooms).toEqual([room]);
  });

  it('downgrade: mantém campos de uma versão mais nova ao gravar', async () => {
    const dir = tempDir();
    writeFileSync(
      join(dir, 'settings.json'),
      JSON.stringify({
        version: 2,
        general: { launchAtLogin: false, recursoDoFuturo: 'sim' },
        coisaNova: { a: 1 },
        rooms: [{ ...room, campoNovo: 42 }],
        _writer: { app: 'gchat-desktop-plus', version: '0.1.0', savedAt: 1 },
      }),
    );
    const s = new SettingsStore(dir, '0.0.6');
    s.updateInternal({ general: { launchAtLogin: true } });
    await s.flush();
    const saved = read(dir);
    expect(saved.general).toMatchObject({ launchAtLogin: true, recursoDoFuturo: 'sim' });
    expect(saved.coisaNova).toEqual({ a: 1 });
    expect(saved.rooms[0]?.['campoNovo']).toBe(42);
    expect(saved._writer?.version).toBe('0.0.6');
  });

  it('arquivo corrompido usa a cópia completa; arquivo apagado recomeça do padrão', async () => {
    const dir = tempDir();
    const s = new SettingsStore(dir, '0.0.6');
    s.updateInternal({ rooms: [room] });
    await s.flush();

    writeFileSync(join(dir, 'settings.json'), '{ quebrado');
    expect(new SettingsStore(dir, '0.0.6').get().rooms).toEqual([room]);

    rmSync(join(dir, 'settings.json'));
    expect(new SettingsStore(dir, '0.0.6').get().rooms).toEqual([]);
  });
});
