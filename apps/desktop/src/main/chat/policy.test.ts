import { describe, expect, it } from 'vitest';
import {
  CHAT_URL,
  decideNavigation,
  decidePopup,
  isLoggedOutLanding,
  isPermissionAllowed,
} from './policy';

describe('decideNavigation', () => {
  it('mantém Chat e login do Google na janela', () => {
    expect(decideNavigation(CHAT_URL, '')).toBe('allow');
    expect(decideNavigation('https://accounts.google.com/v3/signin', CHAT_URL)).toBe('allow');
    expect(decideNavigation('https://mail.google.com/chat/u/0', CHAT_URL)).toBe('allow');
  });

  it('abre links de mensagens no navegador padrão', () => {
    expect(decideNavigation('https://github.com/x', CHAT_URL)).toBe('external');
    expect(decideNavigation('http://example.com', CHAT_URL)).toBe('external');
  });

  it('permite provedor de SSO apenas durante o login', () => {
    const login = 'https://accounts.google.com/v3/signin';
    expect(decideNavigation('https://empresa.okta.com/sso', login)).toBe('allow');
    expect(decideNavigation('https://empresa.okta.com/sso', CHAT_URL)).toBe('external');
  });

  it('não se deixa enganar por domínios parecidos', () => {
    expect(decideNavigation('https://google.com.evil.io/', CHAT_URL)).toBe('external');
    expect(decideNavigation('https://evilgoogle.com/', CHAT_URL)).toBe('external');
  });

  it('bloqueia esquemas perigosos e URLs inválidas', () => {
    expect(decideNavigation('file:///C:/Windows', CHAT_URL)).toBe('block');
    expect(decideNavigation('javascript:alert(1)', CHAT_URL)).toBe('block');
    expect(decideNavigation('não é url', CHAT_URL)).toBe('block');
  });
});

describe('decidePopup', () => {
  it('login vira janela filha; o resto vai para o navegador', () => {
    expect(decidePopup('https://accounts.google.com/o/oauth2')).toBe('child');
    expect(decidePopup('https://drive.google.com/file/1')).toBe('external');
    expect(decidePopup('ms-settings:privacy')).toBe('block');
  });
});

describe('isLoggedOutLanding', () => {
  it('detecta a página de produto exibida sem sessão', () => {
    expect(isLoggedOutLanding('https://workspace.google.com/products/chat/')).toBe(true);
    expect(isLoggedOutLanding(CHAT_URL)).toBe(false);
  });
});

describe('isPermissionAllowed', () => {
  it('libera só o necessário e só para o Chat/Meet', () => {
    expect(isPermissionAllowed('notifications', 'https://chat.google.com')).toBe(true);
    expect(isPermissionAllowed('media', 'https://meet.google.com')).toBe(true);
    expect(isPermissionAllowed('geolocation', 'https://chat.google.com')).toBe(false);
    expect(isPermissionAllowed('notifications', 'https://evil.com')).toBe(false);
    expect(isPermissionAllowed('display-capture', 'https://meet.google.com')).toBe(true);
    expect(isPermissionAllowed('display-capture', 'https://chat.google.com')).toBe(false);
  });
});
