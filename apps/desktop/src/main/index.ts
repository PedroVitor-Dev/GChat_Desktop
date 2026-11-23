import { join } from 'node:path';
import { BrowserWindow, app, nativeTheme } from 'electron';
import { createChatWindow } from './chat/chat-window';
import { registerIpc } from './ipc';
import { buildAppMenu } from './menu';
import { listenForCaptures } from './notifications/capture-listener';
import { NotificationManager } from './notifications/manager';
import { applySecurityPolicies } from './security';
import { SettingsStore } from './store/settings-store';
import { appIcon } from './system/app-icon';

const APP_ID = 'com.pedrovitor.gchatdesktopplus';

let chatWindow: BrowserWindow | null = null;
let settingsWindow: BrowserWindow | null = null;

function createSettingsWindow(): BrowserWindow {
  const win = new BrowserWindow({
    icon: appIcon(),
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
    // Para o alerta da barra de tarefas quando o usuário volta ao Chat.
    chatWindow.on('focus', () => chatWindow?.flashFrame(false));
  }
  reveal(chatWindow);
}

// Uma única instância: abrir o atalho de novo só traz a janela para frente.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  // `--settings` abre as configurações (usado por atalhos e, na Fase 6, pela Jump List).
  const route = (argv: string[]) => (argv.includes('--settings') ? showSettings() : showChat());
  app.on('second-instance', (_event, argv) => route(argv));
  app.setAppUserModelId(APP_ID); // necessário para toasts nativos no Windows

  void app.whenReady().then(() => {
    const settings = new SettingsStore();
    const notifications = new NotificationManager({ settings, getChatWindow: () => chatWindow });

    applySecurityPolicies();
    registerIpc({ settings, notifications });
    listenForCaptures(notifications);
    buildAppMenu({ showSettings, showChat });
    showChat(); // a janela do Chat é necessária para receber mensagens
    if (process.argv.includes('--settings')) showSettings();

    // Garante que a última alteração de configuração chegue ao disco.
    let flushed = false;
    app.on('before-quit', (event) => {
      if (flushed) return;
      event.preventDefault();
      flushed = true;
      void settings.flush().finally(() => app.quit());
    });
  });

  // Fase 6 trocará isto por "continuar na bandeja".
  app.on('window-all-closed', () => app.quit());
}
