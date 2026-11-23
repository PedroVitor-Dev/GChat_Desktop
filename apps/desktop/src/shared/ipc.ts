/** Canais IPC entre renderer e main. Lista fechada: nada fora dela é aceito. */
export const IpcChannel = {
  AppInfo: 'app:info',
  SettingsGet: 'settings:get',
  SettingsUpdate: 'settings:update',
  /** main → renderer: configurações mudaram (ex.: "Silenciar conversa" no toast). */
  SettingsChanged: 'settings:changed',
  NotificationTest: 'notifications:test',
  RecentConversations: 'notifications:recent',
  SoundOptions: 'sounds:options',
  SoundPreview: 'sounds:preview',
  SoundImport: 'sounds:import',
  SoundRemove: 'sounds:remove',
  AutostartStatus: 'system:autostart-status',
  AccountAdd: 'accounts:add',
  AccountRename: 'accounts:rename',
  AccountSignOut: 'accounts:sign-out',
  AccountRemove: 'accounts:remove',
} as const;

export interface AutostartStatus {
  /** Só o app instalado pode se registrar para abrir com o Windows. */
  supported: boolean;
  /** Vai abrir no próximo login. */
  active: boolean;
}

export interface AppInfo {
  name: string;
  version: string;
  electron: string;
  chrome: string;
  platform: string;
}
