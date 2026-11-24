/**
 * Compatibilidade das configurações entre versões do app.
 *
 * Problema: cada versão normaliza o settings.json e grava só os campos que
 * conhece. Uma versão mais antiga que abra o mesmo perfil apaga o que veio
 * depois dela (salas, temas, fixados…).
 *
 * Defesa em duas partes:
 * 1. `preserveUnknown`: ao gravar, campos que esta versão não conhece (de uma
 *    versão mais nova) são mantidos, em qualquer nível, inclusive dentro de
 *    listas com `id` (salas, contas, grupos). Protege o downgrade daqui em diante.
 * 2. `restoreMissing`: versões já publicadas (0.0.1–0.0.5) continuam apagando.
 *    Por isso o app grava também uma cópia completa com uma marca (`_writer`).
 *    Se o settings.json aparecer sem a marca, foi regravado por uma versão antiga:
 *    os campos que sumiram voltam da cópia; o que a versão antiga mudou fica.
 *
 * Regra do projeto que torna isso seguro: nas configurações nenhum campo é
 * opcional ("vazio" é `null`, `[]` ou `{}`). Então "ausente" sempre significa
 * "a versão que gravou não conhece este campo", nunca "o usuário apagou".
 */

export const WRITER_KEY = '_writer';
export const APP_ID = 'gchat-desktop-plus';

export interface WriterMark {
  app: typeof APP_ID;
  /** Versão do app que gravou. */
  version: string;
  savedAt: number;
}

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Lista de objetos com `id` texto (salas, contas, grupos, sons…). */
const isIdList = (v: unknown): v is Obj[] =>
  Array.isArray(v) && v.every((x) => isObj(x) && typeof x['id'] === 'string');

const byId = (list: Obj[], id: unknown): Obj | undefined => list.find((x) => x['id'] === id);

/**
 * O que gravar: os valores normalizados (`known`) por cima do que veio do arquivo
 * (`raw`), mantendo o que esta versão não conhece. Valores conhecidos sempre vêm
 * de `known` (inclusive remoções: um item que saiu da lista não volta).
 */
export function preserveUnknown(raw: unknown, known: unknown): unknown {
  if (isObj(raw) && isObj(known)) {
    const out: Obj = {};
    for (const key of Object.keys(known)) out[key] = preserveUnknown(raw[key], known[key]);
    for (const key of Object.keys(raw)) {
      if (!(key in out) && key !== WRITER_KEY) out[key] = raw[key];
    }
    return out;
  }
  if (isIdList(raw) && isIdList(known)) {
    return known.map((item) => preserveUnknown(byId(raw, item['id']), item));
  }
  return known;
}

/**
 * Devolve a `current` os campos que existem em `backup` e sumiram dela (apagados
 * por uma versão antiga). Nada que exista em `current` é trocado, e itens de
 * lista que não existem mais em `current` não voltam.
 */
export function restoreMissing(current: unknown, backup: unknown): unknown {
  if (isObj(current) && isObj(backup)) {
    const out: Obj = { ...current };
    for (const [key, value] of Object.entries(backup)) {
      if (key === WRITER_KEY) continue;
      out[key] = key in current ? restoreMissing(current[key], value) : value;
    }
    return out;
  }
  if (isIdList(current) && isIdList(backup)) {
    return current.map((item) => restoreMissing(item, byId(backup, item['id'])));
  }
  return current;
}

/** Gravado por esta família de versões (que preservam campos)? */
export function writerOf(raw: unknown): WriterMark | null {
  if (!isObj(raw)) return null;
  const w = raw[WRITER_KEY];
  if (!isObj(w) || w['app'] !== APP_ID || typeof w['version'] !== 'string') return null;
  return {
    app: APP_ID,
    version: w['version'],
    savedAt: typeof w['savedAt'] === 'number' ? w['savedAt'] : 0,
  };
}
