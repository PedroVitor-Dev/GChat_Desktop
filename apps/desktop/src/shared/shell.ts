import type { ChatPresence } from './profile';
import type { CallState } from './rooms';
import type { StreamerStatus } from './streamer';
import type { ResolvedTheme } from './theme';
import type { DndStatus } from './dnd';
import type { InboxStatus } from './inbox';

/** Contrato entre o shell (barra de título + trilho + configurações) e o main. */

/** Medidas do layout. O main posiciona as views do Chat a partir delas. */
export const SHELL_LAYOUT = {
  titleBarHeight: 32,
  railWidth: 72,
  /** Canto arredondado da área do Chat, como a área de conteúdo do Discord. */
  contentRadius: 8,
  /** Painel de salas (como a lista de canais do Discord). */
  roomsPanelWidth: 240,
  /** Painel de conversas fixadas, ao lado do Chat. */
  pinsPanelWidth: 240,
  /** Faixa acima da sala espiada ("Espiando… · Trocar · Voltar"). */
  previewBarHeight: 52,
} as const;

export const ShellChannel = {
  /** renderer → main (invoke): abrir/fechar as configurações em tela cheia. */
  SetSettingsOpen: 'shell:set-settings-open',
  /** renderer → main (invoke): um modal do shell cobre a área do Chat. */
  SetModalOpen: 'shell:set-modal-open',
  /** renderer → main (invoke): mostrar o Chat de uma conta (clique no trilho). */
  SelectAccount: 'shell:select-account',
  /** renderer → main (invoke): trocar de destino (Chat ou Salas). */
  SetView: 'shell:set-view',
  /** renderer → main (invoke): abrir o menu de status do Chat da conta ativa. */
  OpenChatStatus: 'shell:open-chat-status',
  /** renderer → main (invoke): conversas fixadas. */
  PinsPinCurrent: 'pins:pin-current',
  PinsSave: 'pins:save',
  PinsOpen: 'pins:open',
  PinsSetPanel: 'pins:set-panel',
  /** renderer → main (invoke): notificações perdidas. */
  InboxList: 'inbox:list',
  InboxSeen: 'inbox:seen',
  InboxClear: 'inbox:clear',
  InboxRemove: 'inbox:remove',
  InboxOpen: 'inbox:open',
  /** renderer → main (invoke): recarregar o Chat da conta ativa. */
  ReloadChat: 'shell:reload-chat',
  /** renderer → main (invoke): estado atual (na montagem). */
  GetState: 'shell:get-state',
  /** main → renderer: estado mudou. */
  State: 'shell:state',
} as const;

export type ShellView = 'chat' | 'rooms';

export interface AccountView {
  id: string;
  name: string;
  color: number;
  /** Notificações desde a última vez que o usuário olhou esta conta. */
  unread: number;
  /** Primeiro carregamento ainda em andamento. */
  loading: boolean;
  /** Título da página (ex.: "Chat"). */
  title: string;
  /** Foto do Google (data URL), quando já lida da página do Chat. */
  photo?: string;
  /** Nome exibido pelo Google. */
  displayName?: string;
  /** Status no Google Chat (Ativo, Ausente, Não perturbe), quando já lido. */
  presence?: ChatPresence;
  /** Status personalizado do Chat (ex.: "🧪 Testando o app"). */
  statusText?: string;
}

export interface ShellState {
  settingsOpen: boolean;
  modalOpen: boolean;
  accounts: AccountView[];
  activeAccount: string;
  /** Total de não lidas (bandeja e barra de tarefas). */
  unread: number;
  /** Tema efetivo (já resolvido quando a escolha é "sistema"). */
  theme: 'dark' | 'light';
  /** Cores, fundo e material da janela já resolvidos. */
  look: ResolvedTheme;
  streamer: StreamerStatus;
  /**
   * Destino na área principal (um por vez, como no trilho do Discord):
   * - chat: o Google Chat da conta ativa, em tela inteira;
   * - rooms: lista de salas + chamada (ou saguão, sem chamada).
   */
  view: ShellView;
  /** Chamada em andamento (null = nenhuma). */
  call: CallState | null;
  /** Sala aberta para espiar durante outra chamada (null = nenhuma). */
  preview: { roomId: string; name: string } | null;
  /** "Não perturbe" do app (notificações pausadas, com ou sem prazo). */
  dnd: DndStatus;
  /** Painel de conversas fixadas. */
  pins: PinsView;
  /** Notificações perdidas (só memória). */
  inbox: InboxStatus;
}

export interface PinsView {
  /** Painel aberto ao lado do Chat. */
  open: boolean;
  /** Conversa aberta agora no Chat da conta ativa (null = início, busca etc.). */
  current: { path: string; name: string | null } | null;
  /** Mensagens novas por conversa fixada (id → quantidade). */
  unread: Record<string, number>;
}
