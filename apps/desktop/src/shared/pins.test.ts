import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PINS,
  addPin,
  chatNameFromTitle,
  chatPathFromUrl,
  normalizePins,
  parseConversationList,
  pathFromGroupId,
  pinsOf,
  type PinsSettings,
} from './pins';

const A = 'account-1';
const pin = (id: string, path: string, over = {}) => ({
  id,
  name: 'Luana',
  chatName: 'Luana',
  path,
  emoji: null,
  ...over,
});

describe('endereço e nome da conversa', () => {
  it('extrai o caminho da conversa', () => {
    expect(chatPathFromUrl('https://chat.google.com/app/chat/vOCMsaAAAAE')).toBe(
      '/app/chat/vOCMsaAAAAE',
    );
    expect(chatPathFromUrl('https://chat.google.com/u/1/app/chat/AAAAxyz12/thread9')).toBe(
      '/app/chat/AAAAxyz12',
    );
    expect(chatPathFromUrl('https://chat.google.com/app/home')).toBeNull();
    expect(chatPathFromUrl('https://evil.example/app/chat/vOCMsaAAAAE')).toBeNull();
    expect(chatPathFromUrl('http://chat.google.com/app/chat/vOCMsaAAAAE')).toBeNull();
  });

  it('tira o sufixo " - Chat" do título', () => {
    expect(chatNameFromTitle('Luana kamila - Chat')).toBe('Luana kamila');
    expect(chatNameFromTitle('Equipe Cibus – Google Chat')).toBe('Equipe Cibus');
    expect(chatNameFromTitle('Chat')).toBeNull();
  });
});

describe('normalizePins', () => {
  it('mantém o que é válido e descarta o resto', () => {
    const raw = {
      panelOpen: false,
      groups: [
        {
          id: 'grp-aaaaaa11',
          accountId: A,
          name: '  Trabalho  ',
          collapsed: true,
          items: [
            pin('pin-aaaaaa11', '/app/chat/vOCMsaAAAAE', { emoji: '💼' }),
            pin('pin-aaaaaa12', '/app/chat/vOCMsaAAAAE'), // conversa repetida
            pin('pin-aaaaaa13', 'javascript:alert(1)'),
            pin('pin-aaaaaa14', '/app/chat/AAAAxyz12', { emoji: 'abc' }),
          ],
        },
        { id: 'grp-bbbbbb22', accountId: 'account-9', name: 'Outra', items: [] }, // conta removida
        { id: 'grp-aaaaaa11', accountId: A, name: 'Duplicado', items: [] },
      ],
    };
    const p = normalizePins(raw, DEFAULT_PINS, [A]);
    expect(p.panelOpen).toBe(false);
    expect(p.groups).toHaveLength(1);
    expect(p.groups[0]).toMatchObject({ name: 'Trabalho', collapsed: true });
    expect(p.groups[0]!.items.map((i) => i.id)).toEqual(['pin-aaaaaa11', 'pin-aaaaaa14']);
    expect(p.groups[0]!.items[0]!.emoji).toBe('💼');
    expect(p.groups[0]!.items[1]!.emoji).toBeNull();
  });

  it('aceita um emoji só, inclusive compostos', () => {
    const one = (emoji: string) =>
      normalizePins(
        {
          groups: [
            {
              id: 'grp-aaaaaa11',
              accountId: A,
              name: 'G',
              items: [pin('pin-aaaaaa11', '/app/chat/vOCMsaAAAAE', { emoji })],
            },
          ],
        },
        DEFAULT_PINS,
        [A],
      ).groups[0]!.items[0]!.emoji;
    expect(one('👨‍👩‍👧')).toBe('👨‍👩‍👧');
    expect(one('🛠️')).toBe('🛠️');
    expect(one('🔥🔥')).toBeNull();
    expect(one('a')).toBeNull();
  });

  it('entrada inválida volta ao padrão', () => {
    expect(normalizePins('x', DEFAULT_PINS, [A])).toEqual(DEFAULT_PINS);
  });
});

describe('addPin', () => {
  it('cria o grupo "Fixados" na primeira vez e não repete conversa', () => {
    const r = addPin(
      DEFAULT_PINS,
      A,
      { name: 'Luana', chatName: 'Luana', path: '/app/chat/vOCMsaAAAAE' },
      null,
    );
    if ('error' in r) throw new Error(r.error);
    expect(r.pins.groups[0]!.name).toBe('Fixados');
    expect(pinsOf(r.pins, A)).toHaveLength(1);
    const again = addPin(
      r.pins,
      A,
      { name: 'X', chatName: 'X', path: '/app/chat/vOCMsaAAAAE' },
      null,
    );
    expect(again).toEqual({ error: 'Esta conversa já está fixada.' });
  });

  it('respeita o grupo escolhido e reabre se estava recolhido', () => {
    const base: PinsSettings = {
      panelOpen: true,
      groups: [
        { id: 'grp-aaaaaa11', accountId: A, name: 'Família', collapsed: false, items: [] },
        { id: 'grp-bbbbbb22', accountId: A, name: 'Trabalho', collapsed: true, items: [] },
      ],
    };
    const r = addPin(
      base,
      A,
      { name: 'Time', chatName: 'Time', path: '/app/chat/AAAAxyz12' },
      'grp-bbbbbb22',
    );
    if ('error' in r) throw new Error(r.error);
    expect(r.pins.groups[1]!.items).toHaveLength(1);
    expect(r.pins.groups[1]!.collapsed).toBe(false);
    expect(base.groups[1]!.items).toHaveLength(0); // não altera o original
  });
});

describe('conversas da barra lateral', () => {
  it('converte o id do Chat no endereço da conversa', () => {
    expect(pathFromGroupId('dm/vOCMsaAAAAE')).toEqual({
      path: '/app/chat/vOCMsaAAAAE',
      kind: 'dm',
    });
    expect(pathFromGroupId('space/AAQA7HmCROA')).toEqual({
      path: '/app/chat/AAQA7HmCROA',
      kind: 'space',
    });
    expect(pathFromGroupId('pinned-item')).toBeNull();
    expect(pathFromGroupId('dm/../../x')).toBeNull();
  });

  it('valida a lista, tira repetidos e ordena por nome', () => {
    expect(
      parseConversationList([
        { id: 'space/AAQA7HmCROA', name: ' asd ' },
        { id: 'dm/vOCMsaAAAAE', name: 'Luana kamila' },
        { id: 'dm/vOCMsaAAAAE', name: 'Repetida' },
        { id: 'javascript:x', name: 'ruim' },
        { id: 'dm/abcdEFGH', name: '' },
      ]),
    ).toEqual([
      { path: '/app/chat/AAQA7HmCROA', name: 'asd', kind: 'space' },
      { path: '/app/chat/vOCMsaAAAAE', name: 'Luana kamila', kind: 'dm' },
    ]);
    expect(parseConversationList('x')).toEqual([]);
  });
});
