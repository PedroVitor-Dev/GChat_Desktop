import { EventEmitter } from 'node:events';
import { isStoreBuild } from './store';
import { highlightsFromReleaseNotes } from '../../shared/changelog';
import { Notification, app } from 'electron';
// electron-updater é CommonJS e expõe `autoUpdater` por getter: import padrão.
import updaterPkg from 'electron-updater';
import { friendlyUpdateError, type UpdateStatus } from '../../shared/updates';
import type { SettingsStore } from '../store/settings-store';
import { appIcon } from './app-icon';

const { autoUpdater } = updaterPkg;

const FIRST_CHECK_DELAY_MS = 15_000;
const CHECK_EVERY_MS = 6 * 60 * 60 * 1000;

/**
 * Atualização automática pelos Releases do GitHub (latest.yml publicado pelo
 * workflow de release). O electron-updater confere o SHA-512 do instalador antes
 * de usar.
 *
 * - "Automático" ligado: verifica ao abrir e a cada 6 h e baixa em segundo plano.
 * - Desligado: só verifica quando o usuário pede; o download é manual.
 * - Baixada: instala ao reiniciar pelo app, ou ao sair.
 */
export class AppUpdater extends EventEmitter<{ status: [UpdateStatus] }> {
  private current: UpdateStatus;
  private timer: NodeJS.Timeout | null = null;
  private notified = false;
  private manualCheck = false;

  constructor(private readonly settings: SettingsStore) {
    super();
    const currentVersion = app.getVersion();
    this.current = !app.isPackaged
      ? { state: 'unsupported', currentVersion }
      : isStoreBuild()
        ? { state: 'store', currentVersion }
        : { state: 'idle', currentVersion };
    // Na Microsoft Store quem atualiza é a própria Store.
    if (!app.isPackaged || isStoreBuild()) return;

    autoUpdater.logger = null; // nada de logs com caminhos/URLs internas
    // Só para testes: aponta para um servidor local com um latest.yml de teste.
    const testFeed = process.env['GCHAT_UPDATE_FEED'];
    if (testFeed?.startsWith('http://127.0.0.1:')) {
      autoUpdater.setFeedURL({ provider: 'generic', url: testFeed });
    }
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.allowDowngrade = false;
    autoUpdater.allowPrerelease = false;
    this.applyMode();
    settings.on('change', () => this.applyMode());

    autoUpdater.on('checking-for-update', () => this.set({ state: 'checking' }));
    autoUpdater.on('update-not-available', () =>
      this.set({ state: 'not-available', checkedAt: Date.now() }),
    );
    autoUpdater.on('update-available', (info) =>
      this.set({
        state: autoUpdater.autoDownload ? 'downloading' : 'available',
        version: info.version,
        percent: 0,
        checkedAt: Date.now(),
        notes: highlightsFromReleaseNotes(info.releaseNotes),
      }),
    );
    autoUpdater.on('download-progress', (p) =>
      this.set({ state: 'downloading', percent: Math.round(p.percent) }),
    );
    autoUpdater.on('update-downloaded', (info) => {
      this.set({
        state: 'downloaded',
        version: info.version,
        percent: 100,
        notes: highlightsFromReleaseNotes(info.releaseNotes),
      });
      this.notifyReady(info.version);
    });
    autoUpdater.on('error', (err) => {
      // Falhas silenciosas na verificação automática não incomodam o usuário.
      if (!this.manualCheck && this.current.state === 'checking') {
        return this.set({ state: 'idle' });
      }
      this.set({ state: 'error', error: friendlyUpdateError(String(err?.message ?? err)) });
    });
  }

  status(): UpdateStatus {
    return this.current;
  }

  /** Começa as verificações automáticas (se ligadas). */
  start(): void {
    if (!app.isPackaged || isStoreBuild()) return;
    setTimeout(() => this.autoCheck(), FIRST_CHECK_DELAY_MS);
    this.timer = setInterval(() => this.autoCheck(), CHECK_EVERY_MS);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /** Verificação pedida pelo usuário (botão "Buscar atualizações"). */
  async check(): Promise<UpdateStatus> {
    if (!app.isPackaged || isStoreBuild()) return this.current;
    if (this.current.state === 'downloading' || this.current.state === 'downloaded') {
      return this.current;
    }
    this.manualCheck = true;
    try {
      await autoUpdater.checkForUpdates();
    } catch (err) {
      this.set({ state: 'error', error: friendlyUpdateError(String((err as Error).message)) });
    } finally {
      this.manualCheck = false;
    }
    return this.current;
  }

  /** Baixa a versão encontrada (quando o download automático está desligado). */
  async download(): Promise<void> {
    if (this.current.state !== 'available' && this.current.state !== 'error') return;
    this.set({ state: 'downloading', percent: 0 });
    try {
      await autoUpdater.downloadUpdate();
    } catch (err) {
      this.set({ state: 'error', error: friendlyUpdateError(String((err as Error).message)) });
    }
  }

  /** Fecha o app, instala em silêncio e reabre. */
  install(): void {
    if (this.current.state !== 'downloaded') return;
    autoUpdater.quitAndInstall(true, true);
  }

  private autoCheck(): void {
    if (!this.settings.get().updates.auto) return;
    if (this.current.state === 'downloading' || this.current.state === 'downloaded') return;
    autoUpdater.checkForUpdates().catch(() => undefined);
  }

  private applyMode(): void {
    autoUpdater.autoDownload = this.settings.get().updates.auto;
  }

  private notifyReady(version: string): void {
    if (this.notified || !Notification.isSupported()) return;
    this.notified = true;
    new Notification({
      title: `GChat Desktop+ ${version} está pronto`,
      body: 'Reinicie o app para atualizar. A atualização também é instalada quando você sair.',
      icon: appIcon(),
      silent: true,
    }).show();
  }

  private set(patch: Partial<UpdateStatus>): void {
    const next: UpdateStatus = { ...this.current, ...patch };
    if (patch.state && patch.state !== 'error') delete next.error;
    this.current = next;
    this.emit('status', next);
  }
}
