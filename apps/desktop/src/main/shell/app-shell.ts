import { join } from 'node:path';
import {
  BrowserWindow,
  app,
  nativeImage,
  nativeTheme,
  screen,
  type Input,
  type NativeImage,
  type WebContents,
  type WebContentsView,
} from 'electron';
import { partitionOf, type Account, type AccountsSettings } from '../../shared/accounts';
import type { AppearanceSettings } from '../../shared/settings';
import { STREAMER_OFF, type StreamerStatus } from '../../shared/streamer';
import { meetCodeFromUrl, meetUrl, type CallState, type Room } from '../../shared/rooms';
import { createMeetView } from '../meet/meet-view';
import {
  SHELL_LAYOUT,
  ShellChannel,
  type AccountView,
  type ShellState,
  type ShellView,
} from '../../shared/shell';
import chatThemeCss from '../chat/chat-theme.css?raw';
import { createChatView } from '../chat/chat-view';
import { diagnosticsEnabled } from '../chat/diagnostics';
import { CHAT_URL } from '../chat/policy';
import { appIcon } from '../system/app-icon';
import {
  MIN_SIZE,
  fitToDisplays,
  type WindowState,
  type WindowStateFile,
} from '../system/window-state';

export interface ShellOptions {
  appearance: AppearanceSettings;
  accounts: AccountsSettings;
  /** Abrir sem mostrar a janela (início com o Windows → só bandeja). */
  startHidden: boolean;
  windowState: WindowStateFile;
  /** Consultado ao fechar: true = esconder na bandeja em vez de encerrar. */
  shouldHideOnClose: () => boolean;
  /** Chamado na primeira vez que a janela vai para a bandeja ao fechar. */
  onHiddenToTray: () => void;
  /** Mudança no total de não lidas (bandeja). */
  onUnreadChange: (count: number) => void;
  /** O usuário trocou de conta no trilho (para persistir). */
  onActiveAccountChange: (id: string) => void;
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
      const alpha = Math.max(0, Math.min(1, 7.5 - Math.hypot(x - c, y - c)));
      const i = (y * size + x) * 4;
      px[i] = 0x3c; // B
      px[i + 1] = 0x37; // G
      px[i + 2] = 0xda; // R
      px[i + 3] = Math.round(alpha * 255);
    }
  }
  return nativeImage.createFromBitmap(px, { width: size, height: size });
}

/** Uma conta aberta: sua view do Chat e o estado exibido no trilho. */
interface ChatSlot {
  account: Account;
  view: WebContentsView;
  unread: number;
  loading: boolean;
  title: string;
  cssKey: string | null;
}

/**
 * Janela principal no estilo Discord:
 * - barra de título própria (botões nativos do Windows via titleBarOverlay);
 * - trilho com uma entrada por conta e configurações em tela cheia (renderer local);
 * - uma WebContentsView isolada do Google Chat por conta. Todas ficam carregadas
 *   (para receber notificações); só a da conta ativa aparece.
 */
export class AppShell {
  readonly window: BrowserWindow;
  private readonly slots = new Map<string, ChatSlot>();
  private active: string;
  private settingsOpen = false;
  private modalOpen = false;
  private theme: 'dark' | 'light';
  private appearance: AppearanceSettings;
  private badge: NativeImage | null = null;
  private quitting = false;
  private lastTotalUnread = 0;
  private streamer: StreamerStatus = STREAMER_OFF;
  private relayoutTimers: NodeJS.Timeout[] = [];
  private view: ShellView = 'chat';
  /** Chamada do Meet em andamento: view própria, continua tocando em segundo plano. */
  private call: { view: WebContentsView; state: CallState } | null = null;

  constructor(private readonly options: ShellOptions) {
    this.appearance = options.appearance;
    this.theme = this.resolveTheme(options.appearance);
    this.active = options.accounts.active;

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
      backgroundColor: TITLE_BAR[this.theme].color,
      titleBarStyle: 'hidden',
      titleBarOverlay: { ...TITLE_BAR[this.theme], height: SHELL_LAYOUT.titleBarHeight },
      webPreferences: {
        preload: join(import.meta.dirname, '../preload/index.cjs'),
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
        webviewTag: false,
        spellcheck: false,
      },
    });

    nativeTheme.themeSource = options.appearance.theme;
    this.syncAccounts(options.accounts);
    this.wireWindow();

    const devUrl = process.env['ELECTRON_RENDERER_URL'];
    if (!app.isPackaged && devUrl) void this.window.loadURL(devUrl);
    else void this.window.loadFile(join(import.meta.dirname, '../renderer/index.html'));
    this.window.once('ready-to-show', () => {
      if (bounds.maximized) this.window.maximize();
      if (!options.startHidden) this.window.show();
    });
  }

  // ───────────────────────────── API pública ─────────────────────────────

  getState(): ShellState {
    const accounts: AccountView[] = [...this.slots.values()].map((s) => ({
      id: s.account.id,
      name: s.account.name,
      color: s.account.color,
      unread: s.unread,
      loading: s.loading,
      title: s.title,
    }));
    return {
      settingsOpen: this.settingsOpen,
      modalOpen: this.modalOpen,
      accounts,
      activeAccount: this.active,
      unread: accounts.reduce((sum, a) => sum + a.unread, 0),
      theme: this.theme,
      streamer: this.streamer,
      view: this.view,
      call: this.call?.state ?? null,
    };
  }

  /** Cria/remove/atualiza views conforme a lista de contas das configurações. */
  syncAccounts(accounts: AccountsSettings): void {
    for (const [id, slot] of this.slots) {
      if (!accounts.list.some((a) => a.id === id)) this.destroySlot(slot);
    }
    for (const account of accounts.list) {
      const slot = this.slots.get(account.id);
      if (slot) slot.account = account;
      else this.createSlot(account);
    }
    // Mantém a ordem das configurações (Map preserva ordem de inserção).
    const ordered = accounts.list.map((a) => this.slots.get(a.id)!);
    this.slots.clear();
    for (const s of ordered) this.slots.set(s.account.id, s);

    if (!this.slots.has(this.active)) this.active = accounts.active;
    if (!this.slots.has(this.active)) this.active = accounts.list[0]!.id;
    this.layout();
    this.refreshVisibility();
    this.emitState();
  }

  /** Conta dona de um webContents (usado para atribuir notificações). */
  accountIdFor(contents: WebContents): string | null {
    for (const [id, slot] of this.slots) if (slot.view.webContents === contents) return id;
    return null;
  }

  accountName(id: string): string | null {
    return this.slots.get(id)?.account.name ?? null;
  }

  accountCount(): number {
    return this.slots.size;
  }

  /** Mostra o Chat de uma conta (fecha as configurações e traz a janela). */
  focusChat(accountId: string = this.active): void {
    this.reveal();
    this.settingsOpen = false;
    this.modalOpen = false;
    this.selectAccount(accountId);
  }

  selectAccount(id: string): void {
    const slot = this.slots.get(id);
    if (!slot) return;
    this.view = 'chat'; // a chamada, se houver, continua em segundo plano
    if (this.active !== id) {
      this.active = id;
      this.options.onActiveAccountChange(id);
    }
    slot.unread = 0;
    this.refreshVisibility();
    if (!this.overlayOpen()) slot.view.webContents.focus();
    this.emitState();
  }

  openSettings(): void {
    this.reveal();
    this.setSettingsOpen(true);
  }

  setSettingsOpen(open: boolean): void {
    this.settingsOpen = open;
    this.refreshVisibility();
    if (open) this.window.webContents.focus();
    else this.activeSlot()?.view.webContents.focus();
    this.emitState();
  }

  setModalOpen(open: boolean): void {
    this.modalOpen = open;
    this.refreshVisibility();
    if (open) this.window.webContents.focus();
    this.emitState();
  }

  /** Troca o destino da área principal. Abrir as Salas fecha as configurações. */
  setView(view: ShellView): void {
    this.view = view;
    this.settingsOpen = false;
    this.layout();
    this.refreshVisibility();
    const target = view === 'rooms' ? this.call?.view : this.activeSlot()?.view;
    (target?.webContents ?? this.window.webContents).focus();
    this.emitState();
  }

  // ───────────────────────────── chamadas (Meet) ─────────────────────────────

  /** Entra numa sala. Se já estiver em outra, sai dela antes. */
  startCall(room: Room): void {
    if (this.call?.state.roomId === room.id) return this.setView('rooms');
    this.endCall();
    const view = createMeetView(partitionOf(room.accountId));
    view.setBorderRadius(SHELL_LAYOUT.contentRadius);
    view.setBackgroundColor('#202124');
    this.window.contentView.addChildView(view);
    this.call = {
      view,
      state: {
        roomId: room.id,
        name: room.name,
        code: room.code,
        accountId: room.accountId,
        startedAt: Date.now(),
      },
    };
    const contents = view.webContents;
    // Saiu da reunião pela interface do Meet (voltou à tela inicial): encerra aqui também.
    contents.on('did-navigate', (_e, url) => {
      if (new URL(url).host === 'meet.google.com' && !meetCodeFromUrl(url)) this.endCall();
    });
    contents.on('render-process-gone', () => this.endCall());
    contents.on('before-input-event', (e, input) => this.onKey(e, input));
    void contents.loadURL(meetUrl(room.code));
    this.reveal();
    this.setView('rooms');
  }

  /** Sai da chamada (fecha a página do Meet). */
  endCall(): void {
    if (!this.call) return;
    const { view } = this.call;
    this.call = null;
    this.window.contentView.removeChildView(view);
    if (!view.webContents.isDestroyed()) view.webContents.close();
    this.refreshVisibility();
    this.emitState();
  }

  reloadChat(accountId: string = this.active): void {
    this.slots.get(accountId)?.view.webContents.reload();
  }

  /** Encerra a sessão Google de uma conta (apaga cookies e dados) e volta ao login. */
  async signOut(accountId: string): Promise<void> {
    const slot = this.slots.get(accountId);
    if (!slot) return;
    const ses = slot.view.webContents.session;
    await ses.clearStorageData();
    await ses.clearCache();
    slot.loading = true;
    this.refreshVisibility();
    this.emitState();
    void slot.view.webContents.loadURL(CHAT_URL);
  }

  /** Chamado pelo Notification Manager a cada toast exibido. */
  onNotificationShown(accountId: string | null): void {
    const slot = (accountId && this.slots.get(accountId)) || this.activeSlot();
    if (!slot) return;
    const lookingAtIt = this.isLookingAtChat() && slot.account.id === this.active;
    if (lookingAtIt) return;
    slot.unread += 1;
    if (!this.window.isFocused()) this.window.flashFrame(true);
    this.emitState();
  }

  /**
   * Grava em disco os cookies de todas as contas. O Chromium grava periodicamente;
   * isto garante que um login feito segundos antes de sair não se perca.
   */
  async flushSessions(): Promise<void> {
    await Promise.all(
      [...this.slots.values()].map((s) =>
        s.view.webContents.session.cookies.flushStore().catch(() => undefined),
      ),
    );
  }

  setStreamer(status: StreamerStatus): void {
    this.streamer = status;
    this.emitState();
  }

  markQuitting(): void {
    this.quitting = true;
    this.endCall();
  }

  hide(): void {
    this.window.hide();
  }

  applyAppearance(appearance: AppearanceSettings): void {
    const themeChanged = appearance.theme !== this.appearance.theme;
    const chatThemeChanged = appearance.chatTheme !== this.appearance.chatTheme;
    this.appearance = appearance;
    if (nativeTheme.themeSource !== appearance.theme) {
      nativeTheme.themeSource = appearance.theme; // o Chat (tema "sistema") acompanha
    }
    if (themeChanged) this.refreshTheme();
    if (chatThemeChanged) for (const slot of this.slots.values()) void this.applyChatTheme(slot);
  }

  // ───────────────────────────── contas/views ─────────────────────────────

  private createSlot(account: Account): ChatSlot {
    const view = createChatView(partitionOf(account.id));
    view.setBorderRadius(SHELL_LAYOUT.contentRadius);
    view.setBackgroundColor(this.theme === 'dark' ? '#313338' : '#ffffff');
    view.setVisible(false); // aparece após o primeiro carregamento (sem flash branco)
    this.window.contentView.addChildView(view);

    const slot: ChatSlot = {
      account,
      view,
      unread: 0,
      loading: true,
      title: 'Google Chat',
      cssKey: null,
    };
    this.slots.set(account.id, slot);

    const contents = view.webContents;
    contents.on('page-title-updated', (_e, title) => {
      slot.title = title;
      this.emitState();
    });
    contents.on('did-finish-load', () => {
      if (slot.loading) {
        slot.loading = false;
        this.refreshVisibility();
        this.emitState();
      }
      // O CSS injetado se perde a cada carregamento: reaplica se estiver ligado.
      slot.cssKey = null;
      if (this.appearance.chatTheme) void this.applyChatTheme(slot);
      if (diagnosticsEnabled) void this.logThemeTokens(contents);
    });
    contents.on('before-input-event', (e, input) => this.onKey(e, input));
    // Se a página do Chat travar ou o processo dela cair, recarrega sozinho.
    contents.on('render-process-gone', (_e, details) => {
      console.error(
        `[chat] processo da conta ${account.id} encerrou (${details.reason}); recarregando`,
      );
      if (details.reason !== 'clean-exit' && !contents.isDestroyed()) contents.reload();
    });
    contents.on('unresponsive', () => console.error(`[chat] conta ${account.id} sem resposta`));
    // Diagnóstico: a própria página do Chat está tocando som?
    if (diagnosticsEnabled) {
      contents.on('audio-state-changed', ({ audible }) =>
        console.error(
          `[diag ${new Date().toISOString()}] página do Chat (${account.id}) com áudio: ${audible ? 'sim' : 'não'}`,
        ),
      );
    }
    return slot;
  }

  private destroySlot(slot: ChatSlot): void {
    this.window.contentView.removeChildView(slot.view);
    slot.view.webContents.close();
    this.slots.delete(slot.account.id);
  }

  private activeSlot(): ChatSlot | undefined {
    return this.slots.get(this.active);
  }

  private overlayOpen(): boolean {
    return this.settingsOpen || this.modalOpen;
  }

  /** Só a view da conta ativa aparece, e só sem configurações/modal por cima. */
  private refreshVisibility(): void {
    const callShown = this.view === 'rooms' && !!this.call;
    for (const [id, slot] of this.slots) {
      slot.view.setVisible(
        this.view === 'chat' && id === this.active && !slot.loading && !this.overlayOpen(),
      );
    }
    this.call?.view.setVisible(callShown && !this.overlayOpen());
  }

  // ───────────────────────────── aparência ─────────────────────────────

  private refreshTheme(): void {
    const theme = this.resolveTheme(this.appearance);
    this.window.setTitleBarOverlay({ ...TITLE_BAR[theme], height: SHELL_LAYOUT.titleBarHeight });
    this.window.setBackgroundColor(TITLE_BAR[theme].color);
    for (const slot of this.slots.values()) {
      slot.view.setBackgroundColor(theme === 'dark' ? '#313338' : '#ffffff');
    }
    if (theme !== this.theme) {
      this.theme = theme;
      this.emitState();
    }
  }

  private resolveTheme(appearance: AppearanceSettings): 'dark' | 'light' {
    if (appearance.theme !== 'system') return appearance.theme;
    return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
  }

  /** Aplica ou remove o tema experimental numa conta. */
  private async applyChatTheme(slot: ChatSlot): Promise<void> {
    const contents = slot.view.webContents;
    if (contents.isDestroyed()) return;
    if (slot.cssKey) {
      await contents.removeInsertedCSS(slot.cssKey).catch(() => undefined);
      slot.cssKey = null;
    }
    if (this.appearance.chatTheme && !contents.isLoading()) {
      slot.cssKey = await contents.insertCSS(chatThemeCss, { cssOrigin: 'user' });
    }
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

  // ───────────────────────────── janela ─────────────────────────────

  private isLookingAtChat(): boolean {
    return (
      this.window.isVisible() &&
      this.window.isFocused() &&
      !this.window.isMinimized() &&
      !this.overlayOpen()
    );
  }

  private reveal(): void {
    if (this.window.isMinimized()) this.window.restore();
    this.window.show();
    this.window.focus();
  }

  /**
   * Posiciona as views do Chat na área de conteúdo. Ignora tamanhos degenerados
   * (janela minimizada ou no meio de uma troca de monitor): aplicar 0×0 deixaria
   * o Chat invisível até o próximo redimensionamento.
   * @returns false se o tamanho atual não era válido
   */
  private layout(): boolean {
    if (this.window.isDestroyed()) return true;
    const { width, height } = this.window.getContentBounds();
    const { railWidth, titleBarHeight, roomsPanelWidth } = SHELL_LAYOUT;
    const left = railWidth + (this.view === 'rooms' ? roomsPanelWidth : 0);
    const bounds = {
      x: left,
      y: titleBarHeight,
      width: width - left,
      height: height - titleBarHeight,
    };
    if (bounds.width < 100 || bounds.height < 100) return false;
    for (const slot of this.slots.values()) slot.view.setBounds(bounds);
    this.call?.view.setBounds(bounds);
    return true;
  }

  /**
   * Refaz o layout e força a repintura em várias passadas. Mudanças de monitor
   * (desconectar, trocar escala/DPI, mover entre telas) chegam em etapas e nem
   * sempre com um evento final de resize. Sem isso, a área do Chat podia ficar
   * vazia até reiniciar o app.
   */
  private scheduleRelayout(): void {
    for (const t of this.relayoutTimers) clearTimeout(t);
    this.relayoutTimers = [0, 150, 600, 1500].map((delay) =>
      setTimeout(() => this.relayoutNow(), delay),
    );
  }

  private relayoutNow(): void {
    if (this.window.isDestroyed() || this.window.isMinimized()) return;
    if (!this.layout()) return;
    this.refreshVisibility();
    const slot = this.activeSlot();
    if (slot && !slot.view.webContents.isDestroyed()) slot.view.webContents.invalidate();
    if (!this.window.webContents.isDestroyed()) this.window.webContents.invalidate();
  }

  private wireWindow(): void {
    this.layout();
    this.window.on('resize', () => {
      this.scheduleRelayout();
      this.saveBounds();
    });
    this.window.on('move', () => this.saveBounds());
    this.window.on('maximize', () => {
      this.scheduleRelayout();
      this.saveBounds();
    });
    this.window.on('unmaximize', () => {
      this.scheduleRelayout();
      this.saveBounds();
    });
    // Eventos em que o tamanho real pode mudar sem um 'resize' confiável.
    for (const event of [
      'moved',
      'restore',
      'show',
      'enter-full-screen',
      'leave-full-screen',
    ] as const) {
      this.window.on(event as 'show', () => this.scheduleRelayout());
    }
    // Monitores conectados/desconectados ou com escala alterada.
    const onDisplays = () => this.scheduleRelayout();
    screen.on('display-added', onDisplays);
    screen.on('display-removed', onDisplays);
    screen.on('display-metrics-changed', onDisplays);
    this.window.once('closed', () => {
      screen.off('display-added', onDisplays);
      screen.off('display-removed', onDisplays);
      screen.off('display-metrics-changed', onDisplays);
      for (const t of this.relayoutTimers) clearTimeout(t);
    });
    // Se o processo de vídeo reiniciar, repinta as views.
    app.on('child-process-gone', (_e, details) => {
      if (details.type === 'GPU') this.scheduleRelayout();
    });
    this.window.on('close', (event) => {
      this.saveBounds(0);
      if (this.quitting || !this.options.shouldHideOnClose()) return;
      event.preventDefault();
      this.window.hide();
      this.options.onHiddenToTray();
    });
    this.window.on('focus', () => {
      this.window.flashFrame(false);
      // Rede de segurança: ao voltar para a janela, garante o Chat no lugar.
      this.scheduleRelayout();
      const slot = this.activeSlot();
      if (slot && slot.unread > 0 && !this.overlayOpen()) {
        slot.unread = 0;
        this.emitState();
      }
    });
    // Atalhos valem em qualquer parte da janela (shell ou Chat).
    this.window.webContents.on('before-input-event', (e, input) => this.onKey(e, input));
    // Tema "sistema": acompanha a troca de claro/escuro do Windows.
    nativeTheme.on('updated', () => this.refreshTheme());
  }

  private onKey(event: Electron.Event, input: Input): void {
    if (input.type !== 'keyDown') return;
    const ctrl = input.control || input.meta;
    const key = input.key.toLowerCase();
    const chat = this.activeSlot()?.view.webContents;
    const handled = (fn: () => void) => {
      event.preventDefault();
      fn();
    };

    if (ctrl && key === 'q') return handled(() => app.quit());
    if (ctrl && key === ',') return handled(() => this.setSettingsOpen(!this.settingsOpen));
    // Com um modal aberto, o Esc é dele (o renderer trata).
    if (key === 'escape' && this.settingsOpen && !this.modalOpen)
      return handled(() => this.setSettingsOpen(false));
    // Ctrl+1…5 troca de conta, como Ctrl+Alt+↑/↓ entre servidores no Discord.
    if (ctrl && /^[1-5]$/.test(key)) {
      const target = [...this.slots.keys()][Number(key) - 1];
      if (target) return handled(() => this.focusChat(target));
    }
    if (!chat) return;
    if (key === 'f5' || (ctrl && key === 'r')) return handled(() => chat.reload());
    if (ctrl && (key === '=' || key === '+')) return handled(() => this.zoom(chat, 0.5));
    if (ctrl && key === '-') return handled(() => this.zoom(chat, -0.5));
    if (ctrl && key === '0') return handled(() => chat.setZoomLevel(0));
    if (input.alt && key === 'arrowleft') return handled(() => chat.navigationHistory.goBack());
    if (!app.isPackaged && ctrl && input.shift && key === 'i') {
      return handled(() => (this.settingsOpen ? this.window.webContents : chat).toggleDevTools());
    }
  }

  private zoom(contents: WebContents, delta: number): void {
    contents.setZoomLevel(Math.max(-3, Math.min(3, contents.getZoomLevel() + delta)));
  }

  private saveBounds(delayMs?: number): void {
    if (this.window.isDestroyed() || this.window.isMinimized()) return;
    const maximized = this.window.isMaximized();
    // Maximizada: guarda o tamanho "normal" para quando o usuário restaurar.
    const b = maximized ? this.window.getNormalBounds() : this.window.getBounds();
    const state: WindowState = { ...b, maximized };
    this.options.windowState.save(state, delayMs);
  }

  private emitState(): void {
    const state = this.getState();
    if (state.unread !== this.lastTotalUnread) {
      this.lastTotalUnread = state.unread;
      this.options.onUnreadChange(state.unread);
      this.badge ??= badgeImage();
      this.window.setOverlayIcon(
        state.unread > 0 ? this.badge : null,
        state.unread > 0 ? `${state.unread} novas mensagens` : '',
      );
    }
    if (!this.window.webContents.isDestroyed()) {
      this.window.webContents.send(ShellChannel.State, state);
    }
  }
}
