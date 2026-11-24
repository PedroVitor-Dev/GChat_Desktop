import { BrowserWindow, Menu, app, dialog } from 'electron';
import { isDndDuration, type DndDuration } from '../../shared/dnd';
import type { DndService } from '../system/dnd';
import type { PinsService } from '../pins/pins-service';
import type { NotificationHistory } from '../notifications/history';
import { NotificationChannel } from '../../shared/notifications';
import type { InboxEntry } from '../../shared/inbox';
import { isGroupId, isPinId } from '../../shared/pins';
import { IpcChannel, type AppInfo } from '../../shared/ipc';
import type { Settings } from '../../shared/settings';
import { ShellChannel, type ShellState } from '../../shared/shell';
import { isSoundId, type SoundId } from '../../shared/sounds';
import { isAccountId } from '../../shared/accounts';
import type { AccountsService } from '../accounts/accounts-service';
import type { NotificationManager } from '../notifications/manager';
import type { AppShell } from '../shell/app-shell';
import type { StreamerMode } from '../system/streamer-mode';
import type { RoomsService } from '../meet/rooms-service';
import type { AppUpdater } from '../system/updater';
import type { ProfileService } from '../profile/profile-service';
import { isRoomId } from '../../shared/rooms';
import { autostartStatus } from '../system/autostart';
import type { ImportResult, SoundLibrary } from '../sounds/library';
import type { SoundPlayer } from '../sounds/player';
import type { SettingsStore } from '../store/settings-store';
import { handle, noArgs } from './handle';

interface IpcDeps {
  settings: SettingsStore;
  notifications: NotificationManager;
  library: SoundLibrary;
  player: SoundPlayer;
  shell: AppShell;
  accounts: AccountsService;
  streamer: StreamerMode;
  rooms: RoomsService;
  updater: AppUpdater;
  profiles: ProfileService;
  dnd: DndService;
  pins: PinsService;
  history: NotificationHistory;
}

/** Um único argumento do tipo objeto; o conteúdo é normalizado pelo store. */
const oneObject = (args: unknown[]): unknown => {
  if (args.length !== 1 || typeof args[0] !== 'object' || args[0] === null) {
    throw new TypeError('esperado um objeto');
  }
  return args[0];
};

/** Um único id de som válido. */
const oneSoundId = (args: unknown[]): SoundId => {
  if (args.length !== 1 || !isSoundId(args[0])) throw new TypeError('id de som inválido');
  return args[0];
};

/** Um único booleano. */
const oneBoolean = (args: unknown[]): boolean => {
  if (args.length !== 1 || typeof args[0] !== 'boolean') throw new TypeError('esperado booleano');
  return args[0];
};

/** Um id de conta válido (e, opcionalmente, um segundo argumento qualquer). */
const accountArgs = (args: unknown[]): [string, unknown] => {
  if (args.length < 1 || args.length > 2 || !isAccountId(args[0])) {
    throw new TypeError('id de conta inválido');
  }
  return [args[0], args[1]];
};

/** Um único argumento qualquer (validado pelo serviço). */
const oneArg = (args: unknown[]): unknown => {
  if (args.length !== 1) throw new TypeError('esperado um argumento');
  return args[0];
};

const oneDuration = (args: unknown[]): DndDuration => {
  if (args.length !== 1 || !isDndDuration(args[0])) throw new TypeError('duração inválida');
  return args[0];
};

export function registerIpc({
  settings,
  notifications,
  library,
  player,
  shell,
  accounts,
  streamer,
  rooms,
  updater,
  profiles,
  dnd,
  pins,
  history,
}: IpcDeps): void {
  handle(IpcChannel.UpdateStatus, noArgs, () => updater.status());
  handle(IpcChannel.UpdateCheck, noArgs, () => updater.check());
  handle(IpcChannel.UpdateDownload, noArgs, () => updater.download());
  handle(IpcChannel.UpdateInstall, noArgs, () => updater.install());
  updater.on('status', (status) => {
    for (const win of BrowserWindow.getAllWindows()) {
      if (win.webContents.getURL().startsWith('https://')) continue;
      win.webContents.send(IpcChannel.UpdateStatusChanged, status);
    }
  });
  handle(ShellChannel.SetView, oneArg, (view) => {
    if (view !== 'chat' && view !== 'rooms') throw new TypeError('destino inválido');
    shell.setView(view);
  });
  const activeAccount = () => shell.getState().activeAccount;
  /** Id de sala válido + argumento opcional. */
  const roomArgs = (args: unknown[]): [string, unknown] => {
    if (args.length < 1 || args.length > 2 || !isRoomId(args[0]))
      throw new TypeError('sala inválida');
    return [args[0], args[1]];
  };
  const twoArgs = (args: unknown[]): [unknown, unknown] => {
    if (args.length !== 2) throw new TypeError('esperados dois argumentos');
    return [args[0], args[1]];
  };
  handle(IpcChannel.RoomsCreate, oneArg, (name) => rooms.create(name, activeAccount()));
  handle(IpcChannel.RoomsAddLink, twoArgs, ([name, link]) =>
    rooms.addFromLink(name, link, activeAccount()),
  );
  handle(IpcChannel.RoomsRename, roomArgs, ([id, name]) => rooms.rename(id, name));
  handle(IpcChannel.RoomsRemove, roomArgs, ([id]) => {
    if (shell.getState().call?.roomId === id) shell.endCall();
    return rooms.remove(id);
  });
  handle(IpcChannel.RoomsCopyLink, roomArgs, ([id]) => rooms.copyLink(id));
  handle(IpcChannel.CallJoin, roomArgs, ([id]) => {
    const room = rooms.get(id);
    if (!room) return false;
    shell.startCall(room);
    return true;
  });
  handle(IpcChannel.CallLeave, noArgs, () => shell.endCall());
  handle(IpcChannel.StreamerToggle, noArgs, () => streamer.toggle());
  handle(IpcChannel.DndSet, oneDuration, (d) => dnd.set(d));
  handle(
    ShellChannel.PinsPinCurrent,
    (args) => {
      if (args.length !== 1 || (args[0] !== null && !isGroupId(args[0]))) {
        throw new TypeError('grupo inválido');
      }
      return args[0] as string | null;
    },
    (groupId) => pins.pinCurrent(groupId),
  );
  handle(
    ShellChannel.PinsSave,
    (args) => {
      if (args.length !== 1 || !Array.isArray(args[0])) throw new TypeError('lista inválida');
      return args[0] as unknown[];
    },
    (groups) => pins.saveFromRenderer(groups),
  );
  handle(
    ShellChannel.PinsOpen,
    (args) => {
      if (args.length !== 1 || !isPinId(args[0])) throw new TypeError('conversa inválida');
      return args[0];
    },
    (id) => pins.open(id),
  );
  handle(ShellChannel.PinsSetPanel, oneBoolean, (open) => pins.setPanel(open));

  // Notificações perdidas (só memória). A lista respeita a privacidade: o que o
  // toast esconderia (remetente/texto, ou tudo ao transmitir) o painel também esconde.
  const inboxId = (args: unknown[]): string => {
    if (args.length !== 1 || typeof args[0] !== 'string' || !/^[a-z0-9-]{3,40}$/.test(args[0])) {
      throw new TypeError('item inválido');
    }
    return args[0];
  };
  handle(ShellChannel.InboxList, noArgs, (): InboxEntry[] => {
    const { notifications: n, streamer: st } = settings.get();
    const hide = streamer.status().active && st.hideContent;
    return history.list(
      { showSender: n.showSender && !hide, showPreview: n.showPreview && !hide },
      (id) => (settings.get().accounts.list.length > 1 ? shell.accountName(id) : null),
    );
  });
  handle(ShellChannel.InboxSeen, noArgs, () => history.markAllSeen());
  handle(ShellChannel.InboxClear, noArgs, () => history.clear());
  handle(ShellChannel.InboxRemove, inboxId, (id) => history.remove(id));
  handle(ShellChannel.InboxOpen, inboxId, (id) => {
    const item = history.take(id);
    if (!item) return;
    const accountId = item.accountId ?? settings.get().accounts.active;
    // 1) Conversa fixada com o mesmo nome: endereço conhecido, abre na hora.
    const pinId = pins.findByName(accountId, item.title);
    if (pinId) return pins.open(pinId);
    // 2) Como o clique no toast: devolve o clique à notificação na página do
    //    Chat, que abre a conversa (funciona enquanto a página não recarregar).
    shell.focusChat(accountId);
    if (item.frame && !item.frame.isDestroyed()) {
      item.frame.send(NotificationChannel.Clicked, item.notificationId);
    }
  });
  handle(IpcChannel.DndResume, noArgs, () => dnd.resume());
  handle(IpcChannel.DndMenu, noArgs, (_args, event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window) Menu.buildFromTemplate(dnd.menuItems()).popup({ window });
  });
  handle(ShellChannel.GetState, noArgs, (): ShellState => shell.getState());
  handle(ShellChannel.SetSettingsOpen, oneBoolean, (open) => shell.setSettingsOpen(open));
  handle(ShellChannel.SetModalOpen, oneBoolean, (open) => shell.setModalOpen(open));
  handle(ShellChannel.SelectAccount, accountArgs, ([id]) => shell.focusChat(id));

  handle(IpcChannel.AccountAdd, oneArg, (name) => accounts.add(name));
  handle(IpcChannel.AccountRename, accountArgs, ([id, name]) => accounts.rename(id, name));
  handle(IpcChannel.AccountSignOut, accountArgs, async ([id]) => {
    await profiles.clear(id);
    return accounts.signOut(id);
  });
  handle(IpcChannel.AccountRemove, accountArgs, async ([id]) => {
    const r = await accounts.remove(id);
    if (r.ok) await profiles.clear(id);
    return r;
  });
  handle(ShellChannel.ReloadChat, noArgs, () => shell.reloadChat());
  handle(ShellChannel.OpenChatStatus, noArgs, () => shell.openChatStatus());

  handle(IpcChannel.AppInfo, noArgs, (): AppInfo => ({
    name: app.getName(),
    version: app.getVersion(),
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    platform: `${process.platform} ${process.arch}`,
  }));

  handle(IpcChannel.SettingsGet, noArgs, (): Settings => settings.get());
  handle(IpcChannel.SettingsUpdate, oneObject, (patch): Settings => settings.update(patch));
  handle(IpcChannel.NotificationTest, noArgs, () => notifications.showTest());
  handle(IpcChannel.RecentConversations, noArgs, () => notifications.recentConversations());

  handle(IpcChannel.AutostartStatus, noArgs, () => autostartStatus());
  handle(IpcChannel.SoundOptions, noArgs, () => library.options());
  handle(IpcChannel.SoundPreview, oneSoundId, async (id) => {
    // "Som do Windows" só existe dentro de um toast: a prévia mostra um de teste.
    if (id === 'system') return notifications.showTest();
    return player.play(id, settings.get().sounds.volume, { force: true });
  });
  handle(IpcChannel.SoundRemove, oneSoundId, (id) => library.remove(id));
  // O renderer não envia caminhos: o arquivo é escolhido no diálogo nativo do main.
  handle(IpcChannel.SoundImport, noArgs, async (_args, event): Promise<ImportResult | null> => {
    const parent = BrowserWindow.fromWebContents(event.sender);
    const options: Electron.OpenDialogOptions = {
      title: 'Importar som',
      properties: ['openFile'],
      filters: [{ name: 'Áudio (MP3, WAV, OGG)', extensions: ['mp3', 'wav', 'ogg'] }],
    };
    const picked = parent
      ? await dialog.showOpenDialog(parent, options)
      : await dialog.showOpenDialog(options);
    const file = picked.filePaths[0];
    if (picked.canceled || !file) return null;
    return library.import(file);
  });

  settings.on('change', (next) => {
    for (const win of BrowserWindow.getAllWindows()) {
      // Só janelas locais recebem (o Chat fica numa view própria, fora desta lista).
      if (win.webContents.getURL().startsWith('https://')) continue;
      win.webContents.send(IpcChannel.SettingsChanged, next);
    }
  });
}
