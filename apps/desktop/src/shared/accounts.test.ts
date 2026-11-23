import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ACCOUNT,
  accountInitials,
  cleanAccountName,
  nextAccountId,
  normalizeAccounts,
} from './accounts';

const base = { list: [DEFAULT_ACCOUNT], active: 'account-1' };

describe('normalizeAccounts', () => {
  it('lixo mantém a base (sempre ao menos uma conta)', () => {
    expect(normalizeAccounts(null, base)).toEqual(base);
    expect(normalizeAccounts({ list: [] }, base)).toEqual(base);
    expect(normalizeAccounts({ list: [{ id: '../x', name: 'Mal' }] }, base)).toEqual(base);
  });

  it('valida ids, nomes, cores e conta ativa', () => {
    const r = normalizeAccounts(
      {
        list: [
          { id: 'account-1', name: '  Pessoal  ', color: 7 },
          { id: 'account-2', name: 'Trabalho' },
          { id: 'account-2', name: 'Duplicada' },
          { id: 'account-3', name: '   ' },
        ],
        active: 'account-9',
      },
      base,
    );
    expect(r.list).toEqual([
      { id: 'account-1', name: 'Pessoal', color: 1 },
      { id: 'account-2', name: 'Trabalho', color: 1 },
    ]);
    expect(r.active).toBe('account-1');
  });

  it('limita a 5 contas', () => {
    const list = Array.from({ length: 8 }, (_, i) => ({ id: `account-${i + 1}`, name: `C${i}` }));
    expect(normalizeAccounts({ list }, base).list).toHaveLength(5);
  });
});

describe('utilitários', () => {
  it('nextAccountId preenche lacunas', () => {
    expect(nextAccountId([DEFAULT_ACCOUNT, { id: 'account-3', name: 'x', color: 0 }])).toBe(
      'account-2',
    );
  });

  it('iniciais e limpeza de nome', () => {
    expect(accountInitials('Trabalho Remoto')).toBe('TR');
    expect(accountInitials('pessoal')).toBe('PE');
    expect(cleanAccountName('a\u0007b\n c')).toBe('ab c');
    expect(cleanAccountName('   ')).toBeNull();
  });
});
