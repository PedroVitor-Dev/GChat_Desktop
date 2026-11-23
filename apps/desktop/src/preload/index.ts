import { contextBridge, ipcRenderer } from 'electron';
import { IpcChannel } from '../shared/ipc';
import type { GChatApi } from './api';

/** API mínima e explícita. Nenhum objeto do Electron/Node vaza para o renderer. */
const api: GChatApi = {
  getAppInfo: () => ipcRenderer.invoke(IpcChannel.AppInfo),
};

contextBridge.exposeInMainWorld('gchat', Object.freeze(api));
