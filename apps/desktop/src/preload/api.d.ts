import type { AppInfo, AutostartStatus } from '../shared/ipc';
import type { Settings, SettingsPatch } from '../shared/settings';
import type { ShellState, ShellView } from '../shared/shell';
import type { Account } from '../shared/accounts';
import type { Room } from '../shared/rooms';

export type RoomResult = { ok: true; room: Room } | { ok: false; error: string };

export type AccountResult = { ok: true; account: Account } | { ok: false; error: string };
import type { CustomSound, SoundId, SoundOption } from '../shared/sounds';

export type ImportSoundResult = { ok: true; sound: CustomSound } | { ok: false; error: string };

export interface GChatApi {
  getAppInfo(): Promise<AppInfo>;
  getSettings(): Promise<Settings>;
  /** Aplica um patch parcial; retorna as configurações resultantes. */
  updateSettings(patch: SettingsPatch): Promise<Settings>;
  /** Assina mudanças feitas fora desta tela. Retorna a função para cancelar. */
  onSettingsChanged(listener: (settings: Settings) => void): () => void;
  /** Exibe um toast de teste. `false` se o sistema não suporta notificações. */
  testNotification(): Promise<boolean>;
  /** Nomes das conversas que notificaram recentemente (sem conteúdo). */
  getRecentConversations(): Promise<string[]>;
  /** Sons disponíveis: especiais, predefinidos e importados. */
  getSoundOptions(): Promise<SoundOption[]>;
  /** Toca o som no volume atual (ignora o intervalo mínimo entre sons). */
  previewSound(id: SoundId): Promise<boolean>;
  /** Abre o diálogo de arquivo. `null` se o usuário cancelar. */
  importSound(): Promise<ImportSoundResult | null>;
  removeSound(id: SoundId): Promise<boolean>;
  getAutostartStatus(): Promise<AutostartStatus>;
  /** Liga/desliga o modo streamer (desligar numa transmissão vale até o programa fechar). */
  toggleStreamer(): Promise<void>;
  /** Salas do Meet (lista em settings.rooms). */
  rooms: {
    /** Cria uma sala nova (meet.new) na conta ativa. */
    create(name: string): Promise<RoomResult>;
    /** Salva uma sala existente a partir do link. */
    addFromLink(name: string, link: string): Promise<RoomResult>;
    rename(id: string, name: string): Promise<RoomResult>;
    remove(id: string): Promise<boolean>;
    copyLink(id: string): Promise<boolean>;
  };
  call: {
    join(roomId: string): Promise<boolean>;
    leave(): Promise<void>;
  };
  accounts: {
    add(name: string): Promise<AccountResult>;
    rename(id: string, name: string): Promise<AccountResult>;
    /** Apaga a sessão Google da conta (volta ao login). */
    signOut(id: string): Promise<boolean>;
    /** Remove a conta e os dados da sessão. */
    remove(id: string): Promise<{ ok: boolean; error?: string }>;
  };
  /** Janela principal (barra de título, trilho, configurações em tela cheia). */
  shell: {
    getState(): Promise<ShellState>;
    onState(listener: (state: ShellState) => void): () => void;
    setSettingsOpen(open: boolean): Promise<void>;
    setModalOpen(open: boolean): Promise<void>;
    /** Destino da área principal: Chat ou Salas. */
    setView(view: ShellView): Promise<void>;
    /** Mostra o Chat de uma conta (fecha configurações/modal). */
    selectAccount(id: string): Promise<void>;
    reloadChat(): Promise<void>;
  };
}

declare global {
  interface Window {
    readonly gchat: GChatApi;
  }
}
