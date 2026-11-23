import { describe, expect, it } from 'vitest';
import { textShape } from './diagnostics';

describe('textShape', () => {
  it('esconde letras e números, mantém a estrutura', () => {
    expect(textShape('Oi @Pedro, são 15h!')).toBe('"Aa @Aaaaa, aaa 99a!"');
    expect(textShape(undefined)).toBe('ausente');
  });

  it('corta textos longos', () => {
    expect(textShape('a'.repeat(100), 5)).toBe('"aaaaa…"');
  });
});
