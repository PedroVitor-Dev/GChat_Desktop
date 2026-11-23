import { join } from 'node:path';
import { BrowserWindow, Menu, nativeTheme, shell, type WebContents } from 'electron';
import { CHAT_URL, LOGIN_URL, decideNavigation, decidePopup, isLoggedOutLanding } from './policy';
import { diagnosticsArgs } from './diagnostics';
import { getChatSession } from './session';

const openExternal = (url: string): void => {
  void shell.openExternal(url);
};

/** Aplica as regras de navegação a um webContents do Chat (janela principal ou popup). */
function applyChatPolicy(contents: WebContents): void {
  const onNavigate = (event: Electron.Event, url: string) => {
    const decision = decideNavigation(url, contents.getURL());
    if (decision === 'allow') return;
    event.preventDefault();
    if (decision === 'external') openExternal(url);
  };
  contents.on('will-navigate', onNavigate);
  contents.on('will-redirect', onNavigate);

  contents.setWindowOpenHandler(({ url }) => {
    const decision = decidePopup(url);
    if (decision === 'child') {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 520,
          height: 680,
          autoHideMenuBar: true,
          webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false },
        },
      };
    }
    if (decision === 'external') openExternal(url);
    return { action: 'deny' };
  });
  contents.on('did-create-window', (child) => applyChatPolicy(child.webContents));
  contents.on('will-attach-webview', (event) => event.preventDefault());
  contents.on('context-menu', (_event, params) => showContextMenu(contents, params));
}

/** Menu de contexto em pt-BR com sugestões do corretor ortográfico. */
function showContextMenu(contents: WebContents, params: Electron.ContextMenuParams): void {
  const items: Electron.MenuItemConstructorOptions[] = [];

  if (params.misspelledWord) {
    for (const suggestion of params.dictionarySuggestions.slice(0, 5)) {
      items.push({ label: suggestion, click: () => contents.replaceMisspelling(suggestion) });
    }
    if (params.dictionarySuggestions.length === 0) {
      items.push({ label: 'Sem sugestões', enabled: false });
    }
    items.push(
      {
        label: 'Adicionar ao dicionário',
        click: () => contents.session.addWordToSpellCheckerDictionary(params.misspelledWord),
      },
      { type: 'separator' },
    );
  }

  if (params.linkURL && /^https?:/.test(params.linkURL)) {
    items.push(
      { label: 'Abrir link no navegador', click: () => openExternal(params.linkURL) },
      { type: 'separator' },
    );
  }

  const { editFlags } = params;
  if (params.isEditable) {
    items.push(
      { label: 'Recortar', role: 'cut', enabled: editFlags.canCut },
      { label: 'Copiar', role: 'copy', enabled: editFlags.canCopy },
      { label: 'Colar', role: 'paste', enabled: editFlags.canPaste },
      { label: 'Selecionar tudo', role: 'selectAll' },
    );
  } else if (params.selectionText) {
    items.push({ label: 'Copiar', role: 'copy' });
  } else if (params.linkURL) {
    items.push({ label: 'Copiar endereço do link', click: () => contents.copy() });
  }

  if (items.length > 0) Menu.buildFromTemplate(items).popup();
}

export function createChatWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 720,
    minHeight: 500,
    show: false,
    title: 'Google Chat — GChat Desktop+',
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#202124' : '#ffffff',
    autoHideMenuBar: true,
    webPreferences: {
      session: getChatSession(),
      preload: join(import.meta.dirname, '../preload/chat.cjs'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: false,
      spellcheck: true,
      additionalArguments: diagnosticsArgs(),
    },
  });

  applyChatPolicy(win.webContents);

  // Sem sessão, o Chat mostra a página de produto: leva direto ao login oficial.
  win.webContents.on('did-navigate', (_event, url) => {
    if (isLoggedOutLanding(url)) void win.loadURL(LOGIN_URL);
  });

  win.once('ready-to-show', () => win.show());
  void win.loadURL(CHAT_URL);
  return win;
}
