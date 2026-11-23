import { describe, expect, it } from 'vitest';
import { parseProfileReport, photoUrlAtSize } from './profile';

const photo = 'https://lh3.googleusercontent.com/a/ACg8ocABC123=s32-c-mo';

describe('parseProfileReport', () => {
  it('aceita foto do Google e nome limpo', () => {
    expect(parseProfileReport({ photoUrl: photo, displayName: '  Pedro   Vitor ' })).toEqual({
      photoUrl: photo,
      displayName: 'Pedro Vitor',
    });
  });

  it('recusa outras origens, e-mails e lixo', () => {
    expect(parseProfileReport({ photoUrl: 'https://evil.com/x.png', displayName: 'A' })).toBeNull();
    expect(
      parseProfileReport({ photoUrl: 'http://lh3.googleusercontent.com/a/x', displayName: 'A' }),
    ).toBeNull();
    expect(parseProfileReport({ photoUrl: photo, displayName: 'eu@gmail.com' })).toBeNull();
    expect(parseProfileReport({ photoUrl: photo, displayName: '' })).toBeNull();
    expect(parseProfileReport(null)).toBeNull();
  });
});

describe('photoUrlAtSize', () => {
  it('troca o sufixo de tamanho', () => {
    expect(photoUrlAtSize(photo)).toBe('https://lh3.googleusercontent.com/a/ACg8ocABC123=s128-c');
    expect(photoUrlAtSize('https://lh3.googleusercontent.com/a/X', 64)).toBe(
      'https://lh3.googleusercontent.com/a/X=s64-c',
    );
  });
});
