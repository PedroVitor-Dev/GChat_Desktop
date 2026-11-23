import { useEffect } from 'react';
import { useShellState } from './hooks/useShellState';
import { ChatPlaceholder } from './shell/ChatPlaceholder';
import { Rail } from './shell/Rail';
import { SettingsScreen } from './shell/SettingsScreen';
import { TitleBar } from './shell/TitleBar';

/**
 * Janela principal: barra de título, trilho e a área onde o main posiciona a
 * view do Google Chat. As configurações cobrem tudo abaixo da barra de título.
 */
export function App() {
  const state = useShellState();

  useEffect(() => {
    if (!state) return;
    const root = document.documentElement;
    root.classList.toggle('theme-light', state.theme === 'light');
    root.classList.toggle('theme-dark', state.theme === 'dark');
  }, [state]);

  if (!state) return <div className="bg-rail h-full" />;
  const { shell } = window.gchat;

  return (
    <div className="flex h-full flex-col">
      <TitleBar title={state.settingsOpen ? 'Configurações' : state.chatTitle} />
      <div className="relative flex min-h-0 flex-1">
        <Rail
          chatActive={!state.settingsOpen}
          settingsActive={state.settingsOpen}
          unread={state.unread}
          onChat={() => void shell.focusChat()}
          onSettings={() => void shell.setSettingsOpen(!state.settingsOpen)}
        />
        <ChatPlaceholder loading={state.chatLoading} />
        {state.settingsOpen && <SettingsScreen onClose={() => void shell.setSettingsOpen(false)} />}
      </div>
    </div>
  );
}
