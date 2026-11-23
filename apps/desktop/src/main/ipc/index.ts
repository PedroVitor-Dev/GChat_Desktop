import { app } from 'electron';
import { IpcChannel, type AppInfo } from '../../shared/ipc';
import { handle, noArgs } from './handle';

export function registerIpc(): void {
  handle(IpcChannel.AppInfo, noArgs, (): AppInfo => ({
    name: app.getName(),
    version: app.getVersion(),
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    platform: `${process.platform} ${process.arch}`,
  }));
}
