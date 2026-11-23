import { BrowserWindow, Menu, app, type MenuItemConstructorOptions } from 'electron';

interface MenuActions {
  showSettings: () => void;
  showChat: () => void;
}

/** Menu da janela do Chat (oculto; aparece com Alt). Atalhos valem mesmo oculto. */
export function buildAppMenu({ showSettings, showChat }: MenuActions): void {
  const focused = () => BrowserWindow.getFocusedWindow()?.webContents;

  const template: MenuItemConstructorOptions[] = [
    {
      label: '&Arquivo',
      submenu: [
        { label: 'Abrir Google Chat', click: showChat },
        { label: 'Configurações', accelerator: 'CmdOrCtrl+,', click: showSettings },
        { type: 'separator' },
        { label: 'Sair', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() },
      ],
    },
    {
      label: '&Editar',
      submenu: [
        { label: 'Desfazer', role: 'undo' },
        { label: 'Refazer', role: 'redo' },
        { type: 'separator' },
        { label: 'Recortar', role: 'cut' },
        { label: 'Copiar', role: 'copy' },
        { label: 'Colar', role: 'paste' },
        { label: 'Colar sem formatação', role: 'pasteAndMatchStyle' },
        { label: 'Selecionar tudo', role: 'selectAll' },
      ],
    },
    {
      label: '&Exibir',
      submenu: [
        { label: 'Recarregar', accelerator: 'F5', click: () => focused()?.reload() },
        {
          label: 'Voltar',
          accelerator: 'Alt+Left',
          click: () => focused()?.navigationHistory.goBack(),
        },
        { type: 'separator' },
        { label: 'Aumentar zoom', role: 'zoomIn', accelerator: 'CmdOrCtrl+=' },
        { label: 'Diminuir zoom', role: 'zoomOut' },
        { label: 'Zoom padrão', role: 'resetZoom' },
        { type: 'separator' },
        { label: 'Tela cheia', role: 'togglefullscreen' },
        ...(app.isPackaged
          ? []
          : [{ label: 'Ferramentas do desenvolvedor', role: 'toggleDevTools' } as const]),
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
