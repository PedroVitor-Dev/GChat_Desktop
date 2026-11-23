import { randomBytes } from 'node:crypto';
import { WebContentsView, clipboard } from 'electron';
import { partitionOf } from '../../shared/accounts';
import {
  ROOM_LIMITS,
  cleanRoomName,
  meetCodeFromUrl,
  meetUrl,
  type Room,
} from '../../shared/rooms';
import { getChatSession } from '../chat/session';
import type { SettingsStore } from '../store/settings-store';

export type RoomResult = { ok: true; room: Room } | { ok: false; error: string };

const CREATE_TIMEOUT_MS = 15_000;

/**
 * Salas do Meet. Criar usa o próprio meet.new do Google, numa página oculta com a
 * sessão da conta (já logada): o Meet redireciona para o código da nova reunião,
 * que vira uma sala permanente. Nenhuma API ou credencial extra.
 */
export class RoomsService {
  /** Páginas ocultas em andamento (referência forte até terminarem). */
  private readonly pending = new Set<WebContentsView>();

  constructor(private readonly settings: SettingsStore) {}

  list(): Room[] {
    return this.settings.get().rooms;
  }

  get(id: string): Room | undefined {
    return this.list().find((r) => r.id === id);
  }

  async create(rawName: unknown, accountId: string): Promise<RoomResult> {
    const name = cleanRoomName(rawName);
    if (!name) return { ok: false, error: 'Dê um nome para a sala.' };
    if (this.list().length >= ROOM_LIMITS.max) {
      return { ok: false, error: `Limite de ${ROOM_LIMITS.max} salas atingido.` };
    }
    let code: string;
    try {
      code = await this.newMeetingCode(accountId);
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
    return this.save(name, code, accountId);
  }

  /** Salva uma sala existente a partir do link (ex.: a sala de um amigo). */
  addFromLink(rawName: unknown, link: unknown, accountId: string): RoomResult {
    const name = cleanRoomName(rawName);
    if (!name) return { ok: false, error: 'Dê um nome para a sala.' };
    const text = typeof link === 'string' ? link.trim() : '';
    const code =
      meetCodeFromUrl(text) ??
      meetCodeFromUrl(`https://meet.google.com/${text.toLowerCase()}`) ??
      null;
    if (!code)
      return { ok: false, error: 'Link do Meet inválido (ex.: meet.google.com/abc-defg-hij).' };
    if (this.list().some((r) => r.code === code)) {
      return { ok: false, error: 'Essa sala já está na lista.' };
    }
    return this.save(name, code, accountId);
  }

  rename(id: string, rawName: unknown): RoomResult {
    const room = this.get(id);
    const name = cleanRoomName(rawName);
    if (!room) return { ok: false, error: 'Sala não encontrada.' };
    if (!name) return { ok: false, error: 'O nome não pode ficar vazio.' };
    const updated = { ...room, name };
    this.settings.updateInternal({ rooms: this.list().map((r) => (r.id === id ? updated : r)) });
    return { ok: true, room: updated };
  }

  remove(id: string): boolean {
    const before = this.list();
    if (!before.some((r) => r.id === id)) return false;
    this.settings.updateInternal({ rooms: before.filter((r) => r.id !== id) });
    return true;
  }

  copyLink(id: string): boolean {
    const room = this.get(id);
    if (!room) return false;
    clipboard.writeText(meetUrl(room.code));
    return true;
  }

  private save(name: string, code: string, accountId: string): RoomResult {
    const room: Room = { id: `room-${randomBytes(5).toString('hex')}`, name, code, accountId };
    this.settings.updateInternal({ rooms: [...this.list(), room] });
    return { ok: true, room };
  }

  /**
   * Abre meet.new numa página oculta e captura o código da reunião criada.
   *
   * A view fica referenciada em `pending` até terminar: uma WebContentsView
   * solta (sem janela e sem referência) pode ser coletada pelo GC no meio do
   * carregamento, e a criação ficava parada até o tempo limite.
   */
  private newMeetingCode(accountId: string): Promise<string> {
    const view = new WebContentsView({
      webPreferences: {
        session: getChatSession(partitionOf(accountId)),
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
      },
    });
    this.pending.add(view);
    const contents = view.webContents;
    contents.setAudioMuted(true);
    // A página oculta nunca abre janelas nem pede permissões.
    contents.setWindowOpenHandler(() => ({ action: 'deny' }));

    return new Promise<string>((resolve, reject) => {
      let settled = false;
      const finish = (err: Error | null, code?: string) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        this.pending.delete(view);
        try {
          if (!contents.isDestroyed()) contents.close();
        } catch {
          // já fechada
        }
        if (err) reject(err);
        else resolve(code!);
      };
      const check = (url: string) => {
        const code = meetCodeFromUrl(url);
        if (code) return finish(null, code);
        let host: string;
        try {
          host = new URL(url).host;
        } catch {
          return;
        }
        if (host === 'accounts.google.com') {
          finish(new Error('Faça login no Google Chat desta conta antes de criar salas.'));
        }
      };
      const timer = setTimeout(
        () => finish(new Error('O Google Meet demorou para responder. Tente de novo.')),
        CREATE_TIMEOUT_MS,
      );
      contents.on('did-navigate', (_e, url) => check(url));
      contents.on('did-navigate-in-page', (_e, url) => check(url));
      contents.on('did-fail-load', (_e, code, desc, _url, isMainFrame) => {
        if (isMainFrame && code !== -3) {
          finish(new Error(`Não foi possível abrir o Meet (${desc}).`));
        }
      });
      contents.once('destroyed', () =>
        finish(new Error('A criação da sala foi interrompida. Tente de novo.')),
      );
      contents.on('render-process-gone', () =>
        finish(new Error('A página do Meet fechou inesperadamente. Tente de novo.')),
      );
      contents.loadURL('https://meet.new').catch(() => {
        // erros de carregamento chegam por did-fail-load
      });
    });
  }
}
