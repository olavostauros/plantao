// Busca textual sobre o índice invertido fatiado (decisão 0006). Roda no navegador e nos testes.

import { hasQuery, matches, queryLexemes, websearchToTsQuery, type QueryNode } from './tsquery';

/** Cartão de resultado: [id, número, trecho do enunciado]. */
export type Card = [id: string, number: number, excerpt: string];

/** Postings de uma fatia: lexema → [Δordinal, nPos, pos1, Δpos..., Δordinal, nPos, ...]. */
export type TermShard = Record<string, number[]>;

/** FNV-1a de 32 bits sobre as unidades UTF-16: decide a fatia de um lexema. */
export function shardOf(lexeme: string, shards: number): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < lexeme.length; i++) {
    h ^= lexeme.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) % shards;
}

/** Decodifica as postings de um lexema: ordinal → posições. */
export function decodePostings(list: readonly number[]): Map<number, number[]> {
  const out = new Map<number, number[]>();
  let ord = 0;
  for (let i = 0; i < list.length; ) {
    ord += list[i++];
    const n = list[i++];
    const pos: number[] = new Array(n);
    let p = 0;
    for (let k = 0; k < n; k++) pos[k] = p = k === 0 ? list[i++] : p + list[i++];
    out.set(ord, pos);
  }
  return out;
}

/** Fatias de que uma consulta precisa. */
export function shardsFor(query: QueryNode | null, shards: number): number[] {
  return [...new Set([...queryLexemes(query)].map((l) => shardOf(l, shards)))].sort((a, b) => a - b);
}

/**
 * Máscara das questões que atendem à consulta (`search_vector @@ websearch_to_tsquery(...)`).
 * `null` quando não há busca textual; consulta vazia (só stopwords) não acha nada.
 */
export async function textMask(
  query: string | null | undefined,
  count: number,
  shards: number,
  load: (shard: number) => Promise<TermShard>,
): Promise<Uint8Array | null> {
  if (!hasQuery(query)) return null;
  const tree = websearchToTsQuery(query);
  const mask = new Uint8Array(count);
  if (!tree) return mask;
  const loaded = await Promise.all(shardsFor(tree, shards).map(load));
  const postings = new Map<string, Map<number, number[]>>();
  for (const lexeme of queryLexemes(tree)) {
    const list = loaded.find((s) => Object.hasOwn(s, lexeme))?.[lexeme];
    postings.set(lexeme, list ? decodePostings(list) : new Map());
  }
  for (let ord = 0; ord < count; ord++) {
    if (matches(tree, (lexeme) => postings.get(lexeme)?.get(ord))) mask[ord] = 1;
  }
  return mask;
}
