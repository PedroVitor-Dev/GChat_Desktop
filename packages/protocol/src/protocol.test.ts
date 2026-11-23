import { describe, expect, it } from 'vitest';
import {
  FrameDecoder,
  LIMITS,
  MAX_MESSAGE_BYTES,
  PROTOCOL_VERSION,
  encodeFrame,
  parseAppToExtension,
  parseExtensionToApp,
} from './index';

const notification = {
  v: PROTOCOL_VERSION,
  type: 'notification',
  id: 'n-1',
  title: 'Maria',
  body: 'Oi!',
  tag: 'conv-123',
  receivedAt: 1_700_000_000_000,
};

describe('parseExtensionToApp', () => {
  it('aceita notificação válida e descarta campos extras', () => {
    const r = parseExtensionToApp({ ...notification, extra: 'x' });
    expect(r).toEqual({ ok: true, value: notification });
  });

  it('aceita notificação sem body e tag', () => {
    const { body: _b, tag: _t, ...minimal } = notification;
    expect(parseExtensionToApp(minimal).ok).toBe(true);
  });

  it.each([
    ['versão errada', { ...notification, v: 2 }],
    ['título vazio', { ...notification, title: '' }],
    ['título grande', { ...notification, title: 'a'.repeat(LIMITS.titleLength + 1) }],
    ['body não-string', { ...notification, body: 42 }],
    ['receivedAt inválido', { ...notification, receivedAt: Number.NaN }],
    ['tipo desconhecido', { v: PROTOCOL_VERSION, type: 'evil' }],
    ['não-objeto', 'oi'],
    ['array', []],
  ])('rejeita %s', (_name, input) => {
    expect(parseExtensionToApp(input).ok).toBe(false);
  });

  it('valida unread', () => {
    expect(parseExtensionToApp({ v: 1, type: 'unread', count: 3 }).ok).toBe(true);
    expect(parseExtensionToApp({ v: 1, type: 'unread', count: -1 }).ok).toBe(false);
    expect(parseExtensionToApp({ v: 1, type: 'unread', count: 1.5 }).ok).toBe(false);
  });
});

describe('parseAppToExtension', () => {
  it('valida focus e config', () => {
    expect(parseAppToExtension({ v: 1, type: 'focus', id: 'n-1' }).ok).toBe(true);
    expect(
      parseAppToExtension({ v: 1, type: 'config', suppressBrowserNotification: true }).ok,
    ).toBe(true);
    expect(parseAppToExtension({ v: 1, type: 'config', suppressBrowserNotification: 'y' }).ok).toBe(
      false,
    );
  });
});

describe('framing', () => {
  it('ida e volta com UTF-8 e pedaços fragmentados', () => {
    const msgs = [notification, { v: 1, type: 'unread', count: 7 }, { texto: 'ação 🎉' }];
    const bytes = Uint8Array.from(msgs.flatMap((m) => [...encodeFrame(m)]));

    const decoder = new FrameDecoder();
    const out: unknown[] = [];
    for (let i = 0; i < bytes.length; i += 3) out.push(...decoder.push(bytes.subarray(i, i + 3)));

    expect(out).toEqual(msgs);
  });

  it('rejeita frame acima do limite', () => {
    const header = new Uint8Array(4);
    new DataView(header.buffer).setUint32(0, MAX_MESSAGE_BYTES + 1, true);
    expect(() => new FrameDecoder().push(header)).toThrow(RangeError);
  });
});
