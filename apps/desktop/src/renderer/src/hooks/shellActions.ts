import { createContext, useContext } from 'react';

/** Ações do shell disponíveis para as páginas de configurações. */
export interface ShellActions {
  openAddAccount(): void;
}

export const ShellActionsContext = createContext<ShellActions>({ openAddAccount: () => undefined });

export const useShellActions = (): ShellActions => useContext(ShellActionsContext);
