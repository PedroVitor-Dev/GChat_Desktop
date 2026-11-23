import { Menu, app } from 'electron';
import { registerIpc } from './ipc';
import { listenForCaptures } from './notifications/capture-listener';
import { NotificationManager } from './notifications/manager';
import { applySecurityPolicies } from './security';
import { AppShell } from './shell/app-shell';
import { SoundLibrary } from './sounds/library';
import { SoundPlayer } from './sounds/player';
import { SettingsStore } from './store/settings-store';

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

    const shell = new AppShell(settings.get().appearance);
    const player = new SoundPlayer();
    const library = new SoundLibrary(settings, (bytes) => player.probe(bytes));
    player.attach(library);
    const notifications = new NotificationManager({ settings, player, shell });

    registerIpc({ settings, notifications, library, player, shell });
    listenForCaptures(notifications);
    settings.on('change', (next) => shell.applyAppearance(next.appearance));

    // `--settings` abre direto nas configurações (atalhos e, na Fase 6, Jump List).
    const route = (argv: string[]) =>
      argv.includes('--settings') ? shell.openSettings() : shell.focusChat();
    app.on('second-instance', (_event, argv) => route(argv));
    if (process.argv.includes('--settings')) shell.openSettings();

    // Fechar a janela encerra o app; a Fase 6 troca isto por "continuar na bandeja".
    shell.window.on('closed', () => app.quit());

    // Garante que a última alteração de configuração chegue ao disco.
    let flushed = false;
    app.on('before-quit', (event) => {
      if (flushed) return;
      event.preventDefault();
      flushed = true;
      player.destroy();
      void settings.flush().finally(() => app.quit());
    });
  });
}
