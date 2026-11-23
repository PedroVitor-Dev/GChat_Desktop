/** Canais IPC entre renderer e main. Lista fechada: nada fora dela é aceito. */
export const IpcChannel = {
  AppInfo: 'app:info',
} as const;

export interface AppInfo {
  name: string;
  version: string;
  electron: string;
  chrome: string;
  platform: string;
}
