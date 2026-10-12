#!/usr/bin/env node
// Falha se uma palavra privada (o nome do projeto do banco de questões, um host...) aparecer no
// que é publicado: arquivos versionados (conteúdo e caminho) e o build em dist/.
//
// As palavras vêm, nesta ordem, de:
//   - `.private-words` na raiz, uma por linha (`#` começa um comentário). Está no .gitignore:
//     escrever as palavras aqui as publicaria.
//   - a variável PRIVATE_WORDS, uma por linha. No CI ela vem do secret de mesmo nome.
// Sem nenhuma das duas, avisa e passa.
//
// Uso: npm run check:private
//
// O relatório cita a linha da lista, nunca a palavra, para poder aparecer num log público.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const WORDS_FILE = join(ROOT, '.private-words');

const [source, raw] = existsSync(WORDS_FILE)
  ? ['.private-words', readFileSync(WORDS_FILE, 'utf8')]
  : ['PRIVATE_WORDS', process.env.PRIVATE_WORDS ?? ''];
const words = raw
  .split('\n')
  .map((l, i) => ({ line: i + 1, word: l.replace(/#.*/, '').trim().toLowerCase() }))
  .filter((w) => w.word);

if (words.length === 0) {
  console.warn('check-private-words: sem .private-words nem PRIVATE_WORDS; pulado.');
  process.exit(0);
}

// Versionados e novos ainda não ignorados; mais o dist/ (ignorado, mas é o que vai para o Pages).
const files = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], {
  cwd: ROOT,
  encoding: 'utf8',
})
  .split('\0')
  .filter((f) => f && f !== '.private-words' && existsSync(join(ROOT, f)));
const dist = join(ROOT, 'dist');
if (existsSync(dist))
  for (const e of readdirSync(dist, { recursive: true, withFileTypes: true }))
    if (e.isFile()) files.push(relative(ROOT, join(e.parentPath, e.name)));

let hits = 0;
for (const file of files) {
  const buf = readFileSync(join(ROOT, file));
  // latin1 guarda todos os bytes (binários também); utf8 pega texto com acento perto da palavra.
  const texts = [file, buf.toString('latin1'), buf.toString('utf8')].map((t) => t.toLowerCase());
  for (const { line, word } of words) {
    if (texts.some((t) => t.includes(word))) {
      console.error(`  ${file}: palavra da linha ${line} de ${source}`);
      hits++;
    }
  }
}

if (hits > 0) {
  console.error(`check-private-words: ${hits} ocorrência(s) em ${files.length} arquivos. Tire antes de publicar.`);
  process.exit(1);
}
console.log(`check-private-words: ${words.length} palavra(s) de ${source}, ${files.length} arquivos, limpo.`);
