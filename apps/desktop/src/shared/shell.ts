/** Contrato entre o shell (barra de título + trilho + configurações) e o main. */

/** Medidas do layout. O main posiciona a view do Chat a partir delas. */
export const SHELL_LAYOUT = {
  titleBarHeight: 32,
  railWidth: 72,
  /** Canto arredondado da área do Chat, como a área de conteúdo do Discord. */
  contentRadius: 8,
} as const;

export const ShellChannel = {
  /** renderer → main (invoke): abrir/fechar as configurações em tela cheia. */
  SetSettingsOpen: 'shell:set-settings-open',
  /** renderer → main (invoke): focar o Chat (clique no trilho). */
  FocusChat: 'shell:focus-chat',
  /** renderer → main (invoke): recarregar o Chat. */
  ReloadChat: 'shell:reload-chat',
  /** renderer → main (invoke): estado atual (na montagem). */
  GetState: 'shell:get-state',
  /** main → renderer: estado mudou. */
  State: 'shell:state',
} as const;

export interface ShellState {
  settingsOpen: boolean;
  /** Notificações exibidas desde a última vez que o usuário olhou o Chat. */
  unread: number;
  /** Título da página do Chat (ex.: "Chat"), exibido na barra de título. */
  chatTitle: string;
  /** Primeiro carregamento do Chat ainda em andamento. */
  chatLoading: boolean;
  /** Tema efetivo (já resolvido quando a escolha é "sistema"). */
  theme: 'dark' | 'light';
}
