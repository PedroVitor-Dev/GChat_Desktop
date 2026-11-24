import { describe, expect, it } from 'vitest';
import pkg from '../../package.json';
import { CHANGELOG, highlightsFromReleaseNotes, notesFor } from './changelog';

describe('changelog', () => {
  it('a versão do app tem novidades escritas (não esquecer ao publicar)', () => {
    expect(notesFor(pkg.version)?.highlights.length).toBeGreaterThan(0);
  });

  it('versões em ordem, da mais nova para a mais antiga, sem repetir', () => {
    const versions = CHANGELOG.map((r) => r.version);
    expect(new Set(versions).size).toBe(versions.length);
    const num = (v: string) => v.split('.').reduce((n, p) => n * 1000 + Number(p), 0);
    for (let i = 1; i < versions.length; i++) {
      expect(num(versions[i - 1]!)).toBeGreaterThan(num(versions[i]!));
    }
  });
});

describe('highlightsFromReleaseNotes', () => {
  it('lê só a lista de novidades do HTML do Release', () => {
    const html =
      '<h2>Novidades</h2><ul><li>Supressor de <strong>ruído</strong></li><li>Miniplayer &amp; foco</li></ul>' +
      '<h2>Instalação</h2><ol><li>Baixe o instalador</li></ol>';
    expect(highlightsFromReleaseNotes(html)).toEqual(['Supressor de ruído', 'Miniplayer & foco']);
  });

  it('sem lista ou formato estranho: nada', () => {
    expect(highlightsFromReleaseNotes('sem lista')).toEqual([]);
    expect(highlightsFromReleaseNotes(null)).toEqual([]);
    expect(highlightsFromReleaseNotes([{ note: '<ul><li>a</li></ul>' }])).toEqual(['a']);
  });
});
