import type { CapturedNotification } from '../../shared/notifications';
import { addPin, normalizePins, pinsOf, type PinGroup, type PinsSettings } from '../../shared/pins';
import { conversationKey } from '../notifications/rules';
import type { AppShell } from '../shell/app-shell';
import type { SettingsStore } from '../store/settings-store';

export type PinResult = { ok: true; pinId: string } | { ok: false; error: string };

/** Compara nomes de conversa sem diferenciar maiúsculas, acentos e espaços. */
const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

/**
 * Conversas fixadas: guarda os grupos (configurações, só o main grava), abre a
 * conversa no Chat da conta certa e conta as mensagens novas de cada uma a partir
 * das notificações que o app já recebe (só em memória).
 */
export class PinsService {
  private unread: Record<string, number> = {};

  constructor(
    private readonly settings: SettingsStore,
    private readonly shell: AppShell,
  ) {
    this.shell.setPinsPanel(settings.get().pins.panelOpen);
    settings.on('change', (next) => {
      this.shell.setPinsPanel(next.pins.panelOpen);
      this.dropStale(next.pins);
    });
  }

  /** Fixa a conversa aberta agora no Chat da conta ativa. */
  pinCurrent(groupId: string | null): PinResult {
    const accountId = this.settings.get().accounts.active;
    const here = this.shell.chatLocation(accountId);
    if (!here) return { ok: false, error: 'Abra uma conversa no Chat para fixar.' };
    const name = here.name ?? 'Conversa';
    const r = addPin(
      this.settings.get().pins,
      accountId,
      { name, chatName: name, path: here.path },
      groupId,
    );
    if ('error' in r) return { ok: false, error: r.error };
    this.save({ ...r.pins, panelOpen: true });
    return { ok: true, pinId: r.pinId };
  }

  /**
   * Grava a lista editada no painel (ordem, grupos, nomes, emojis). Só pode
   * reorganizar o que já existe: conversa nova entra só por `pinCurrent`.
   */
  saveFromRenderer(groups: unknown): void {
    const current = this.settings.get().pins;
    const known = new Map(current.groups.flatMap((g) => g.items).map((i) => [i.id, i]));
    const next = normalizePins(
      { panelOpen: current.panelOpen, groups },
      current,
      this.settings.get().accounts.list.map((a) => a.id),
    );
    // Endereço e nome original vêm sempre do que o main gravou.
    const groupsSafe: PinGroup[] = next.groups.map((g) => ({
      ...g,
      items: g.items
        .filter((i) => known.has(i.id))
        .map((i) => ({ ...i, path: known.get(i.id)!.path, chatName: known.get(i.id)!.chatName })),
    }));
    this.save({ ...next, groups: groupsSafe });
  }

  setPanel(open: boolean): void {
    this.save({ ...this.settings.get().pins, panelOpen: open });
  }

  /** Abre a conversa fixada e zera o contador dela. */
  open(pinId: string): void {
    for (const g of this.settings.get().pins.groups) {
      const item = g.items.find((i) => i.id === pinId);
      if (!item) continue;
      this.shell.openChatPath(g.accountId, item.path);
      this.clear([pinId]);
      return;
    }
  }

  /** Conversa fixada com este nome (para abrir um item das notificações perdidas). */
  findByName(accountId: string, name: string): string | null {
    const key = fold(name);
    const hit = this.settings
      .get()
      .pins.groups.filter((g) => g.accountId === accountId)
      .flatMap((g) => g.items)
      .find((i) => fold(i.chatName) === key || fold(i.name) === key);
    return hit?.id ?? null;
  }

  /** Alt+1…9 na conta ativa. */
  openByIndex(index: number): void {
    const item = pinsOf(this.settings.get().pins, this.settings.get().accounts.active)[index];
    if (item) this.open(item.id);
  }

  /** Notificação exibida: soma 1 nas conversas fixadas com o mesmo nome, se não estiver vendo. */
  onNotification(n: CapturedNotification, accountId: string | null): void {
    if (!accountId) return;
    const key = fold(conversationKey(n));
    const hits = this.settings
      .get()
      .pins.groups.filter((g) => g.accountId === accountId)
      .flatMap((g) => g.items)
      .filter((i) => fold(i.chatName) === key || fold(i.name) === key)
      .filter((i) => !this.shell.isViewingChat(accountId, i.path));
    if (hits.length === 0) return;
    const next = { ...this.unread };
    for (const i of hits) next[i.id] = (next[i.id] ?? 0) + 1;
    this.publish(next);
  }

  /** O Chat abriu outra conversa: se for uma fixada, ela foi lida. */
  onChatLocation(accountId: string): void {
    const here = this.shell.chatLocation(accountId);
    if (!here) return;
    const ids = this.settings
      .get()
      .pins.groups.filter((g) => g.accountId === accountId)
      .flatMap((g) => g.items)
      .filter((i) => i.path === here.path)
      .map((i) => i.id);
    this.clear(ids);
  }

  private clear(ids: string[]): void {
    if (!ids.some((id) => this.unread[id])) return;
    const next = { ...this.unread };
    for (const id of ids) delete next[id];
    this.publish(next);
  }

  /** Esquece contadores de conversas que saíram da lista. */
  private dropStale(pins: PinsSettings): void {
    const alive = new Set(pins.groups.flatMap((g) => g.items.map((i) => i.id)));
    const stale = Object.keys(this.unread).filter((id) => !alive.has(id));
    if (stale.length > 0) this.clear(stale);
  }

  private publish(next: Record<string, number>): void {
    this.unread = next;
    this.shell.setPinUnread(next);
  }

  private save(pins: PinsSettings): void {
    this.settings.updateInternal({ pins });
  }
}
