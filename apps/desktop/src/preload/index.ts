import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import { IpcChannel } from '../shared/ipc';
import type { Settings } from '../shared/settings';
import type { GChatApi } from './api';

/** API mínima e explícita. Nenhum objeto do Electron/Node vaza para o renderer. */
const api: GChatApi = {
  getAppInfo: () => ipcRenderer.invoke(IpcChannel.AppInfo),
  getSettings: () => ipcRenderer.invoke(IpcChannel.SettingsGet),
  updateSettings: (patch) => ipcRenderer.invoke(IpcChannel.SettingsUpdate, patch),
  onSettingsChanged: (listener) => {
    // Repassa só o payload; o objeto do evento (com `sender`) nunca chega ao renderer.
    const wrapped = (_e: IpcRendererEvent, s: Settings) => listener(s);
    ipcRenderer.on(IpcChannel.SettingsChanged, wrapped);
    return () => ipcRenderer.removeListener(IpcChannel.SettingsChanged, wrapped);
  },
  testNotification: () => ipcRenderer.invoke(IpcChannel.NotificationTest),
  getRecentConversations: () => ipcRenderer.invoke(IpcChannel.RecentConversations),
};

contextBridge.exposeInMainWorld('gchat', Object.freeze(api));
