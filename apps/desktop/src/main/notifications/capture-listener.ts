import { ipcMain } from 'electron';
import { NotificationChannel, parseCapture } from '../../shared/notifications';
import { logCapture } from '../chat/diagnostics';
import { isChatSession } from '../chat/session';
import type { NotificationManager } from './manager';

const CHAT_ORIGIN = 'https://chat.google.com';

/** Recebe as capturas do preload do Chat. Só aceita frames do chat.google.com. */
export function listenForCaptures(manager: NotificationManager): void {
  ipcMain.on(NotificationChannel.Captured, (event, raw: unknown) => {
    const frame = event.senderFrame;
    if (!frame || !isChatSession(event.sender.session)) return;
    if (frame.origin !== CHAT_ORIGIN) return;

    const capture = parseCapture(raw);
    if (!capture) return;

    const outcome = manager.handle(capture, frame);
    logCapture(capture, frame === event.sender.mainFrame, outcome);
  });
}
