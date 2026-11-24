import {
  Menu,
  Tray,
  nativeImage,
  type MenuItemConstructorOptions,
  type NativeImage,
} from 'electron';
import { DND_OFF, type DndStatus } from '../../shared/dnd';
import { STREAMER_OFF, type StreamerStatus } from '../../shared/streamer';
import type { SettingsStore } from '../store/settings-store';
import { appIcon } from '../system/app-icon';

interface TrayActions {
  toggleStreamer(): void;
  installUpdate(): void;
  openChat(): void;
  openSettings(): void;
  quit(): void;
  /** Itens do submenu "Não perturbe" e o texto "até 14:30". */
  dndMenu(): MenuItemConstructorOptions[];
  dndLabel(): string;
}

const SIZE = 32;

/**
 * Ícone da bandeja em 32 px. Com não lidas, ganha uma bolinha vermelha no canto;
 * em "Não perturbe", o símbolo do Discord (bolinha vermelha com um traço branco).
 */
function trayImage(kind: 'normal' | 'badge' | 'dnd'): NativeImage {
  const base = appIcon().resize({ width: SIZE, height: SIZE, quality: 'best' });
  if (kind === 'normal') return base;

  const px = Buffer.from(base.toBitmap()); // BGRA
  const r = 7;
  const cx = SIZE - r - 1;
  const cy = SIZE - r - 1;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const d = Math.hypot(x - cx, y - cy);
      const ring = d <= r + 1.5 && d > r; // contorno escuro para destacar sobre o ícone
      const fill = Math.max(0, Math.min(1, r + 0.5 - d));
      const i = (y * SIZE + x) * 4;
      // Traço branco horizontal no meio da bolinha (Não perturbe).
      const bar = kind === 'dnd' && Math.abs(y - cy) <= 1 && Math.abs(x - cx) <= r - 2.5;
      if (fill > 0 && bar) {
        px[i] = 255;
        px[i + 1] = 255;
        px[i + 2] = 255;
        px[i + 3] = 255;
      } else if (fill > 0) {
        px[i] = Math.round(0x3c * fill + px[i]! * (1 - fill));
        px[i + 1] = Math.round(0x37 * fill + px[i + 1]! * (1 - fill));
        px[i + 2] = Math.round(0xda * fill + px[i + 2]! * (1 - fill));
        px[i + 3] = 255;
      } else if (ring) {
        px[i] = 0x22;
        px[i + 1] = 0x1f;
        px[i + 2] = 0x1e;
        px[i + 3] = 255;
      }
    }
  }
  return nativeImage.createFromBitmap(px, { width: SIZE, height: SIZE });
}

/**
 * Ícone na bandeja do sistema: clique abre o Chat; menu com atalhos rápidos
 * (pausar notificações, sons) e "Sair", a única forma de encerrar quando
 * "fechar para a bandeja" está ligado.
 */
export class AppTray {
  private readonly tray: Tray;
  private readonly images: { normal: NativeImage; badge: NativeImage; dnd: NativeImage };
  private unread = 0;
  private streamer: StreamerStatus = STREAMER_OFF;
  private updateReady: string | null = null;
  private dnd: DndStatus = DND_OFF;

  constructor(
    private readonly settings: SettingsStore,
    private readonly actions: TrayActions,
  ) {
    this.images = { normal: trayImage('normal'), badge: trayImage('badge'), dnd: trayImage('dnd') };
    this.tray = new Tray(this.images.normal);
    this.tray.on('click', () => this.actions.openChat());
    this.settings.on('change', () => this.refresh());
    this.refresh();
  }

  setUnread(count: number): void {
    if (count === this.unread) return;
    this.unread = count;
    this.refresh();
  }

  setStreamer(status: StreamerStatus): void {
    this.streamer = status;
    this.refresh();
  }

  setDnd(status: DndStatus): void {
    this.dnd = status;
    this.refresh();
  }

  /** Versão baixada e pronta (null = nenhuma). */
  setUpdateReady(version: string | null): void {
    if (version === this.updateReady) return;
    this.updateReady = version;
    this.refresh();
  }

  destroy(): void {
    this.tray.destroy();
  }

  private refresh(): void {
    const { sounds } = this.settings.get();
    const paused = this.dnd.active;
    this.tray.setImage(
      paused ? this.images.dnd : this.unread > 0 ? this.images.badge : this.images.normal,
    );
    this.tray.setToolTip(
      [
        'GChat Desktop+',
        this.unread > 0
          ? `${this.unread} ${this.unread === 1 ? 'nova mensagem' : 'novas mensagens'}`
          : null,
        paused ? `Não perturbe ${this.actions.dndLabel()}` : null,
        this.streamer.active ? 'Modo streamer' : null,
      ]
        .filter(Boolean)
        .join(' — '),
    );

    this.tray.setContextMenu(
      Menu.buildFromTemplate([
        ...(this.updateReady
          ? [
              {
                label: `Reiniciar para atualizar (${this.updateReady})`,
                click: () => this.actions.installUpdate(),
              },
              { type: 'separator' as const },
            ]
          : []),
        { label: 'Abrir Google Chat', click: () => this.actions.openChat() },
        { label: 'Configurações', click: () => this.actions.openSettings() },
        { type: 'separator' },
        {
          label: paused ? `Não perturbe (${this.actions.dndLabel()})` : 'Não perturbe',
          submenu: this.actions.dndMenu(),
        },
        {
          label: 'Tocar sons',
          type: 'checkbox',
          checked: sounds.enabled,
          enabled: !paused,
          click: (item) => this.settings.update({ sounds: { enabled: item.checked } }),
        },
        {
          label:
            this.streamer.reason === 'auto'
              ? `Modo streamer (automático: ${this.streamer.apps.join(', ')})`
              : 'Modo streamer',
          type: 'checkbox',
          checked: this.streamer.active,
          click: () => this.actions.toggleStreamer(),
        },
        { type: 'separator' },
        { label: 'Sair do GChat Desktop+', click: () => this.actions.quit() },
      ]),
    );
  }
}
