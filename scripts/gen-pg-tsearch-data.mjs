#!/usr/bin/env node
// Gera src/lib/search/pg-data.ts com os dados de busca textual do PostgreSQL 17 que a busca do
// navegador precisa para reproduzir `ext.pt_unaccent` do emmoni (decisão 0006):
//   - as stopwords do dicionário `portuguese_stem` (tsearch_data/portuguese.stop);
//   - as regras do `unaccent` (tsearch_data/unaccent.rules) para caracteres que podem fazer parte
//     de uma palavra (letras e marcas); o `unaccent` só recebe tokens de palavra.
//
// Uso (com o container do emmoni de pé):
//   node scripts/gen-pg-tsearch-data.mjs
// ou com os arquivos já copiados:
//   node scripts/gen-pg-tsearch-data.mjs <portuguese.stop> <unaccent.rules>

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const CONTAINER = process.env.EMMONI_DB_CONTAINER ?? 'emmoni-db-1';
const DIR = '/usr/share/postgresql/17/tsearch_data';

const read = (arg, name) =>
  arg ? readFileSync(arg, 'utf8') : execFileSync('docker', ['exec', CONTAINER, 'cat', `${DIR}/${name}`], { encoding: 'utf8' });

const stop = read(process.argv[2], 'portuguese.stop')
  .split('\n')
  .map((w) => w.trim())
  .filter(Boolean);

// Mesmo critério do analisador (src/lib/search/parser.ts): letra (Alphabetic) ou marca de largura zero.
const wordChar = /^[\p{Alphabetic}\p{Mn}\p{Me}\p{Cf}]$/u;
const unaccent = {};
for (const line of read(process.argv[3], 'unaccent.rules').split('\n')) {
  if (!line) continue;
  const [src, raw] = line.split('\t');
  if ([...src].length !== 1 || !wordChar.test(src)) continue;
  let dst = raw ?? '';
  if (dst.length >= 2 && dst.startsWith('"') && dst.endsWith('"')) dst = dst.slice(1, -1);
  unaccent[src] = dst;
}

const out = `// Gerado por scripts/gen-pg-tsearch-data.mjs a partir do PostgreSQL 17 (tsearch_data).
// Não edite à mão. Licença dos dados: PostgreSQL License.

/** Stopwords do dicionário \`portuguese_stem\` (portuguese.stop). */
export const PORTUGUESE_STOPWORDS: ReadonlySet<string> = new Set(${JSON.stringify(stop.join(' '))}.split(' '));

/** Regras do \`unaccent\` para caracteres de palavra (unaccent.rules); destino vazio = apagar. */
export const UNACCENT: Readonly<Record<string, string>> = ${JSON.stringify(unaccent)};
`;
writeFileSync(join(ROOT, 'src/lib/search/pg-data.ts'), out);
console.log(`pg-data.ts: ${stop.length} stopwords, ${Object.keys(unaccent).length} regras de unaccent`);
