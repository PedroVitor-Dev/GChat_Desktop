import { describe, expect, it } from 'vitest';
import type { CapturedNotification } from '../../shared/notifications';
import { DEFAULT_SETTINGS } from '../../shared/settings';
import { Deduplicator, formatToast, isInQuietHours, isMuted } from './rules';

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
