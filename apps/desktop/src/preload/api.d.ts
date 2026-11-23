import type { AppInfo } from '../shared/ipc';

export interface GChatApi {
  getAppInfo(): Promise<AppInfo>;
}

declare global {
  interface Window {
    readonly gchat: GChatApi;
  }
}
