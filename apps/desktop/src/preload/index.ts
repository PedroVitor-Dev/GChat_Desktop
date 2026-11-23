import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import { IpcChannel } from '../shared/ipc';
import type { Settings } from '../shared/settings';
import { ShellChannel, type ShellState } from '../shared/shell';
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
  getSoundOptions: () => ipcRenderer.invoke(IpcChannel.SoundOptions),
  previewSound: (id) => ipcRenderer.invoke(IpcChannel.SoundPreview, id),
  importSound: () => ipcRenderer.invoke(IpcChannel.SoundImport),
  removeSound: (id) => ipcRenderer.invoke(IpcChannel.SoundRemove, id),
  getAutostartStatus: () => ipcRenderer.invoke(IpcChannel.AutostartStatus),
  shell: {
    getState: () => ipcRenderer.invoke(ShellChannel.GetState),
    onState: (listener) => {
      const wrapped = (_e: IpcRendererEvent, s: ShellState) => listener(s);
      ipcRenderer.on(ShellChannel.State, wrapped);
      return () => ipcRenderer.removeListener(ShellChannel.State, wrapped);
    },
    setSettingsOpen: (open) => ipcRenderer.invoke(ShellChannel.SetSettingsOpen, open),
    focusChat: () => ipcRenderer.invoke(ShellChannel.FocusChat),
    reloadChat: () => ipcRenderer.invoke(ShellChannel.ReloadChat),
  },
};

contextBridge.exposeInMainWorld('gchat', Object.freeze(api));
