import { describe, expect, it } from 'vitest';
import { leadingEmoji, parseProfileReport, parseStatusReport, photoUrlAtSize } from './profile';

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

describe('parseStatusReport', () => {
  it('reconhece a presença pelo rótulo do botão', () => {
    expect(parseStatusReport({ label: 'Status: Ativo', text: 'Ativo' })).toEqual({
      presence: 'active',
    });
    expect(parseStatusReport({ label: 'Status: Não perturbe', text: 'Não perturbe' })).toEqual({
      presence: 'dnd',
    });
    expect(parseStatusReport({ label: 'Status: Away', text: 'Away' })).toEqual({
      presence: 'away',
    });
  });

  it('separa o status personalizado', () => {
    expect(
      parseStatusReport({ label: 'Status: Ativo, 🧪 Testando o app', text: '🧪 Testando o app' }),
    ).toEqual({ presence: 'active', text: '🧪 Testando o app' });
    expect(parseStatusReport({ label: 'Status: Ausente', text: '🍔 Almoçando' })).toEqual({
      presence: 'away',
      text: '🍔 Almoçando',
    });
  });

  it('rejeita o que não reconhece', () => {
    expect(parseStatusReport({ label: 'Configurações', text: '' })).toBeNull();
    expect(parseStatusReport('Ativo')).toBeNull();
    expect(parseStatusReport({ label: 'x'.repeat(600), text: '' })).toBeNull();
  });
});

describe('leadingEmoji', () => {
  it('pega o emoji do começo, com variação e ZWJ', () => {
    expect(leadingEmoji('☀️ Praise the Sun!')).toBe('☀️');
    expect(leadingEmoji('👩‍💻 Codando')).toBe('👩‍💻');
    expect(leadingEmoji('🇧🇷 Jogo')).toBe('🇧🇷');
    expect(leadingEmoji('Sem emoji')).toBeNull();
    expect(leadingEmoji(undefined)).toBeNull();
  });
});
