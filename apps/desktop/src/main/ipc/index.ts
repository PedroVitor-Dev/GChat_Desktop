import { BrowserWindow, app } from 'electron';
import { IpcChannel, type AppInfo } from '../../shared/ipc';
import type { Settings } from '../../shared/settings';
import type { NotificationManager } from '../notifications/manager';
import type { SettingsStore } from '../store/settings-store';
import { handle, noArgs } from './handle';

interface IpcDeps {
  settings: SettingsStore;
  notifications: NotificationManager;
}

/** Um único argumento do tipo objeto; o conteúdo é normalizado pelo store. */
const oneObject = (args: unknown[]): unknown => {
  if (args.length !== 1 || typeof args[0] !== 'object' || args[0] === null) {
    throw new TypeError('esperado um objeto');
  }
  return args[0];
};

export function registerIpc({ settings, notifications }: IpcDeps): void {
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

  settings.on('change', (next) => {
    for (const win of BrowserWindow.getAllWindows()) {
      // Só janelas locais (configurações) recebem; a do Chat não tem esse canal.
      if (win.webContents.getURL().startsWith('https://')) continue;
      win.webContents.send(IpcChannel.SettingsChanged, next);
    }
  });
}
