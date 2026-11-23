import { useCallback, useEffect, useMemo, useState } from 'react';
import { ShellActionsContext } from './hooks/shellActions';
import { useSettings } from './hooks/useSettings';
import { useShellState } from './hooks/useShellState';
import { CreateRoomModal } from './shell/CreateRoomModal';
import { RoomsPanel } from './shell/RoomsPanel';
import { AddAccountModal } from './shell/AddAccountModal';
import { ChatPlaceholder } from './shell/ChatPlaceholder';
import { Rail } from './shell/Rail';
import { SettingsScreen } from './shell/SettingsScreen';
import { TitleBar } from './shell/TitleBar';

/**
 * Janela principal: barra de título, trilho e a área onde o main posiciona a
 * view do Google Chat da conta ativa. Configurações e modais cobrem essa área
 * (o main esconde a view enquanto estão abertos).
 */
export function App() {
  const state = useShellState();
  const [adding, setAdding] = useState(false);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [settings] = useSettings();
  const { shell } = window.gchat;

  useEffect(() => {
    if (!state) return;
    const root = document.documentElement;
    root.classList.toggle('theme-light', state.theme === 'light');
    root.classList.toggle('theme-dark', state.theme === 'dark');
  }, [state]);

  const openAdd = useCallback(() => {
    setAdding(true);
    void shell.setModalOpen(true);
  }, [shell]);
  const closeAdd = useCallback(() => {
    setAdding(false);
    void shell.setModalOpen(false);
  }, [shell]);

  const openCreateRoom = useCallback(() => {
    setCreatingRoom(true);
    void shell.setModalOpen(true);
  }, [shell]);
  const closeCreateRoom = useCallback(() => {
    setCreatingRoom(false);
    void shell.setModalOpen(false);
  }, [shell]);

  const actions = useMemo(() => ({ openAddAccount: openAdd }), [openAdd]);

  if (!state) return <div className="bg-rail h-full" />;
  const active = state.accounts.find((a) => a.id === state.activeAccount);
  const title = state.settingsOpen
    ? 'Configurações'
    : state.accounts.length > 1 && active
      ? `${active.title} · ${active.name}`
      : (active?.title ?? 'Google Chat');

  return (
    <ShellActionsContext.Provider value={actions}>
      <div className="flex h-full flex-col">
        <TitleBar
          title={title}
          streamer={state.streamer}
          call={state.call}
          onShowCall={() => void window.gchat.call.show(true)}
        />
        <div className="relative flex min-h-0 flex-1">
          <Rail
            accounts={state.accounts}
            activeAccount={state.activeAccount}
            overlay={state.settingsOpen}
            settingsActive={state.settingsOpen}
            onSelect={(id) => void shell.selectAccount(id)}
            onAdd={openAdd}
            onSettings={() => void shell.setSettingsOpen(!state.settingsOpen)}
            roomsOpen={state.roomsPanelOpen}
            inCall={!!state.call}
            onRooms={() => void shell.setRoomsPanelOpen(!state.roomsPanelOpen)}
          />
          {state.roomsPanelOpen && (
            <RoomsPanel rooms={settings?.rooms ?? []} state={state} onCreate={openCreateRoom} />
          )}
          <ChatPlaceholder loading={active?.loading ?? true} />
          {state.settingsOpen && (
            <SettingsScreen onClose={() => void shell.setSettingsOpen(false)} />
          )}
          {adding && <AddAccountModal onClose={closeAdd} />}
          {creatingRoom && (
            <CreateRoomModal accountName={active?.name ?? null} onClose={closeCreateRoom} />
          )}
        </div>
      </div>
    </ShellActionsContext.Provider>
  );
}
