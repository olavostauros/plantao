// Critério de pronto do F2 (SPECIFICATION.md §6): a busca do navegador dá os mesmos resultados e
// contagens que `api.search_questions` e `api.facet_counts` do emmoni, nos casos gravados em
// tests/fixtures/search/ por `npm run fixtures:search` (banco só com o seed).

import { describe, expect, it } from 'vitest';
import cases from './fixtures/search/cases.json';
import queries from './fixtures/search/queries.json';
import vectors from './fixtures/search/vectors.json';
import { catalog, questions } from '../src/lib/snapshot';
import { buildSearch } from '../src/lib/search/build';
import { SearchEngine, type FacetCounts, type Filters } from '../src/lib/search/engine';
import { textMask } from '../src/lib/search/text';
import { queryToString, websearchToTsQuery } from '../src/lib/search/tsquery';
import { questionVector } from '../src/lib/search/tsvector';

/** Texto de um tsvector do PostgreSQL → lexema → posições (sem os pesos). */
function parsePgVector(text: string): Map<string, number[]> {
  const out = new Map<string, number[]>();
  for (const m of text.matchAll(/'((?:[^']|'')*)'(?::([\d,ABCD]+))?/g))
    out.set(
      m[1].replace(/''/g, "'").replace(/\\\\/g, '\\'),
      m[2] ? m[2].split(',').map((p) => parseInt(p, 10)) : [],
    );
  return out;
}

const sorted = (v: Map<string, number[]>) => [...v].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

describe('vetor de busca igual ao do PostgreSQL', () => {
  it.each(questions.map((q) => [q.id, q] as const))('%s', (id, q) => {
    const expected = (vectors.vectors as Record<string, string>)[id];
    expect(expected).toBeDefined();
    expect(sorted(questionVector(q))).toEqual(sorted(parsePgVector(expected)));
  });
});

describe('websearch_to_tsquery igual ao do PostgreSQL', () => {
  it.each(queries.queries.map((q) => [q.query, q.tsquery] as const))('%j', (query, tsquery) => {
    expect(queryToString(websearchToTsQuery(query))).toBe(tsquery);
  });
});

describe('busca e facetas iguais às do emmoni', () => {
  const built = buildSearch(questions, catalog);
  const engine = new SearchEngine(built.base);
  const load = async (n: number) => built.shards[n];

  it.each(cases.cases.map((c) => [c.name, c] as const))('%s', async (_name, c) => {
    const filters = c.filters as Filters;
    const mask = await textMask(c.query, built.base.count, built.base.term_shards, load);
    const ids = engine.search(filters, mask).map((o) => questions[o].id);
    expect(ids.length).toBe(c.search.total);
    expect(ids).toEqual(c.search.ids);
    expect(engine.facets(filters, mask)).toEqual(c.facets as FacetCounts);
  });

  it('os casos exercitam a semântica', () => {
    // Guarda contra fixtures que deixem de cobrir o que importa.
    const all = cases.cases;
    expect(all.some((c) => c.search.total === 0)).toBe(true);
    expect(all.some((c) => c.search.pages > 1)).toBe(true);
    expect(all.some((c) => c.query && c.search.total > 0)).toBe(true);
    expect(all.some((c) => (c.filters as Filters).include_annulled)).toBe(true);
  });
});
