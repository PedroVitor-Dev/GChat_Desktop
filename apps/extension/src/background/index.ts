/**
 * Service worker da extensão: mantém a porta Native Messaging com o app Windows.
 * Fase 2: conexão, hello e repasse de notificações. Foco/clique chegam na Fase 4.
 */
import {
  NATIVE_HOST_NAME,
  PROTOCOL_VERSION,
  parseAppToExtension,
  parseExtensionToApp,
  type BrowserKind,
  type ExtensionToApp,
} from '@gchat/protocol';

let port: chrome.runtime.Port | null = null;

const detectBrowser = (): BrowserKind =>
  navigator.userAgent.includes('Edg/')
    ? 'edge'
    : navigator.userAgent.includes('Chrome/')
      ? 'chrome'
      : 'other';

function connect(): chrome.runtime.Port {
  if (port) return port;
  const p = chrome.runtime.connectNative(NATIVE_HOST_NAME);
  p.onMessage.addListener((raw: unknown) => {
    const parsed = parseAppToExtension(raw);
    if (!parsed.ok) return;
    // Fase 4: tratar 'focus' e 'config'.
  });
  p.onDisconnect.addListener(() => {
    port = null; // reconecta sob demanda na próxima mensagem
  });
  p.postMessage({
    v: PROTOCOL_VERSION,
    type: 'hello',
    browser: detectBrowser(),
    extensionVersion: chrome.runtime.getManifest().version,
  } satisfies ExtensionToApp);
  port = p;
  return p;
}

chrome.runtime.onMessage.addListener((raw: unknown, sender) => {
  // Aceita apenas mensagens dos nossos content scripts no Google Chat.
  if (sender.id !== chrome.runtime.id || !sender.url?.startsWith('https://chat.google.com/')) {
    return;
  }
  const parsed = parseExtensionToApp(raw);
  if (parsed.ok) connect().postMessage(parsed.value);
});
