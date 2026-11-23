import { describe, expect, it } from 'vitest';
import { cleanRoomName, isMeetCode, meetCodeFromUrl, normalizeRooms } from './rooms';

describe('códigos do Meet', () => {
  it('valida o formato 3-4-3', () => {
    expect(isMeetCode('abc-defg-hij')).toBe(true);
    expect(isMeetCode('ABC-defg-hij')).toBe(false);
    expect(isMeetCode('abc-def-hij')).toBe(false);
    expect(isMeetCode('lookup/abc')).toBe(false);
  });

  it('extrai o código só de URLs do Meet', () => {
    expect(meetCodeFromUrl('https://meet.google.com/abc-defg-hij?authuser=0')).toBe('abc-defg-hij');
    expect(meetCodeFromUrl('https://meet.google.com/new')).toBeNull();
    expect(meetCodeFromUrl('https://meet.google.com.evil.io/abc-defg-hij')).toBeNull();
    expect(meetCodeFromUrl('http://meet.google.com/abc-defg-hij')).toBeNull();
  });
});

describe('normalizeRooms', () => {
  it('mantém só salas válidas e sem duplicatas', () => {
    const rooms = normalizeRooms(
      [
        {
          id: 'room-abc123',
          name: '  Sala  dos amigos ',
          code: 'abc-defg-hij',
          accountId: 'account-1',
        },
        { id: 'room-abc123', name: 'Dup', code: 'abc-defg-hij', accountId: 'account-1' },
        { id: 'room-x', name: 'Id ruim', code: 'abc-defg-hij', accountId: 'account-1' },
        { id: 'room-def456', name: 'Código ruim', code: 'javascript:1', accountId: 'account-1' },
      ],
      [],
    );
    expect(rooms).toEqual([
      { id: 'room-abc123', name: 'Sala dos amigos', code: 'abc-defg-hij', accountId: 'account-1' },
    ]);
  });

  it('limpa nomes', () => {
    expect(cleanRoomName('a\u0007b')).toBe('ab');
    expect(cleanRoomName('   ')).toBeNull();
  });
});
