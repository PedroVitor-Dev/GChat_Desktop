import { join } from 'node:path';
import { WebContentsView } from 'electron';
import { applyChatPolicy } from '../chat/chat-view';
import { getChatSession } from '../chat/session';

/**
 * View do Google Meet na sessão da conta (já logada). O preload só existe para o
 * supressor de ruído opcional (filtra o microfone antes de o Meet recebê-lo); a
 * tela e os controles do Meet ficam intactos.
 */
export function createMeetView(partition: string): WebContentsView {
  const view = new WebContentsView({
    webPreferences: {
      session: getChatSession(partition),
      preload: join(import.meta.dirname, '../preload/meet.cjs'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: false,
      // A chamada continua normal com o Chat em primeiro plano ou a janela oculta.
      backgroundThrottling: false,
    },
  });
  applyChatPolicy(view.webContents);
  return view;
}
