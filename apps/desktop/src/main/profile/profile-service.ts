import { EventEmitter } from 'node:events';
import { mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { app, ipcMain } from 'electron';
import { isAccountId } from '../../shared/accounts';
import {
  PROFILE_CHANNEL,
  STATUS_CHANNEL,
  parseProfileReport,
  parseStatusReport,
  type ChatStatus,
  photoUrlAtSize,
  type AccountProfile,
  type ProfileReport,
} from '../../shared/profile';
import { isChatSession } from '../chat/session';

const CHAT_ORIGIN = 'https://chat.google.com';
const MAX_PHOTO_BYTES = 512 * 1024;
const PHOTO_TYPES = /^image\/(png|jpeg|webp|gif)$/;

/**
 * Perfis das contas (foto e nome do Google), guardados em
 * %APPDATA%\GChat Desktop+\profiles\<conta>.json. A foto é baixada pela sessão da
 * própria conta e salva como data URL, para a interface (CSP local) exibir sem
 * acessar a rede.
 */
export class ProfileService extends EventEmitter<{ change: [Map<string, AccountProfile>] }> {
  private readonly dir = join(app.getPath('userData'), 'profiles');
  private readonly profiles = new Map<string, AccountProfile>();
  private readonly inFlight = new Set<string>();
  /** Status do Chat por conta (só em memória: muda o tempo todo e é do Google). */
  private readonly statuses = new Map<string, ChatStatus>();

  constructor(private readonly accountOf: (contents: Electron.WebContents) => string | null) {
    super();
    this.load();
    ipcMain.on(PROFILE_CHANNEL, (event, raw: unknown) => {
      const frame = event.senderFrame;
      if (!frame || frame !== event.sender.mainFrame || frame.origin !== CHAT_ORIGIN) return;
      if (!isChatSession(event.sender.session)) return;
      const accountId = this.accountOf(event.sender);
      const report = parseProfileReport(raw);
      if (!accountId || !report) return;
      void this.update(accountId, report, event.sender.session);
    });
    ipcMain.on(STATUS_CHANNEL, (event, raw: unknown) => {
      const frame = event.senderFrame;
      if (!frame || frame !== event.sender.mainFrame || frame.origin !== CHAT_ORIGIN) return;
      if (!isChatSession(event.sender.session)) return;
      const accountId = this.accountOf(event.sender);
      const status = parseStatusReport(raw);
      if (!accountId || !status) return;
      const current = this.statuses.get(accountId);
      if (current?.presence === status.presence && current.text === status.text) return;
      this.statuses.set(accountId, status);
      this.emit('change', this.profiles);
    });
  }

  /** Status atual do Chat de cada conta (o que o botão "Ativo ▾" mostra). */
  statusOf(accountId: string): ChatStatus | undefined {
    return this.statuses.get(accountId);
  }

  all(): Map<string, AccountProfile> {
    return this.profiles;
  }

  /** Esquece o perfil (sair da conta ou remover a conta). */
  async clear(accountId: string): Promise<void> {
    this.statuses.delete(accountId);
    if (!this.profiles.delete(accountId)) return void this.emit('change', this.profiles);
    await rm(this.file(accountId), { force: true });
    this.emit('change', this.profiles);
  }

  private async update(
    accountId: string,
    report: ProfileReport,
    session: Electron.Session,
  ): Promise<void> {
    const current = this.profiles.get(accountId);
    const nameChanged = current?.displayName !== report.displayName;
    const photoChanged = current?.photoSource !== report.photoUrl;
    if ((!nameChanged && !photoChanged) || this.inFlight.has(accountId)) return;

    this.inFlight.add(accountId);
    try {
      let photo = current?.photo;
      if (photoChanged) photo = (await this.download(report.photoUrl, session)) ?? photo;
      const next: AccountProfile = {
        ...current,
        accountId,
        displayName: report.displayName,
        updatedAt: Date.now(),
        ...(photo ? { photo, photoSource: report.photoUrl } : {}),
      };
      this.profiles.set(accountId, next);
      mkdirSync(this.dir, { recursive: true });
      await writeFile(this.file(accountId), JSON.stringify(next), 'utf8');
      this.emit('change', this.profiles);
    } finally {
      this.inFlight.delete(accountId);
    }
  }

  /** Baixa a foto em 128 px pela sessão da conta; null se algo não bater. */
  private async download(url: string, session: Electron.Session): Promise<string | null> {
    try {
      const res = await session.fetch(photoUrlAtSize(url, 128));
      const type = res.headers.get('content-type')?.split(';')[0]?.trim() ?? '';
      if (!res.ok || !PHOTO_TYPES.test(type)) return null;
      const bytes = Buffer.from(await res.arrayBuffer());
      if (bytes.length === 0 || bytes.length > MAX_PHOTO_BYTES) return null;
      return `data:${type};base64,${bytes.toString('base64')}`;
    } catch {
      return null;
    }
  }

  private load(): void {
    let files: string[];
    try {
      files = readdirSync(this.dir).filter((f) => f.endsWith('.json'));
    } catch {
      return; // ainda sem perfis salvos
    }
    for (const f of files) {
      try {
        const p = JSON.parse(readFileSync(join(this.dir, f), 'utf8')) as AccountProfile;
        const photoOk = !p.photo || /^data:image\/(png|jpeg|webp|gif);base64,/.test(p.photo);
        if (isAccountId(p.accountId) && photoOk) this.profiles.set(p.accountId, p);
      } catch {
        // arquivo corrompido: ignora (será refeito na próxima leitura do Chat)
      }
    }
  }

  private file(accountId: string): string {
    return join(this.dir, `${accountId}.json`);
  }
}
