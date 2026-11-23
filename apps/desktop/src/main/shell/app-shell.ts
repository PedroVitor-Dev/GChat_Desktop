import { join } from 'node:path';
import {
  BrowserWindow,
  app,
  nativeImage,
  nativeTheme,
  type Input,
  type NativeImage,
  type WebContents,
  type WebContentsView,
  screen,
} from 'electron';
import { SHELL_LAYOUT, ShellChannel, type ShellState } from '../../shared/shell';
import type { AppearanceSettings } from '../../shared/settings';
import chatThemeCss from '../chat/chat-theme.css?raw';
import { createChatView } from '../chat/chat-view';
import { diagnosticsEnabled } from '../chat/diagnostics';
import { appIcon } from '../system/app-icon';
import {
  MIN_SIZE,
  fitToDisplays,
  type WindowState,
  type WindowStateFile,
} from '../system/window-state';

export interface ShellOptions {
  appearance: AppearanceSettings;
  /** Abrir sem mostrar a janela (início com o Windows → só bandeja). */
  startHidden: boolean;
  windowState: WindowStateFile;
  /** Consultado ao fechar: true = esconder na bandeja em vez de encerrar. */
  shouldHideOnClose: () => boolean;
  /** Chamado na primeira vez que a janela vai para a bandeja ao fechar. */
  onHiddenToTray: () => void;
  /** Mudança no número de não lidas (bandeja). */
  onUnreadChange: (count: number) => void;
}

/** Cores da barra de título nativa (botões minimizar/maximizar/fechar do Windows). */
const TITLE_BAR = {
  dark: { color: '#1e1f22', symbolColor: '#b5bac1' },
  light: { color: '#e3e5e8', symbolColor: '#4e5058' },
} as const;

/** Bolinha vermelha para o ícone da barra de tarefas (não lidas). */
function badgeImage(): NativeImage {
  const size = 16;
  const px = Buffer.alloc(size * size * 4);
  const c = (size - 1) / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - c, y - c);
      const alpha = Math.max(0, Math.min(1, 7.5 - d)); // borda suavizada
      const i = (y * size + x) * 4;
      px[i] = 0x3c; // B
      px[i + 1] = 0x37; // G
      px[i + 2] = 0xda; // R
      px[i + 3] = Math.round(alpha * 255);
    }
  }
  return nativeImage.createFromBitmap(px, { width: size, height: size });
}

/**
 * Janela principal no estilo Discord:
 * - barra de título própria (botões nativos do Windows via titleBarOverlay);
 * - trilho de ícones à esquerda e configurações em tela cheia (renderer local);
 * - o Google Chat numa WebContentsView isolada, com canto arredondado.
 */
export class AppShell {
  readonly window: BrowserWindow;
  readonly chat: WebContentsView;
  private state: ShellState;
  private chatCssKey: string | null = null;
  private appearance: AppearanceSettings;
  private badge: NativeImage | null = null;
  private quitting = false;

  constructor(private readonly options: ShellOptions) {
    const { appearance } = options;
    this.appearance = appearance;
    this.state = {
      settingsOpen: false,
      unread: 0,
      chatTitle: 'Google Chat',
      chatLoading: true,
      theme: this.resolveTheme(appearance),
    };

    const bounds = fitToDisplays(
      options.windowState.load(),
      [screen.getPrimaryDisplay(), ...screen.getAllDisplays()].map((d) => d.workArea),
    );
    this.window = new BrowserWindow({
      icon: appIcon(),
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      minWidth: MIN_SIZE.width,
      minHeight: MIN_SIZE.height,
      show: false,
      title: 'GChat Desktop+',
      backgroundColor: TITLE_BAR[this.state.theme].color,
      titleBarStyle: 'hidden',
      titleBarOverlay: { ...TITLE_BAR[this.state.theme], height: SHELL_LAYOUT.titleBarHeight },
      webPreferences: {
        preload: join(import.meta.dirname, '../preload/index.cjs'),
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
        webviewTag: false,
        spellcheck: false,
      },
    });

    this.chat = createChatView();
    this.chat.setBorderRadius(SHELL_LAYOUT.contentRadius);
    this.chat.setBackgroundColor(this.state.theme === 'dark' ? '#313338' : '#ffffff');
    this.chat.setVisible(false); // aparece após o primeiro carregamento (sem flash branco)
    this.window.contentView.addChildView(this.chat);

    this.wireChat();
    this.wireWindow();
    nativeTheme.themeSource = appearance.theme;

    const devUrl = process.env['ELECTRON_RENDERER_URL'];
    if (!app.isPackaged && devUrl) void this.window.loadURL(devUrl);
    else void this.window.loadFile(join(import.meta.dirname, '../renderer/index.html'));
    this.window.once('ready-to-show', () => {
      if (bounds.maximized) this.window.maximize();
      if (!options.startHidden) this.window.show();
    });
  }

  /** Chamado em before-quit: a partir daqui, fechar a janela encerra de verdade. */
  markQuitting(): void {
    this.quitting = true;
  }

  /** Esconde a janela (continua rodando na bandeja). */
  hide(): void {
    this.window.hide();
  }

  getState(): ShellState {
    return this.state;
  }

  /** Traz a janela para frente e mostra o Chat (fecha as configurações). */
  focusChat(): void {
    this.reveal();
    if (this.state.settingsOpen) this.setSettingsOpen(false);
    this.chat.webContents.focus();
  }

  openSettings(): void {
    this.reveal();
    this.setSettingsOpen(true);
  }

  setSettingsOpen(open: boolean): void {
    this.update({ settingsOpen: open });
    this.chat.setVisible(!open && !this.state.chatLoading);
    if (open) this.window.webContents.focus();
    else this.chat.webContents.focus();
  }

  reloadChat(): void {
    this.chat.webContents.reload();
  }

  /** Chamado pelo Notification Manager a cada toast exibido. */
  onNotificationShown(): void {
    if (this.isLookingAtChat()) return;
    this.update({ unread: this.state.unread + 1 });
    this.window.flashFrame(true);
  }

  applyAppearance(appearance: AppearanceSettings): void {
    const themeChanged = appearance.theme !== this.appearance.theme;
    const chatThemeChanged = appearance.chatTheme !== this.appearance.chatTheme;
    this.appearance = appearance;
    if (nativeTheme.themeSource !== appearance.theme) {
      nativeTheme.themeSource = appearance.theme; // o Chat (tema "sistema") acompanha
    }
    if (themeChanged || !this.window.isVisible()) this.refreshTheme();
    if (chatThemeChanged) void this.applyChatTheme();
  }

  /** Recalcula o tema efetivo e repinta a moldura (sem mexer em nativeTheme). */
  private refreshTheme(): void {
    const theme = this.resolveTheme(this.appearance);
    this.window.setTitleBarOverlay({ ...TITLE_BAR[theme], height: SHELL_LAYOUT.titleBarHeight });
    this.window.setBackgroundColor(TITLE_BAR[theme].color);
    this.chat.setBackgroundColor(theme === 'dark' ? '#313338' : '#ffffff');
    if (theme !== this.state.theme) this.update({ theme });
  }

  private resolveTheme(appearance: AppearanceSettings): 'dark' | 'light' {
    if (appearance.theme !== 'system') return appearance.theme;
    return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
  }

  /** Aplica ou remove o tema experimental conforme a configuração atual. */
  private async applyChatTheme(): Promise<void> {
    const contents = this.chat.webContents;
    if (this.chatCssKey) {
      await contents.removeInsertedCSS(this.chatCssKey).catch(() => undefined);
      this.chatCssKey = null;
    }
    if (this.appearance.chatTheme && !contents.isLoading()) {
      this.chatCssKey = await contents.insertCSS(chatThemeCss, { cssOrigin: 'user' });
    }
  }

  private isLookingAtChat(): boolean {
    return this.window.isFocused() && !this.window.isMinimized() && !this.state.settingsOpen;
  }

  private reveal(): void {
    if (this.window.isMinimized()) this.window.restore();
    this.window.show();
    this.window.focus();
  }

  private layout(): void {
    const { width, height } = this.window.getContentBounds();
    const { railWidth, titleBarHeight } = SHELL_LAYOUT;
    this.chat.setBounds({
      x: railWidth,
      y: titleBarHeight,
      width: Math.max(0, width - railWidth),
      height: Math.max(0, height - titleBarHeight),
    });
  }

  private wireWindow(): void {
    this.layout();
    this.window.on('resize', () => {
      this.layout();
      this.saveBounds();
    });
    this.window.on('move', () => this.saveBounds());
    this.window.on('maximize', () => this.saveBounds());
    this.window.on('unmaximize', () => this.saveBounds());
    this.window.on('close', (event) => {
      this.saveBounds(0);
      if (this.quitting || !this.options.shouldHideOnClose()) return;
      event.preventDefault();
      this.window.hide();
      this.options.onHiddenToTray();
    });
    this.window.on('focus', () => {
      if (!this.state.settingsOpen) this.clearUnread();
    });
    // Atalhos valem em qualquer parte da janela (shell ou Chat).
    this.window.webContents.on('before-input-event', (e, input) => this.onKey(e, input));
    this.chat.webContents.on('before-input-event', (e, input) => this.onKey(e, input));
    // Tema "sistema": acompanha a troca de claro/escuro do Windows.
    nativeTheme.on('updated', () => this.refreshTheme());
  }

  private wireChat(): void {
    const contents = this.chat.webContents;
    contents.on('page-title-updated', (_e, title) => this.update({ chatTitle: title }));
    contents.on('did-finish-load', () => {
      if (this.state.chatLoading) {
        this.update({ chatLoading: false });
        this.chat.setVisible(!this.state.settingsOpen);
      }
      // O CSS injetado se perde a cada carregamento: reaplica se estiver ligado.
      this.chatCssKey = null;
      if (this.appearance.chatTheme) void this.applyChatTheme();
      if (diagnosticsEnabled) void this.logThemeTokens(contents);
    });
  }

  /** Diagnóstico do tema experimental: os tokens M3 existem na página? (sem conteúdo) */
  private async logThemeTokens(contents: WebContents): Promise<void> {
    const found = await contents
      .executeJavaScript(
        `getComputedStyle(document.documentElement).getPropertyValue('--gm3-sys-color-surface') !== ''`,
      )
      .catch(() => null);
    console.error(
      `[diag] tokens Material 3 na página: ${found === null ? 'erro' : found ? 'presentes' : 'ausentes'}`,
    );
  }

  private onKey(event: Electron.Event, input: Input): void {
    if (input.type !== 'keyDown') return;
    const ctrl = input.control || input.meta;
    const key = input.key.toLowerCase();
    const handled = (fn: () => void) => {
      event.preventDefault();
      fn();
    };

    if (ctrl && key === 'q') return handled(() => app.quit());
    if (ctrl && key === ',') return handled(() => this.setSettingsOpen(!this.state.settingsOpen));
    if (key === 'escape' && this.state.settingsOpen)
      return handled(() => this.setSettingsOpen(false));
    if (key === 'f5' || (ctrl && key === 'r')) return handled(() => this.reloadChat());
    if (ctrl && (key === '=' || key === '+')) return handled(() => this.zoom(0.5));
    if (ctrl && key === '-') return handled(() => this.zoom(-0.5));
    if (ctrl && key === '0') return handled(() => this.chat.webContents.setZoomLevel(0));
    if (input.alt && key === 'arrowleft') {
      return handled(() => this.chat.webContents.navigationHistory.goBack());
    }
    if (!app.isPackaged && ctrl && input.shift && key === 'i') {
      return handled(() =>
        (this.state.settingsOpen
          ? this.window.webContents
          : this.chat.webContents
        ).toggleDevTools(),
      );
    }
  }

  private saveBounds(delayMs?: number): void {
    if (this.window.isDestroyed() || this.window.isMinimized()) return;
    const maximized = this.window.isMaximized();
    // Maximizada: guarda o tamanho "normal" para quando o usuário restaurar.
    const b = maximized ? this.window.getNormalBounds() : this.window.getBounds();
    const state: WindowState = { ...b, maximized };
    this.options.windowState.save(state, delayMs);
  }

  private zoom(delta: number): void {
    const level = this.chat.webContents.getZoomLevel() + delta;
    this.chat.webContents.setZoomLevel(Math.max(-3, Math.min(3, level)));
  }

  private clearUnread(): void {
    this.window.flashFrame(false);
    if (this.state.unread > 0) this.update({ unread: 0 });
  }

  private update(patch: Partial<ShellState>): void {
    this.state = { ...this.state, ...patch };
    if ('unread' in patch) {
      this.options.onUnreadChange(this.state.unread);
      this.badge ??= badgeImage();
      this.window.setOverlayIcon(
        this.state.unread > 0 ? this.badge : null,
        this.state.unread > 0 ? `${this.state.unread} novas mensagens` : '',
      );
    }
    if (!this.window.webContents.isDestroyed()) {
      this.window.webContents.send(ShellChannel.State, this.state);
    }
  }
}
