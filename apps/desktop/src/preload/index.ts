import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import { IpcChannel } from '../shared/ipc';
import type { Settings } from '../shared/settings';
import { ShellChannel, type ShellState } from '../shared/shell';
import type { UpdateStatus } from '../shared/updates';
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
  toggleStreamer: () => ipcRenderer.invoke(IpcChannel.StreamerToggle),
  updates: {
    status: () => ipcRenderer.invoke(IpcChannel.UpdateStatus),
    check: () => ipcRenderer.invoke(IpcChannel.UpdateCheck),
    download: () => ipcRenderer.invoke(IpcChannel.UpdateDownload),
    install: () => ipcRenderer.invoke(IpcChannel.UpdateInstall),
    onStatus: (listener) => {
      const wrapped = (_e: IpcRendererEvent, s: UpdateStatus) => listener(s);
      ipcRenderer.on(IpcChannel.UpdateStatusChanged, wrapped);
      return () => ipcRenderer.removeListener(IpcChannel.UpdateStatusChanged, wrapped);
    },
  },
  rooms: {
    create: (name) => ipcRenderer.invoke(IpcChannel.RoomsCreate, name),
    addFromLink: (name, link) => ipcRenderer.invoke(IpcChannel.RoomsAddLink, name, link),
    rename: (id, name) => ipcRenderer.invoke(IpcChannel.RoomsRename, id, name),
    remove: (id) => ipcRenderer.invoke(IpcChannel.RoomsRemove, id),
    copyLink: (id) => ipcRenderer.invoke(IpcChannel.RoomsCopyLink, id),
  },
  call: {
    join: (roomId) => ipcRenderer.invoke(IpcChannel.CallJoin, roomId),
    leave: () => ipcRenderer.invoke(IpcChannel.CallLeave),
  },
  accounts: {
    add: (name) => ipcRenderer.invoke(IpcChannel.AccountAdd, name),
    rename: (id, name) => ipcRenderer.invoke(IpcChannel.AccountRename, id, name),
    signOut: (id) => ipcRenderer.invoke(IpcChannel.AccountSignOut, id),
    remove: (id) => ipcRenderer.invoke(IpcChannel.AccountRemove, id),
  },
  shell: {
    getState: () => ipcRenderer.invoke(ShellChannel.GetState),
    onState: (listener) => {
      const wrapped = (_e: IpcRendererEvent, s: ShellState) => listener(s);
      ipcRenderer.on(ShellChannel.State, wrapped);
      return () => ipcRenderer.removeListener(ShellChannel.State, wrapped);
    },
    setSettingsOpen: (open) => ipcRenderer.invoke(ShellChannel.SetSettingsOpen, open),
    setModalOpen: (open) => ipcRenderer.invoke(ShellChannel.SetModalOpen, open),
    setView: (view) => ipcRenderer.invoke(ShellChannel.SetView, view),
    selectAccount: (id) => ipcRenderer.invoke(ShellChannel.SelectAccount, id),
    reloadChat: () => ipcRenderer.invoke(ShellChannel.ReloadChat),
  },
};

contextBridge.exposeInMainWorld('gchat', Object.freeze(api));
