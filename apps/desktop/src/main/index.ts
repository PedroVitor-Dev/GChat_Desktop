import { Menu, Notification, app } from 'electron';
import { AccountsService } from './accounts/accounts-service';
import { registerIpc } from './ipc';
import { listenForCaptures } from './notifications/capture-listener';
import { NotificationManager } from './notifications/manager';
import { applySecurityPolicies } from './security';
import { AppShell } from './shell/app-shell';
import { SoundLibrary } from './sounds/library';
import { SoundPlayer } from './sounds/player';
import { SettingsStore } from './store/settings-store';
import { appIcon } from './system/app-icon';
import { HIDDEN_ARG, setJumpList, setLaunchAtLogin } from './system/autostart';
import { WindowStateFile } from './system/window-state';
import { StreamerMode } from './system/streamer-mode';
import { RoomsService } from './meet/rooms-service';
import { AppUpdater } from './system/updater';
import { ProfileService } from './profile/profile-service';
import { AppTray } from './tray/tray';

const APP_ID = 'com.pedrovitor.gchatdesktopplus';

// Uma única instância: abrir o atalho de novo só traz a janela para frente.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.setAppUserModelId(APP_ID); // necessário para toasts nativos no Windows
  // Sem menu nativo: a janela tem barra de título própria e os atalhos são do shell.
  Menu.setApplicationMenu(null);

  void app.whenReady().then(() => {
    const settings = new SettingsStore();
    applySecurityPolicies();

    // Aberto pelo Windows no login + "iniciar minimizado" → só a bandeja.
    const startHidden = process.argv.includes(HIDDEN_ARG) && settings.get().general.startMinimized;

    let tray: AppTray | null = null;
    const shell = new AppShell({
      appearance: settings.get().appearance,
      accounts: settings.get().accounts,
      startHidden,
      windowState: new WindowStateFile(app.getPath('userData')),
      shouldHideOnClose: () => settings.get().general.closeToTray,
      onHiddenToTray: () => {
        if (settings.get().general.trayHintShown || !Notification.isSupported()) return;
        new Notification({
          title: 'O GChat Desktop+ continua aberto',
          body: 'Ele segue na bandeja do sistema para avisar sobre novas mensagens. Para sair, use “Sair” no ícone da bandeja.',
          icon: appIcon(),
          silent: true,
        }).show();
        settings.updateInternal({ general: { trayHintShown: true } });
      },
      onUnreadChange: (count) => tray?.setUnread(count),
      onActiveAccountChange: (id) => accounts.setActive(id),
    });
    const accounts = new AccountsService(settings, shell);

    const player = new SoundPlayer();
    const library = new SoundLibrary(settings, (bytes) => player.probe(bytes));
    player.attach(library);
    const streamer = new StreamerMode(settings);
    const notifications = new NotificationManager({ settings, player, shell, streamer });

    tray = new AppTray(settings, {
      openChat: () => shell.focusChat(),
      openSettings: () => shell.openSettings(),
      quit: () => app.quit(),
      toggleStreamer: () => streamer.toggle(),
      installUpdate: () => updater.install(),
    });
    const onStreamer = () => {
      shell.setStreamer(streamer.status());
      tray?.setStreamer(streamer.status());
    };
    streamer.on('change', onStreamer);
    onStreamer();

    const rooms = new RoomsService(settings);
    const updater = new AppUpdater(settings);
    const profiles = new ProfileService((contents) => shell.accountIdFor(contents));
    shell.setProfiles(profiles.all());
    profiles.on('change', (all) => shell.setProfiles(all));
    registerIpc({
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
    });
    updater.on('status', (s) =>
      tray?.setUpdateReady(s.state === 'downloaded' ? (s.version ?? null) : null),
    );
    updater.start();
    listenForCaptures(notifications, (contents) => shell.accountIdFor(contents));

    let launchAtLogin = settings.get().general.launchAtLogin;
    setLaunchAtLogin(launchAtLogin);
    setJumpList();
    settings.on('change', (next) => {
      shell.applyAppearance(next.appearance);
      shell.syncAccounts(next.accounts);
      if (next.general.launchAtLogin !== launchAtLogin) {
        launchAtLogin = next.general.launchAtLogin;
        setLaunchAtLogin(launchAtLogin);
      }
    });

    // `--settings` abre direto nas configurações (Jump List e atalhos).
    const route = (argv: string[]) =>
      argv.includes('--settings') ? shell.openSettings() : shell.focusChat();
    app.on('second-instance', (_event, argv) => route(argv));
    if (process.argv.includes('--settings')) shell.openSettings();

    // Com "fechar para a bandeja" desligado, fechar a janela encerra o app.
    shell.window.on('closed', () => app.quit());

    // Garante que a última alteração de configuração chegue ao disco.
    let flushed = false;
    app.on('before-quit', (event) => {
      shell.markQuitting();
      if (flushed) return;
      event.preventDefault();
      flushed = true;
      tray?.destroy();
      streamer.dispose();
      updater.stop();
      player.destroy();
      void Promise.all([settings.flush(), shell.flushSessions()]).finally(() => app.quit());
    });
  });
}
