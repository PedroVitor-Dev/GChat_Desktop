/** Canais IPC entre renderer e main. Lista fechada: nada fora dela é aceito. */
export const IpcChannel = {
  AppInfo: 'app:info',
  SettingsGet: 'settings:get',
  SettingsUpdate: 'settings:update',
  /** main → renderer: configurações mudaram (ex.: "Silenciar conversa" no toast). */
  SettingsChanged: 'settings:changed',
  NotificationTest: 'notifications:test',
  RecentConversations: 'notifications:recent',
} as const;

export interface AppInfo {
  name: string;
  version: string;
  electron: string;
  chrome: string;
  platform: string;
}
