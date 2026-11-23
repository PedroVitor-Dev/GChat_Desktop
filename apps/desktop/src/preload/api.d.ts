import type { AppInfo } from '../shared/ipc';
import type { Settings, SettingsPatch } from '../shared/settings';

export interface GChatApi {
  getAppInfo(): Promise<AppInfo>;
  getSettings(): Promise<Settings>;
  /** Aplica um patch parcial; retorna as configurações resultantes. */
  updateSettings(patch: SettingsPatch): Promise<Settings>;
  /** Assina mudanças feitas fora desta tela. Retorna a função para cancelar. */
  onSettingsChanged(listener: (settings: Settings) => void): () => void;
  /** Exibe um toast de teste. `false` se o sistema não suporta notificações. */
  testNotification(): Promise<boolean>;
  /** Nomes das conversas que notificaram recentemente (sem conteúdo). */
  getRecentConversations(): Promise<string[]>;
}

declare global {
  interface Window {
    readonly gchat: GChatApi;
  }
}
