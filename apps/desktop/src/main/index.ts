import { join } from 'node:path';
import { BrowserWindow, app, nativeTheme } from 'electron';
import { createChatWindow } from './chat/chat-window';
import { registerChatDiagnostics } from './chat/diagnostics';
import { registerIpc } from './ipc';
import { buildAppMenu } from './menu';
import { applySecurityPolicies } from './security';

const APP_ID = 'com.pedrovitor.gchatdesktopplus';

let chatWindow: BrowserWindow | null = null;
let settingsWindow: BrowserWindow | null = null;

function createSettingsWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 960,
    height: 640,
    minWidth: 760,
    minHeight: 520,
    show: false,
    title: 'Configurações — GChat Desktop+',
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

  win.setMenu(null);
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

function reveal(win: BrowserWindow): void {
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

function showSettings(): void {
  settingsWindow ??= createSettingsWindow();
  reveal(settingsWindow);
}

function showChat(): void {
  if (!chatWindow) {
    chatWindow = createChatWindow();
    chatWindow.on('closed', () => {
      chatWindow = null;
    });
  }
  reveal(chatWindow);
}

// Uma única instância: abrir o atalho de novo só traz a janela para frente.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', showChat);
  app.setAppUserModelId(APP_ID); // necessário para toasts nativos no Windows

  void app.whenReady().then(() => {
    applySecurityPolicies();
    registerIpc();
    registerChatDiagnostics();
    buildAppMenu({ showSettings, showChat });
    showChat();
  });

  // Fase 6 trocará isto por "continuar na bandeja".
  app.on('window-all-closed', () => app.quit());
}
