import { useCallback, useEffect, useMemo, useState } from 'react';
import { ShellActionsContext } from './hooks/shellActions';
import { useSettings } from './hooks/useSettings';
import { useShellState } from './hooks/useShellState';
import { CreateRoomModal } from './shell/CreateRoomModal';
import { RoomsLobby } from './shell/RoomsLobby';
import { RoomsPanel } from './shell/RoomsPanel';
import { AddAccountModal } from './shell/AddAccountModal';
import { ChatPlaceholder } from './shell/ChatPlaceholder';
import { Rail } from './shell/Rail';
import { SettingsScreen } from './shell/SettingsScreen';
import type { SectionId } from './sections';
import { TitleBar } from './shell/TitleBar';
import { PinsPanel } from './shell/PinsPanel';
import { InboxPopover } from './shell/InboxPopover';
import { applyThemeVars } from './theme-vars';
import { ThemeParticles } from './components/ThemeParticles';

/**
 * Janela principal: barra de título, trilho e a área onde o main posiciona a
 * view do Google Chat da conta ativa. Configurações e modais cobrem essa área
 * (o main esconde a view enquanto estão abertos).
 */
export function App() {
  const state = useShellState();
  const [adding, setAdding] = useState(false);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [settingsSection, setSettingsSection] = useState<SectionId>('notificacoes');
  const [settings] = useSettings();
  const { shell } = window.gchat;

  useEffect(() => {
    if (!state) return;
    const root = document.documentElement;
    root.classList.toggle('theme-light', state.theme === 'light');
    root.classList.toggle('theme-dark', state.theme === 'dark');
    applyThemeVars(state.look);
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

  // Notificações perdidas: cobre a área do Chat enquanto aberta (como um modal).
  const [inboxOpen, setInboxOpen] = useState(false);
  const openInbox = useCallback(() => {
    setInboxOpen(true);
    void shell.setModalOpen(true);
  }, [shell]);
  const closeInbox = useCallback(() => {
    setInboxOpen(false);
    void shell.setModalOpen(false);
  }, [shell]);

  const actions = useMemo(() => ({ openAddAccount: openAdd }), [openAdd]);

  if (!state) return <div className="bg-rail h-full" />;
  const active = state.accounts.find((a) => a.id === state.activeAccount);
  const inRooms = state.view === 'rooms';
  const title = state.settingsOpen
    ? 'Configurações'
    : inRooms
      ? state.call
        ? `Em chamada · ${state.call.name}`
        : 'Salas de vídeo'
      : state.accounts.length > 1 && active
        ? `${active.title} · ${active.name}`
        : (active?.title ?? 'Google Chat');

  return (
    <ShellActionsContext.Provider value={actions}>
      <div className="app-backdrop" aria-hidden />
      {state.look.particles && (
        <ThemeParticles mark={state.look.particles.mark} color={state.look.particles.color} />
      )}
      <div className="flex h-full flex-col">
        <TitleBar
          title={title}
          streamer={state.streamer}
          dnd={state.dnd}
          pins={
            // Só no Chat: o painel de fixados é a "lista de canais" da conta ativa.
            !inRooms && !state.settingsOpen
              ? {
                  open: state.pins.open,
                  unread: Object.values(state.pins.unread).reduce((a, b) => a + b, 0),
                }
              : null
          }
          call={state.call}
          onShowCall={() => void shell.setView('rooms')}
          inbox={{
            unseen: state.inbox.unseen,
            open: inboxOpen,
            onToggle: () => (inboxOpen ? closeInbox() : openInbox()),
          }}
        />
        <div className="relative flex min-h-0 flex-1">
          {/* Configurações em tela cheia cobrem tudo: com fundo translúcido, o trilho
              e o Chat não podem aparecer por trás delas. */}
          <div className={`contents ${state.settingsOpen ? 'invisible' : ''}`}>
            <Rail
              accounts={state.accounts}
              activeAccount={state.activeAccount}
              view={state.view}
              settingsOpen={state.settingsOpen}
              inCall={!!state.call}
              onSelect={(id) => void shell.selectAccount(id)}
              onAdd={openAdd}
              onRooms={() => void shell.setView('rooms')}
              onSettings={() => {
                setSettingsSection('notificacoes');
                void shell.setSettingsOpen(!state.settingsOpen);
              }}
              onProfile={() => void shell.openChatStatus()}
              dnd={state.dnd}
            />
            {inRooms ? (
              <>
                <RoomsPanel rooms={settings?.rooms ?? []} state={state} onCreate={openCreateRoom} />
                {/* Com chamada, o main posiciona a view do Meet aqui; sem chamada, o saguão. */}
                {state.call ? (
                  <div className="bg-content flex-1" />
                ) : (
                  <RoomsLobby
                    rooms={settings?.rooms ?? []}
                    accounts={state.accounts}
                    onCreate={openCreateRoom}
                  />
                )}
              </>
            ) : (
              <>
                {state.pins.open && settings && (
                  <PinsPanel
                    state={state}
                    pins={settings.pins}
                    vip={settings.notifications.vipConversations}
                  />
                )}
                <ChatPlaceholder loading={active?.loading ?? true} />
              </>
            )}
          </div>
          {state.settingsOpen && (
            <SettingsScreen
              key={settingsSection}
              initialSection={settingsSection}
              onClose={() => void shell.setSettingsOpen(false)}
            />
          )}
          {adding && <AddAccountModal onClose={closeAdd} />}
          {creatingRoom && (
            <CreateRoomModal accountName={active?.name ?? null} onClose={closeCreateRoom} />
          )}
          {inboxOpen && <InboxPopover version={state.inbox.version} onClose={closeInbox} />}
        </div>
      </div>
    </ShellActionsContext.Provider>
  );
}
