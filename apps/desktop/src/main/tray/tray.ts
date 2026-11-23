import { Menu, Tray, nativeImage, type NativeImage } from 'electron';
import type { SettingsStore } from '../store/settings-store';
import { appIcon } from '../system/app-icon';

interface TrayActions {
  openChat(): void;
  openSettings(): void;
  quit(): void;
}

const SIZE = 32;

/** Ícone da bandeja em 32 px; com não lidas, ganha uma bolinha vermelha no canto. */
function trayImage(withBadge: boolean): NativeImage {
  const base = appIcon().resize({ width: SIZE, height: SIZE, quality: 'best' });
  if (!withBadge) return base;

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
      if (fill > 0) {
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
  private readonly images: { normal: NativeImage; badge: NativeImage };
  private unread = 0;

  constructor(
    private readonly settings: SettingsStore,
    private readonly actions: TrayActions,
  ) {
    this.images = { normal: trayImage(false), badge: trayImage(true) };
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

  destroy(): void {
    this.tray.destroy();
  }

  private refresh(): void {
    const { notifications, sounds } = this.settings.get();
    const paused = !notifications.enabled;
    this.tray.setImage(this.unread > 0 ? this.images.badge : this.images.normal);
    this.tray.setToolTip(
      [
        'GChat Desktop+',
        this.unread > 0
          ? `${this.unread} ${this.unread === 1 ? 'nova mensagem' : 'novas mensagens'}`
          : null,
        paused ? 'Notificações pausadas' : null,
      ]
        .filter(Boolean)
        .join(' — '),
    );

    this.tray.setContextMenu(
      Menu.buildFromTemplate([
        { label: 'Abrir Google Chat', click: () => this.actions.openChat() },
        { label: 'Configurações', click: () => this.actions.openSettings() },
        { type: 'separator' },
        {
          label: 'Pausar notificações',
          type: 'checkbox',
          checked: paused,
          click: (item) => this.settings.update({ notifications: { enabled: !item.checked } }),
        },
        {
          label: 'Tocar sons',
          type: 'checkbox',
          checked: sounds.enabled,
          enabled: !paused,
          click: (item) => this.settings.update({ sounds: { enabled: item.checked } }),
        },
        { type: 'separator' },
        { label: 'Sair do GChat Desktop+', click: () => this.actions.quit() },
      ]),
    );
  }
}
