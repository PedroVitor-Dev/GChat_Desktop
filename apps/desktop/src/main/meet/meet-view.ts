import { WebContentsView } from 'electron';
import { applyChatPolicy } from '../chat/chat-view';
import { getChatSession } from '../chat/session';

/**
 * View do Google Meet na sessão da conta (já logada). Sem preload: o app não
 * interfere na página do Meet (microfone, câmera e tela ficam nos controles dele).
 */
export function createMeetView(partition: string): WebContentsView {
  const view = new WebContentsView({
    webPreferences: {
      session: getChatSession(partition),
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
