#!/usr/bin/env node
// Exporta um snapshot do esquema `api` do emmoni para data/snapshot/ e as imagens para public/assets/.
// O site é estático (GitHub Pages): tudo o que ele mostra vem deste snapshot, gerado na máquina
// que tem acesso ao Postgres do emmoni. Ver SPECIFICATION.md §3.
//
// Uso:
//   npm run snapshot                       # só o seed (questões fictícias, contest_slug seed-*)
//   npm run snapshot -- --scope all        # todas as questões publicadas (exige decisão do dono)
//
// Variáveis:
//   EMMONI_DATABASE_URL  conexão com o papel emmoni_web (padrão: a do contrato, docker local)
//   EMMONI_ASSETS_DIR    pasta com as imagens geradas pelo `make seed` / ingestão do emmoni
//                        (padrão: ../emmoni/data/assets)

import { copyFile, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import pg from 'pg';

const CONTRACT_VERSION = '1.2';
const ROOT = resolve(import.meta.dirname, '..');
const OUT = join(ROOT, 'data', 'snapshot');
const ASSETS_OUT = join(ROOT, 'public', 'assets');

const DATABASE_URL =
  process.env.EMMONI_DATABASE_URL ??
  'postgres://emmoni_web:emmoni_web@localhost:55432/emmoni?sslmode=disable';
const ASSETS_DIR = resolve(process.env.EMMONI_ASSETS_DIR ?? join(ROOT, '..', 'emmoni', 'data', 'assets'));

const scopeArg = process.argv.indexOf('--scope');
const scope = scopeArg >= 0 ? process.argv[scopeArg + 1] : 'seed';
if (!['seed', 'all'].includes(scope)) {
  console.error(`--scope deve ser "seed" ou "all", recebi "${scope}"`);
  process.exit(2);
}
// O seed tem concursos com slug seed-*; "all" exclui o seed para não misturar dado fictício com real.
const where = scope === 'seed' ? `contest_slug like 'seed-%'` : `contest_slug not like 'seed-%'`;

const client = new pg.Client({ connectionString: DATABASE_URL });
await client.connect();

async function rows(sql) {
  const { rows } = await client.query(sql);
  return rows.map((r) => r.j);
}

const questions = await rows(`
  select to_jsonb(q) as j from api.question q
  where ${where}
  order by year desc, contest_slug, exam_slug, number`);

const examKeys = new Set(questions.map((q) => `${q.contest_slug}/${q.exam_slug}`));
const exams = (
  await rows(`select to_jsonb(e) as j from api.exam e order by year desc, contest_slug, exam_slug`)
).filter((e) => examKeys.has(`${e.contest_slug}/${e.exam_slug}`));

// O catálogo é real e pequeno; vai inteiro. `question_count` do banco conta o banco todo,
// então o site deve contar pelo snapshot (src/lib/snapshot.ts), não por esse campo.
const catalog = {
  exam_board: await rows(`select to_jsonb(x) as j from api.exam_board x order by slug`),
  agency: await rows(`select to_jsonb(x) as j from api.agency x order by slug`),
  position: await rows(`select to_jsonb(x) as j from api.position x order by agency_slug, slug`),
  subject: await rows(`select to_jsonb(x) as j from api.subject x order by slug`),
  topic: await rows(`select to_jsonb(x) as j from api.topic x order by path`),
  exam: exams,
};

await client.end();

// Imagens: public/assets/<sha256>.<ext>, como o contrato (`/assets/...`), servidas sob o `base`.
await rm(ASSETS_OUT, { recursive: true, force: true });
await mkdir(ASSETS_OUT, { recursive: true });
const wanted = new Map();
for (const q of questions) for (const a of q.assets ?? []) wanted.set(a.sha256, a.url);
const available = existsSync(ASSETS_DIR) ? await readdir(ASSETS_DIR) : [];
const missing = [];
for (const [sha] of wanted) {
  const file = available.find((f) => f.startsWith(`${sha}.`));
  if (file) await copyFile(join(ASSETS_DIR, file), join(ASSETS_OUT, file));
  else missing.push(sha);
}

await mkdir(OUT, { recursive: true });
const write = (name, data) => writeFile(join(OUT, name), JSON.stringify(data, null, 1) + '\n');
await write('questions.json', questions);
await write('catalog.json', catalog);
await write('meta.json', {
  contract_version: CONTRACT_VERSION,
  scope,
  exported_at: new Date().toISOString(),
  question_count: questions.length,
  exam_count: exams.length,
  asset_count: wanted.size - missing.length,
});

console.log(
  `snapshot (${scope}): ${questions.length} questões, ${exams.length} provas, ` +
    `${wanted.size - missing.length} imagens`,
);
if (missing.length) {
  console.error(`faltam ${missing.length} imagens em ${ASSETS_DIR}: ${missing.join(', ')}`);
  process.exit(1);
}
