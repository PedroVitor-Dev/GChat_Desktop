// Sonda descartável: o Google permite login no Chat dentro do Electron SEM
// alterar o user-agent? Não falsifica nada: usa o UA padrão do Electron.
const { app, BrowserWindow, shell } = require('electron');

app.whenReady().then(() => {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'Sonda de login — GChat Desktop+',
    webPreferences: {
      partition: 'persist:spike-login', // sessão persistente isolada
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  console.log('User-Agent em uso:', win.webContents.getUserAgent());
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) shell.openExternal(url);
    return { action: 'deny' };
  });
  // Sem sessão, chat.google.com cai na página de marketing; vai direto ao login.
  win.loadURL('https://accounts.google.com/ServiceLogin?continue=https%3A%2F%2Fchat.google.com%2F');
});

app.on('window-all-closed', () => app.quit());
