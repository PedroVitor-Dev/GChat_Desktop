import { EventEmitter } from 'node:events';
import { powerMonitor, type MenuItemConstructorOptions } from 'electron';
import {
  DND_OFF,
  DND_OPTIONS,
  describeDnd,
  dndUntil,
  resolveDnd,
  type DndDuration,
  type DndStatus,
} from '../../shared/dnd';
import type { SettingsStore } from '../store/settings-store';

/** setTimeout aceita no máximo ~24,8 dias; acima disso, reagenda. */
const MAX_TIMER = 2 ** 31 - 1;

/**
 * "Não perturbe" com prazo: guarda o fim da pausa nas configurações (sobrevive a
 * reiniciar o app) e volta sozinho na hora certa, inclusive depois de o
 * computador acordar da suspensão.
 */
export class DndService extends EventEmitter<{ change: [DndStatus] }> {
  private current: DndStatus = DND_OFF;
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly settings: SettingsStore) {
    super();
    settings.on('change', () => this.refresh());
    powerMonitor.on('resume', () => this.refresh());
    powerMonitor.on('unlock-screen', () => this.refresh());
    this.refresh();
  }

  status(): DndStatus {
    return this.current;
  }

  /** Texto curto para menus e dicas ("até 14:30"). */
  describe(): string {
    return describeDnd(this.current, new Date());
  }

  set(duration: DndDuration): void {
    if (duration === 'forever') {
      this.settings.update({ notifications: { enabled: false, pausedUntil: null } });
    } else {
      const pausedUntil = dndUntil(duration, new Date());
      this.settings.update({ notifications: { enabled: true, pausedUntil } });
    }
  }

  resume(): void {
    this.settings.update({ notifications: { enabled: true, pausedUntil: null } });
  }

  /** Itens do menu (bandeja e botão do trilho). */
  menuItems(): MenuItemConstructorOptions[] {
    const items: MenuItemConstructorOptions[] = [];
    if (this.current.active) {
      items.push(
        { label: `Notificações pausadas ${this.describe()}`, enabled: false },
        { label: 'Reativar notificações agora', click: () => this.resume() },
        { type: 'separator' },
      );
    }
    for (const o of DND_OPTIONS) {
      items.push({ label: o.label, click: () => this.set(o.id) });
    }
    return items;
  }

  dispose(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  private refresh(): void {
    const n = this.settings.get().notifications;
    const now = Date.now();
    // Prazo vencido (inclusive enquanto o app estava fechado): limpa.
    if (n.pausedUntil !== null && n.pausedUntil <= now) {
      this.settings.update({ notifications: { pausedUntil: null } });
      return; // a mudança das configurações chama refresh de novo
    }
    const next = resolveDnd(n, now);
    this.schedule(next.until);
    if (next.active === this.current.active && next.until === this.current.until) return;
    this.current = next;
    this.emit('change', next);
  }

  private schedule(until: number | null): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    if (until === null) return;
    const delay = Math.min(MAX_TIMER, Math.max(0, until - Date.now()) + 250);
    this.timer = setTimeout(() => this.refresh(), delay);
  }
}
