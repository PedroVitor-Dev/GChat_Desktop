import { join } from 'node:path';
import { BrowserWindow, app, screen, type Rectangle, type WebContentsView } from 'electron';
import { MINIPLAYER } from '../../shared/shell';

/**
 * Miniplayer da chamada: janelinha flutuante, sempre por cima, com o vídeo do
 * Meet, o tempo e os botões de voltar/sair (como no Discord e no Meet).
 *
 * Não abre outra página do Meet: a MESMA view da chamada muda de janela e volta
 * depois, então a chamada não cai nem recarrega. A faixa de cima é o renderer do
 * app (rota #mini); o vídeo fica logo abaixo dela.
 */
export class MiniPlayer {
  private win: BrowserWindow | null = null;
  private view: WebContentsView | null = null;
  /** Posição e tamanho escolhidos pelo usuário (valem até fechar o app). */
  private lastBounds: Rectangle | null = null;

  constructor(
    private readonly options: {
      /** Janela principal (para abrir o mini no mesmo monitor). */
      near: () => Rectangle;
      /** O usuário fechou o mini (Alt+F4): a chamada continua. */
      onUserClose: () => void;
    },
  ) {}

  get contents(): Electron.WebContents | null {
    return this.win && !this.win.isDestroyed() ? this.win.webContents : null;
  }

  isShowing(): boolean {
    return !!this.view && !!this.win && !this.win.isDestroyed() && this.win.isVisible();
  }

  /** Passa a view da chamada para o mini e mostra (sem roubar o foco). */
  show(view: WebContentsView): void {
    const win = this.ensureWindow();
    if (this.view !== view) {
      if (this.view) win.contentView.removeChildView(this.view);
      this.view = view;
      win.contentView.addChildView(view);
    }
    view.setVisible(true);
    // Em 400 px o Meet aperta tudo: mostra "de longe" (layout de tela maior, menor).
    if (!view.webContents.isDestroyed()) view.webContents.setZoomFactor(MINIPLAYER.zoom);
    this.layout();
    if (!win.isVisible()) win.showInactive();
  }

  /** Devolve a view da chamada (para voltar à janela principal) e esconde o mini. */
  take(): WebContentsView | null {
    const view = this.view;
    this.view = null;
    if (view && !view.webContents.isDestroyed()) view.webContents.setZoomFactor(1);
    if (this.win && !this.win.isDestroyed()) {
      if (view) this.win.contentView.removeChildView(view);
      if (this.win.isVisible()) {
        this.lastBounds = this.win.getBounds();
        this.win.hide();
      }
    }
    return view;
  }

  destroy(): void {
    this.view = null;
    if (this.win && !this.win.isDestroyed()) this.win.destroy();
    this.win = null;
  }

  private ensureWindow(): BrowserWindow {
    if (this.win && !this.win.isDestroyed()) return this.win;
    const bounds = this.lastBounds ?? this.defaultBounds();
    const win = new BrowserWindow({
      ...bounds,
      minWidth: MINIPLAYER.minWidth,
      minHeight: MINIPLAYER.minHeight,
      frame: false,
      show: false,
      resizable: true,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      title: 'Chamada · GChat Desktop+',
      backgroundColor: '#202124',
      webPreferences: {
        preload: join(import.meta.dirname, '../preload/index.cjs'),
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
        webviewTag: false,
        spellcheck: false,
      },
    });
    // Acima de janelas comuns, inclusive com outra em tela cheia de janela.
    win.setAlwaysOnTop(true, 'floating');
    win.on('resize', () => this.layout());
    win.on('moved', () => (this.lastBounds = win.getBounds()));
    win.on('close', (e) => {
      // Alt+F4 fecha só o mini; a chamada segue (volta pelo selo da barra de título).
      if (!app.isReady() || win.isDestroyed()) return;
      e.preventDefault();
      this.options.onUserClose();
    });
    const devUrl = process.env['ELECTRON_RENDERER_URL'];
    if (!app.isPackaged && devUrl) void win.loadURL(`${devUrl}#mini`);
    else void win.loadFile(join(import.meta.dirname, '../renderer/index.html'), { hash: 'mini' });
    this.win = win;
    return win;
  }

  /** Canto inferior direito do monitor da janela principal. */
  private defaultBounds(): Rectangle {
    const area = screen.getDisplayMatching(this.options.near()).workArea;
    const { width, height, margin } = MINIPLAYER;
    return {
      x: area.x + area.width - width - margin,
      y: area.y + area.height - height - margin,
      width,
      height,
    };
  }

  private layout(): void {
    if (!this.win || this.win.isDestroyed() || !this.view) return;
    const [width, height] = this.win.getContentSize() as [number, number];
    const top = MINIPLAYER.headerHeight;
    this.view.setBounds({ x: 0, y: top, width, height: Math.max(0, height - top) });
  }
}
