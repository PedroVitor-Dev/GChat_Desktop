import { describe, expect, it } from 'vitest';
import type { CapturedNotification } from '../../shared/notifications';
import { DEFAULT_SETTINGS } from '../../shared/settings';
import {
  Deduplicator,
  chooseSound,
  formatToast,
  isInQuietHours,
  isMention,
  isMuted,
  isVip,
} from './rules';

const at = (hhmm: string) => new Date(`2026-11-23T${hhmm}:00`);
const msg = (over: Partial<CapturedNotification> = {}): CapturedNotification => ({
  id: 'a',
  api: 'window.Notification',
  title: 'Maria',
  body: 'Oi!',
  ...over,
});

describe('isInQuietHours', () => {
  const overnight = { enabled: true, start: '22:00', end: '07:00' } as const;
  const daytime = { enabled: true, start: '12:00', end: '13:30' } as const;

  it('faixa que cruza a meia-noite', () => {
    expect(isInQuietHours(at('23:15'), overnight)).toBe(true);
    expect(isInQuietHours(at('03:00'), overnight)).toBe(true);
    expect(isInQuietHours(at('07:00'), overnight)).toBe(false);
    expect(isInQuietHours(at('12:00'), overnight)).toBe(false);
  });

  it('faixa no mesmo dia', () => {
    expect(isInQuietHours(at('12:00'), daytime)).toBe(true);
    expect(isInQuietHours(at('13:30'), daytime)).toBe(false);
  });

  it('desligado ou faixa vazia nunca silencia', () => {
    expect(isInQuietHours(at('23:00'), { ...overnight, enabled: false })).toBe(false);
    expect(isInQuietHours(at('10:00'), { enabled: true, start: '10:00', end: '10:00' })).toBe(
      false,
    );
  });
});

describe('formatToast', () => {
  it('respeita as opções de privacidade', () => {
    expect(formatToast(msg(), { showSender: true, showPreview: true })).toEqual({
      title: 'Maria',
      body: 'Oi!',
    });
    expect(formatToast(msg(), { showSender: true, showPreview: false })).toEqual({
      title: 'Maria',
      body: 'Nova mensagem',
    });
    expect(formatToast(msg(), { showSender: false, showPreview: false })).toEqual({
      title: 'Google Chat',
      body: 'Você recebeu uma nova mensagem',
    });
  });
});

describe('isMuted', () => {
  it('compara pelo título normalizado', () => {
    const settings = { ...DEFAULT_SETTINGS.notifications, mutedConversations: ['Maria'] };
    expect(isMuted(msg({ title: ' Maria ' }), settings)).toBe(true);
    expect(isMuted(msg({ title: 'João' }), settings)).toBe(false);
  });
});

describe('Deduplicator', () => {
  it('descarta repetição dentro da janela e libera depois', () => {
    const d = new Deduplicator(10_000);
    expect(d.isDuplicate(msg(), 0)).toBe(false);
    expect(d.isDuplicate(msg({ id: 'b' }), 5_000)).toBe(true);
    expect(d.isDuplicate(msg({ body: 'Outra' }), 5_000)).toBe(false);
    expect(d.isDuplicate(msg(), 20_001)).toBe(false);
  });

  it('não cresce além do limite', () => {
    const d = new Deduplicator(60_000, 3);
    for (let i = 0; i < 10; i++) d.isDuplicate(msg({ body: `m${i}` }), i);
    expect(d.isDuplicate(msg({ body: 'm0' }), 11)).toBe(false);
  });
});

describe('isMention', () => {
  it('ignora acentos e maiúsculas e só olha o texto', () => {
    expect(isMention(msg({ body: 'Oi @joao, pode ver?' }), ['@João'])).toBe(true);
    expect(isMention(msg({ body: 'Oi pessoal' }), ['@João'])).toBe(false);
    expect(isMention(msg({ title: '@João', body: 'oi' }), ['@João'])).toBe(false);
  });

  it('sem palavras configuradas, qualquer @menção conta', () => {
    expect(isMention(msg({ body: 'Oi @joao' }), [])).toBe(true);
    expect(isMention(msg({ body: '@Ângela pode ver?' }), [])).toBe(true);
    expect(isMention(msg({ body: 'Avisem @todos' }), [])).toBe(true);
    expect(isMention(msg({ body: 'Manda para pedro@empresa.com' }), [])).toBe(false);
    expect(isMention(msg({ body: 'Oi pessoal' }), [])).toBe(false);
    expect(isMention(msg({ body: 'Custa @ 10 reais' }), [])).toBe(false);
  });

  it('com palavras configuradas, só elas contam', () => {
    expect(isMention(msg({ body: 'Oi @joao' }), ['Pedro'])).toBe(false);
    expect(isMention(msg({ body: 'Pedro Vitor, pode ver?' }), ['pedro vitor'])).toBe(true);
  });
});

describe('chooseSound', () => {
  const sounds = {
    enabled: true,
    defaultSound: 'builtin:gota',
    mentionSound: 'builtin:sino',
    conversationSounds: { Maria: 'builtin:pop' },
    vipSound: 'builtin:dois-toques',
  } as const;

  it('menção > conversa > padrão', () => {
    expect(chooseSound(msg(), sounds, true)).toBe('builtin:sino');
    expect(chooseSound(msg(), sounds, false)).toBe('builtin:pop');
    expect(chooseSound(msg({ title: 'João' }), sounds, false)).toBe('builtin:gota');
  });

  it('menção sem som próprio usa a regra normal; sons desligados = nenhum', () => {
    expect(chooseSound(msg(), { ...sounds, mentionSound: null }, true)).toBe('builtin:pop');
    expect(chooseSound(msg(), { ...sounds, enabled: false }, true)).toBe('none');
  });
});

describe('pessoas prioritárias', () => {
  const settings = { vipConversations: ['Maria'] };

  it('reconhece a conversa pelo nome exibido', () => {
    expect(isVip(msg(), settings)).toBe(true);
    expect(isVip(msg({ title: '  Maria ' }), settings)).toBe(true);
    expect(isVip(msg({ title: 'João' }), settings)).toBe(false);
  });

  it('som da VIP vem antes de menção e conversa; sem som próprio, regra normal', () => {
    const sounds = {
      enabled: true,
      defaultSound: 'builtin:gota',
      mentionSound: 'builtin:sino',
      conversationSounds: { Maria: 'builtin:pop' },
      vipSound: 'builtin:dois-toques',
    } as const;
    expect(chooseSound(msg(), sounds, true, true)).toBe('builtin:dois-toques');
    expect(chooseSound(msg(), { ...sounds, vipSound: null }, false, true)).toBe('builtin:pop');
    expect(chooseSound(msg(), { ...sounds, enabled: false }, false, true)).toBe('none');
  });
});
