#!/usr/bin/env node
// Grava em tests/fixtures/search/ os casos que conferem a busca do navegador com o emmoni
// (marco F2, SPECIFICATION.md §6): o que `api.search_questions` e `api.facet_counts` devolvem,
// o `websearch_to_tsquery` de várias consultas e o vetor de busca de cada questão.
//
// Só lê o banco (papel emmoni_web) e só aceita um banco com as questões do seed: o padrão é o
// `emmoni_test` do emmoni (`make test-db` + seed). As fixtures valem para o snapshot commitado em
// data/snapshot/: o script confere que as questões são as mesmas.
//
// Uso:
//   npm run fixtures:search
// Variável:
//   EMMONI_FIXTURES_DATABASE_URL  (padrão: emmoni_web no emmoni_test, docker local)

import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import pg from 'pg';

const ROOT = resolve(import.meta.dirname, '..');
const OUT = join(ROOT, 'tests', 'fixtures', 'search');
const DATABASE_URL =
  process.env.EMMONI_FIXTURES_DATABASE_URL ??
  'postgres://emmoni_web:emmoni_web@localhost:55432/emmoni_test?sslmode=disable';

// Casos de filtros + texto. Cobrem: listas = OU, chaves = E, facetas disjuntivas, assunto com
// subassuntos, anuladas fora por padrão, ano aberto, lista vazia, busca textual.
const CASES = [
  ['sem filtros', {}],
  ['com anuladas', { include_annulled: true }],
  ['sem anuladas explícito', { include_annulled: false }],
  ['uma banca', { exam_board: ['cebraspe'] }],
  ['duas bancas (OU)', { exam_board: ['cebraspe', 'fgv'] }],
  ['banca E ano', { exam_board: ['cebraspe'], year: { from: 2025 } }],
  ['órgãos', { agency: ['pf', 'prf'] }],
  ['carreira', { career: ['policia_civil'] }],
  ['carreira e anuladas', { career: ['pf'], include_annulled: true }],
  ['cargo', { position: ['agente'] }],
  ['cargos E órgão', { position: ['inspetor', 'soldado'], agency: ['pc-rj'] }],
  ['ano exato', { year: { from: 2024, to: 2024 } }],
  ['ano até', { year: { to: 2024 } }],
  ['ano desde, sem resultado', { year: { from: 2026 } }],
  ['disciplina', { subject: ['direito-penal'] }],
  ['disciplinas E tipo', { subject: ['direito-penal', 'lingua-portuguesa'], type: ['true_false'] }],
  ['assunto com subassuntos', { topic: ['direito_penal.crimes_contra_o_patrimonio'] }],
  ['subassunto', { topic: ['direito_penal.crimes_contra_o_patrimonio.roubo'] }],
  ['raiz de disciplina como assunto', { topic: ['direito_constitucional'] }],
  ['assuntos (OU) e anuladas', { topic: ['lingua_portuguesa.concordancia', 'informatica'], include_annulled: true }],
  ['tipo', { type: ['multiple_choice'] }],
  ['tipo certo/errado com anuladas', { type: ['true_false'], include_annulled: true }],
  ['tipo discursiva (nenhuma no seed)', { type: ['essay'] }],
  ['combinação', { exam_board: ['vunesp'], subject: ['lingua-portuguesa'], year: { from: 2024, to: 2025 } }],
  ['listas vazias', { exam_board: [], topic: [], type: [] }],
  ['sem resultado, facetas disjuntivas', { exam_board: ['fgv'], agency: ['pf'] }],
  ['valor desconhecido', { exam_board: ['nao-existe'] }],
  ['texto: palavra com acento', {}, 'inquérito'],
  ['texto: plural sem acento', {}, 'inqueritos'],
  ['texto: maiúsculas', {}, 'CONSTITUIÇÃO'],
  ['texto: frase', {}, '"prisão em flagrante"'],
  ['texto: E', {}, 'crime patrimônio'],
  ['texto: NÃO', {}, 'crime -roubo'],
  ['texto: só NÃO', {}, '-federal'],
  ['texto: OU', {}, 'roubo or furto'],
  ['texto: só stopword', {}, 'de'],
  ['texto: só espaços', {}, '   '],
  ['texto: hífen', {}, 'dois-pontos'],
  ['texto: hífen com acento', {}, 'norma-padrão'],
  ['texto: número', {}, '240'],
  ['texto: texto-base', {}, 'trabalho de campo'],
  ['texto: alternativa', {}, 'nenhuma das anteriores'],
  ['texto e filtros', { subject: ['direito-constitucional'], include_annulled: true }, 'federal'],
  ['texto com anuladas', { include_annulled: true }, 'policial'],
];

// Consultas para conferir o websearch_to_tsquery (sintaxe, stopwords, acentos, hífen, números).
const QUERIES = [
  'inquérito',
  'Inquéritos policiais',
  '"prisão em flagrante"',
  '"julgue os itens a seguir"',
  'roubo -furto',
  'roubo or furto',
  'roubo OR furto -arma',
  'or furto',
  'furto or',
  'furto or or roubo',
  'furto orçamento',
  'furto or-roubo',
  'de',
  'a de o',
  '',
  '   ',
  '-',
  '--roubo',
  '""',
  '"roubo',
  'roubo"furto"',
  '-"prisão em flagrante"',
  'a & b | !c',
  '(roubo) <-> furto',
  'lei:8112',
  'guarda-municipal',
  'dois-pontos',
  'norma-padrão',
  'pré-requisito pós-graduação',
  'auto-de-infração',
  '8.112/1990',
  'art. 5º',
  'Nº 123, 2ª e 1º',
  'R$ 240,00',
  '50% 3,14 1.2.3',
  'www.gov.br',
  'https://www.gov.br/pf',
  'fulano@pf.gov.br',
  'c++',
  'ÁÉÍÓÚ àèìòù ç',
  'não é',
  'MUNICÍPIOS',
  '<u>sublinhado</u>',
  'constituição federal -emenda',
  '"constituição federal" or "código penal"',
  'tráfico de drogas or "associação criminosa" -"menor de idade"',
  "d'água",
  'segurança\tpública',
];

const client = new pg.Client({ connectionString: DATABASE_URL });
await client.connect();
const one = async (sql, params = []) => (await client.query(sql, params)).rows[0];

// Só o seed, e o mesmo seed do snapshot commitado.
const { total, seed } = await one(
  `select count(*)::int as total, count(*) filter (where contest_slug like 'seed-%')::int as seed from api.question`,
);
if (total !== seed) {
  console.error(`o banco tem ${total - seed} questões fora do seed; use um banco só com o seed (emmoni_test)`);
  process.exit(1);
}
const snapshot = JSON.parse(await readFile(join(ROOT, 'data', 'snapshot', 'questions.json'), 'utf8'));
const dbIds = (await client.query(`select id from api.question order by id`)).rows.map((r) => r.id);
const snapIds = snapshot.map((q) => q.id).sort();
if (JSON.stringify(dbIds) !== JSON.stringify(snapIds)) {
  console.error('as questões do banco não são as do snapshot commitado; rode `npm run snapshot` antes');
  process.exit(1);
}

const PAGE_SIZE = 20;
const cases = [];
for (const [name, filters, query = null] of CASES) {
  const ids = [];
  let cursor = null;
  let searchTotal = null;
  let pages = 0;
  do {
    const { r } = await one(`select api.search_questions($1::jsonb, $2, $3, $4) as r`, [
      JSON.stringify(filters),
      query,
      PAGE_SIZE,
      cursor,
    ]);
    searchTotal = r.total;
    ids.push(...r.items.map((q) => q.id));
    cursor = r.next_cursor;
    pages++;
  } while (cursor);
  const { r: facets } = await one(`select api.facet_counts($1::jsonb, $2) as r`, [JSON.stringify(filters), query]);
  cases.push({ name, filters, query, search: { total: searchTotal, page_size: PAGE_SIZE, pages, ids }, facets });
}

const queries = [];
for (const q of QUERIES) {
  const { t } = await one(`select websearch_to_tsquery('ext.pt_unaccent', $1)::text as t`, [q]);
  queries.push({ query: q, tsquery: t });
}

// Vetor de busca como o emmoni monta (md_plain + setweight A/B + concatenação), a partir das
// colunas do esquema api. A comparação ignora os pesos (não afetam `@@`).
const md = (x) =>
  `regexp_replace(regexp_replace(regexp_replace(regexp_replace(${x}, '!\\[([^\\]]*)\\]\\([^)]*\\)', '\\1', 'g'), '</?u>', ' ', 'g'), '-{3,}', ' ', 'g'), '[*_|$\`~\\\\]+', ' ', 'g')`;
const vectors = {};
for (const r of (
  await client.query(`
    select id, (
      setweight(to_tsvector('ext.pt_unaccent', ${md('statement_md')}), 'A')
      || setweight(to_tsvector('ext.pt_unaccent', coalesce((select string_agg(${md("o->>'body_md'")}, ' ' order by o->>'letter')
                                                             from jsonb_array_elements(options) o), '')), 'B')
      || setweight(to_tsvector('ext.pt_unaccent', coalesce(${md('passage_md')}, '')), 'B'))::text as v
    from api.question order by id`)
).rows)
  vectors[r.id] = r.v;

const { version } = await one(`select current_setting('server_version') as version`);
await client.end();

const meta = { recorded_at: new Date().toISOString(), postgres: version, database: new URL(DATABASE_URL).pathname.slice(1) };
await mkdir(OUT, { recursive: true });
const write = (name, data) => writeFile(join(OUT, name), JSON.stringify(data, null, 1) + '\n');
// Um caso por linha: o arquivo fica menor e o diff mostra qual caso mudou.
await writeFile(
  join(OUT, 'cases.json'),
  `{"meta":${JSON.stringify(meta)},"cases":[\n${cases.map((c) => JSON.stringify(c)).join(',\n')}\n]}\n`,
);
await write('queries.json', { meta, queries });
await write('vectors.json', { meta, vectors });
console.log(`fixtures: ${cases.length} casos, ${queries.length} consultas, ${Object.keys(vectors).length} vetores`);
