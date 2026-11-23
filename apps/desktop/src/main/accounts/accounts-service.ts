import { session } from 'electron';
import {
  ACCOUNT_COLORS,
  ACCOUNT_LIMITS,
  cleanAccountName,
  nextAccountId,
  partitionOf,
  type Account,
} from '../../shared/accounts';
import type { AppShell } from '../shell/app-shell';
import type { SettingsStore } from '../store/settings-store';

export type AccountResult = { ok: true; account: Account } | { ok: false; error: string };

/**
 * Ciclo de vida das contas. A lista vive nas configurações (só o main altera);
 * o shell cria e destrói as views ao receber a mudança.
 */
export class AccountsService {
  constructor(
    private readonly settings: SettingsStore,
    private readonly shell: AppShell,
  ) {}

  add(rawName: unknown): AccountResult {
    const { list } = this.settings.get().accounts;
    if (list.length >= ACCOUNT_LIMITS.max) {
      return { ok: false, error: `Limite de ${ACCOUNT_LIMITS.max} contas atingido.` };
    }
    const name = cleanAccountName(rawName);
    if (!name) return { ok: false, error: 'Dê um nome para a conta.' };
    if (list.some((a) => a.name.toLowerCase() === name.toLowerCase())) {
      return { ok: false, error: 'Já existe uma conta com esse nome.' };
    }
    // Primeira cor ainda não usada (ou a próxima da sequência).
    const used = new Set(list.map((a) => a.color));
    const color = ACCOUNT_COLORS.findIndex((_, i) => !used.has(i));
    const account: Account = {
      id: nextAccountId(list),
      name,
      color: color >= 0 ? color : list.length % ACCOUNT_COLORS.length,
    };
    this.settings.updateInternal({ accounts: { list: [...list, account], active: account.id } });
    this.shell.focusChat(account.id);
    return { ok: true, account };
  }

  rename(id: string, rawName: unknown): AccountResult {
    const { list, active } = this.settings.get().accounts;
    const target = list.find((a) => a.id === id);
    if (!target) return { ok: false, error: 'Conta não encontrada.' };
    const name = cleanAccountName(rawName);
    if (!name) return { ok: false, error: 'O nome não pode ficar vazio.' };
    if (list.some((a) => a.id !== id && a.name.toLowerCase() === name.toLowerCase())) {
      return { ok: false, error: 'Já existe uma conta com esse nome.' };
    }
    const account = { ...target, name };
    this.settings.updateInternal({
      accounts: { list: list.map((a) => (a.id === id ? account : a)), active },
    });
    return { ok: true, account };
  }

  setActive(id: string): void {
    const { list, active } = this.settings.get().accounts;
    if (id === active || !list.some((a) => a.id === id)) return;
    this.settings.updateInternal({ accounts: { list, active: id } });
  }

  /** Sai da conta Google (apaga a sessão), mantendo a entrada no trilho. */
  async signOut(id: string): Promise<boolean> {
    if (!this.settings.get().accounts.list.some((a) => a.id === id)) return false;
    await this.shell.signOut(id);
    return true;
  }

  /** Remove a conta e apaga todos os dados da sessão dela. Não remove a última. */
  async remove(id: string): Promise<{ ok: boolean; error?: string }> {
    const { list, active } = this.settings.get().accounts;
    if (!list.some((a) => a.id === id)) return { ok: false, error: 'Conta não encontrada.' };
    if (list.length === 1) {
      return { ok: false, error: 'O app precisa de pelo menos uma conta. Use “Sair da conta”.' };
    }
    const remaining = list.filter((a) => a.id !== id);
    this.settings.updateInternal({
      accounts: { list: remaining, active: active === id ? remaining[0]!.id : active },
    });
    // Depois que a view foi destruída: apaga cookies, armazenamento e cache da sessão.
    const ses = session.fromPartition(partitionOf(id));
    await ses.clearStorageData();
    await ses.clearCache();
    return { ok: true };
  }
}
