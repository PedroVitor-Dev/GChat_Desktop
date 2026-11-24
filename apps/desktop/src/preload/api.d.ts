import type { AppInfo, AutostartStatus } from '../shared/ipc';
import type { Settings, SettingsPatch } from '../shared/settings';
import type { ShellState, ShellView } from '../shared/shell';
import type { Account } from '../shared/accounts';
import type { Room } from '../shared/rooms';
import type { UpdateStatus } from '../shared/updates';
import type { DndDuration } from '../shared/dnd';
import type { PinGroup } from '../shared/pins';
import type { InboxEntry } from '../shared/inbox';

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
  /** "Não perturbe" do app: pausar por um tempo, reativar ou abrir o menu. */
  dnd: {
    set(duration: DndDuration): Promise<void>;
    resume(): Promise<void>;
    /** Menu nativo com as opções, na posição do mouse (botão do trilho). */
    showMenu(): Promise<void>;
  };
  /** Atualização automática (só no app instalado). */
  updates: {
    status(): Promise<UpdateStatus>;
    /** Busca agora (botão "Buscar atualizações"). */
    check(): Promise<UpdateStatus>;
    /** Baixa a versão encontrada (download automático desligado). */
    download(): Promise<void>;
    /** Reinicia e instala a versão baixada. */
    install(): Promise<void>;
    onStatus(listener: (status: UpdateStatus) => void): () => void;
  };
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
    /** Abre o menu de status do Google Chat (Ativo, Não perturbe, Adicionar um status). */
    openChatStatus(): Promise<void>;
  };
  /** Conversas fixadas (painel ao lado do Chat). */
  pins: {
    /** Fixa a conversa aberta no Chat (no grupo pedido ou no primeiro). */
    pinCurrent(
      groupId: string | null,
    ): Promise<{ ok: true; pinId: string } | { ok: false; error: string }>;
    /** Grava a lista reorganizada (ordem, grupos, nomes, emojis). */
    save(groups: PinGroup[]): Promise<void>;
    open(id: string): Promise<void>;
    setPanel(open: boolean): Promise<void>;
  };
  /** Notificações perdidas (só memória; somem ao fechar o app). */
  inbox: {
    list(): Promise<InboxEntry[]>;
    markSeen(): Promise<void>;
    clear(): Promise<void>;
    remove(id: string): Promise<void>;
    /** Abre a conversa do item (e tira o item da lista). */
    open(id: string): Promise<void>;
  };
}

declare global {
  interface Window {
    readonly gchat: GChatApi;
  }
}
