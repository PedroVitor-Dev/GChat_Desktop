import { app } from 'electron';

/** Argumento usado quando o Windows abre o app no login. */
export const HIDDEN_ARG = '--hidden';
const LOGIN_ARGS = [HIDDEN_ARG];

export type { AutostartStatus } from '../../shared/ipc';
import type { AutostartStatus } from '../../shared/ipc';

export function autostartStatus(): AutostartStatus {
  if (!app.isPackaged || process.platform !== 'win32') return { supported: false, active: false };
  const s = app.getLoginItemSettings({ args: LOGIN_ARGS });
  return { supported: true, active: s.executableWillLaunchAtLogin };
}

/** Registra/remove a entrada de inicialização do Windows (HKCU\...\Run). */
export function setLaunchAtLogin(enabled: boolean): void {
  if (!app.isPackaged || process.platform !== 'win32') return;
  app.setLoginItemSettings({ openAtLogin: enabled, args: LOGIN_ARGS });
}

/** Tarefas da Jump List (botão direito no ícone da barra de tarefas). */
export function setJumpList(): void {
  if (!app.isPackaged || process.platform !== 'win32') return;
  app.setUserTasks([
    {
      program: process.execPath,
      arguments: '--settings',
      iconPath: process.execPath,
      iconIndex: 0,
      title: 'Configurações',
      description: 'Abrir as configurações do GChat Desktop+',
    },
  ]);
}
