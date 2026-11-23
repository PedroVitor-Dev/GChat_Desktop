import { BrowserWindow, app, dialog } from 'electron';
import { IpcChannel, type AppInfo } from '../../shared/ipc';
import type { Settings } from '../../shared/settings';
import { ShellChannel, type ShellState } from '../../shared/shell';
import { isSoundId, type SoundId } from '../../shared/sounds';
import { isAccountId } from '../../shared/accounts';
import type { AccountsService } from '../accounts/accounts-service';
import type { NotificationManager } from '../notifications/manager';
import type { AppShell } from '../shell/app-shell';
import { autostartStatus } from '../system/autostart';
import type { ImportResult, SoundLibrary } from '../sounds/library';
import type { SoundPlayer } from '../sounds/player';
import type { SettingsStore } from '../store/settings-store';
import { handle, noArgs } from './handle';

interface IpcDeps {
  settings: SettingsStore;
  notifications: NotificationManager;
  library: SoundLibrary;
  player: SoundPlayer;
  shell: AppShell;
  accounts: AccountsService;
}

/** Um único argumento do tipo objeto; o conteúdo é normalizado pelo store. */
const oneObject = (args: unknown[]): unknown => {
  if (args.length !== 1 || typeof args[0] !== 'object' || args[0] === null) {
    throw new TypeError('esperado um objeto');
  }
  return args[0];
};

/** Um único id de som válido. */
const oneSoundId = (args: unknown[]): SoundId => {
  if (args.length !== 1 || !isSoundId(args[0])) throw new TypeError('id de som inválido');
  return args[0];
};

/** Um único booleano. */
const oneBoolean = (args: unknown[]): boolean => {
  if (args.length !== 1 || typeof args[0] !== 'boolean') throw new TypeError('esperado booleano');
  return args[0];
};

/** Um id de conta válido (e, opcionalmente, um segundo argumento qualquer). */
const accountArgs = (args: unknown[]): [string, unknown] => {
  if (args.length < 1 || args.length > 2 || !isAccountId(args[0])) {
    throw new TypeError('id de conta inválido');
  }
  return [args[0], args[1]];
};

/** Um único argumento qualquer (validado pelo serviço). */
const oneArg = (args: unknown[]): unknown => {
  if (args.length !== 1) throw new TypeError('esperado um argumento');
  return args[0];
};

export function registerIpc({
  settings,
  notifications,
  library,
  player,
  shell,
  accounts,
}: IpcDeps): void {
  handle(ShellChannel.GetState, noArgs, (): ShellState => shell.getState());
  handle(ShellChannel.SetSettingsOpen, oneBoolean, (open) => shell.setSettingsOpen(open));
  handle(ShellChannel.SetModalOpen, oneBoolean, (open) => shell.setModalOpen(open));
  handle(ShellChannel.SelectAccount, accountArgs, ([id]) => shell.focusChat(id));

  handle(IpcChannel.AccountAdd, oneArg, (name) => accounts.add(name));
  handle(IpcChannel.AccountRename, accountArgs, ([id, name]) => accounts.rename(id, name));
  handle(IpcChannel.AccountSignOut, accountArgs, ([id]) => accounts.signOut(id));
  handle(IpcChannel.AccountRemove, accountArgs, ([id]) => accounts.remove(id));
  handle(ShellChannel.ReloadChat, noArgs, () => shell.reloadChat());

  handle(IpcChannel.AppInfo, noArgs, (): AppInfo => ({
    name: app.getName(),
    version: app.getVersion(),
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    platform: `${process.platform} ${process.arch}`,
  }));

  handle(IpcChannel.SettingsGet, noArgs, (): Settings => settings.get());
  handle(IpcChannel.SettingsUpdate, oneObject, (patch): Settings => settings.update(patch));
  handle(IpcChannel.NotificationTest, noArgs, () => notifications.showTest());
  handle(IpcChannel.RecentConversations, noArgs, () => notifications.recentConversations());

  handle(IpcChannel.AutostartStatus, noArgs, () => autostartStatus());
  handle(IpcChannel.SoundOptions, noArgs, () => library.options());
  handle(IpcChannel.SoundPreview, oneSoundId, async (id) => {
    // "Som do Windows" só existe dentro de um toast: a prévia mostra um de teste.
    if (id === 'system') return notifications.showTest();
    return player.play(id, settings.get().sounds.volume, { force: true });
  });
  handle(IpcChannel.SoundRemove, oneSoundId, (id) => library.remove(id));
  // O renderer não envia caminhos: o arquivo é escolhido no diálogo nativo do main.
  handle(IpcChannel.SoundImport, noArgs, async (_args, event): Promise<ImportResult | null> => {
    const parent = BrowserWindow.fromWebContents(event.sender);
    const options: Electron.OpenDialogOptions = {
      title: 'Importar som',
      properties: ['openFile'],
      filters: [{ name: 'Áudio (MP3, WAV, OGG)', extensions: ['mp3', 'wav', 'ogg'] }],
    };
    const picked = parent
      ? await dialog.showOpenDialog(parent, options)
      : await dialog.showOpenDialog(options);
    const file = picked.filePaths[0];
    if (picked.canceled || !file) return null;
    return library.import(file);
  });

  settings.on('change', (next) => {
    for (const win of BrowserWindow.getAllWindows()) {
      // Só janelas locais recebem (o Chat fica numa view própria, fora desta lista).
      if (win.webContents.getURL().startsWith('https://')) continue;
      win.webContents.send(IpcChannel.SettingsChanged, next);
    }
  });
}
