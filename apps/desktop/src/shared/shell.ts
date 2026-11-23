import type { CallState } from './rooms';
import type { StreamerStatus } from './streamer';

/** Contrato entre o shell (barra de título + trilho + configurações) e o main. */

/** Medidas do layout. O main posiciona as views do Chat a partir delas. */
export const SHELL_LAYOUT = {
  titleBarHeight: 32,
  railWidth: 72,
  /** Canto arredondado da área do Chat, como a área de conteúdo do Discord. */
  contentRadius: 8,
  /** Painel de salas (como a lista de canais do Discord). */
  roomsPanelWidth: 240,
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
  streamer: StreamerStatus;
  /**
   * Destino na área principal (um por vez, como no trilho do Discord):
   * - chat: o Google Chat da conta ativa, em tela inteira;
   * - rooms: lista de salas + chamada (ou saguão, sem chamada).
   */
  view: ShellView;
  /** Chamada em andamento (null = nenhuma). */
  call: CallState | null;
}
