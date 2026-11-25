import { app } from 'electron';
import { isStoreBuild } from './store';

/** Argumento usado quando o Windows abre o app no login. */
export const HIDDEN_ARG = '--hidden';
const LOGIN_ARGS = [HIDDEN_ARG];

export type { AutostartStatus } from '../../shared/ipc';
import type { AutostartStatus } from '../../shared/ipc';

export function autostartStatus(): AutostartStatus {
  if (!app.isPackaged || process.platform !== 'win32') {
    return { supported: false, active: false, reason: 'dev' };
  }
  // Dentro do MSIX o registro comum (HKCU\\...\\Run) não vale.
  if (isStoreBuild()) return { supported: false, active: false, reason: 'store' };
  const s = app.getLoginItemSettings({ args: LOGIN_ARGS });
  return { supported: true, active: s.executableWillLaunchAtLogin };
}

/** Registra/remove a entrada de inicialização do Windows (HKCU\...\Run). */
export function setLaunchAtLogin(enabled: boolean): void {
  if (!app.isPackaged || process.platform !== 'win32' || isStoreBuild()) return;
  app.setLoginItemSettings({ openAtLogin: enabled, args: LOGIN_ARGS });
}

/** Tarefas da Jump List (botão direito no ícone da barra de tarefas). */
export function setJumpList(): void {
  // No MSIX o executável fica numa pasta protegida: tarefas da Jump List não abrem.
  if (!app.isPackaged || process.platform !== 'win32' || isStoreBuild()) return;
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
