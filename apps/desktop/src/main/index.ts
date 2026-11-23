import { join } from 'node:path';
import { BrowserWindow, app, nativeTheme } from 'electron';
import { registerIpc } from './ipc';
import { applySecurityPolicies } from './security';

const APP_ID = 'com.pedrovitor.gchatdesktopplus';

let settingsWindow: BrowserWindow | null = null;

function createSettingsWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 960,
    height: 640,
    minWidth: 760,
    minHeight: 520,
    show: false,
    title: 'GChat Desktop+',
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#202020' : '#f3f3f3',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(import.meta.dirname, '../preload/index.cjs'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: false,
      spellcheck: false,
    },
  });

  win.once('ready-to-show', () => win.show());
  win.on('closed', () => {
    settingsWindow = null;
  });

  const devUrl = process.env['ELECTRON_RENDERER_URL'];
  if (!app.isPackaged && devUrl) {
    void win.loadURL(devUrl);
  } else {
    void win.loadFile(join(import.meta.dirname, '../renderer/index.html'));
  }
  return win;
}

function showSettings(): void {
  if (!settingsWindow) settingsWindow = createSettingsWindow();
  if (settingsWindow.isMinimized()) settingsWindow.restore();
  settingsWindow.show();
  settingsWindow.focus();
}

// Uma única instância: o native-host e atalhos sempre falam com o mesmo processo.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', showSettings);
  app.setAppUserModelId(APP_ID); // necessário para toasts nativos no Windows

  void app.whenReady().then(() => {
    applySecurityPolicies();
    registerIpc();
    showSettings();
  });

  // Fase 6 trocará isto por "continuar na bandeja".
  app.on('window-all-closed', () => app.quit());
}
