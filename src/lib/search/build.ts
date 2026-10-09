// Gera, no build, o índice da busca a partir do snapshot (decisão 0006):
//   indice/base.json             filtros, facetas e ordem (dicionários + colunas por questão)
//   indice/termos/<n>.json       índice invertido do texto, fatiado por hash do lexema
//   indice/blocos/<n>.json       cartões dos resultados (id, número, trecho), em blocos de BLOCK_SIZE
// O navegador baixa o base uma vez e só as fatias de que precisa.

import { splitCommand } from '../markdown';
import type { Catalog, Question } from '../snapshot';
import type { BaseIndex } from './engine';
import { shardOf, type Card, type TermShard } from './text';
import { questionVector } from './tsvector';

export type { Card, TermShard };

export const BLOCK_SIZE = 50;
/** Alvo de tamanho de uma fatia de termos (bytes do JSON, antes do gzip). */
const SHARD_TARGET_BYTES = 32 * 1024;

export interface SearchBuild {
  base: BaseIndex;
  shards: TermShard[];
  blocks: Card[][];
}

/** Ordem aproximada da collation en_US do glibc para valores ASCII (career, type). */
function collate(a: string, b: string): number {
  const ka = a.replace(/[^a-z0-9]/gi, '').toLowerCase();
  const kb = b.replace(/[^a-z0-9]/gi, '').toLowerCase();
  return ka < kb ? -1 : ka > kb ? 1 : a < b ? -1 : a > b ? 1 : 0;
}

/** Trecho do enunciado para a lista de resultados: o texto, sem marcação, cortado numa palavra. */
export function excerpt(q: Pick<Question, 'type' | 'statement_md'>, max = 180): string {
  const md = q.type === 'true_false' ? splitCommand(q.statement_md).item : q.statement_md;
  const text = md
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, (_, alt: string) => `[Imagem: ${alt}]`)
    .replace(/<\/?u>/g, '')
    .replace(/\$\$/g, '')
    .replace(/^\s*(?:[-*]|\d+\.)\s+/gm, '')
    .replace(/^\|?[\s:|-]+\|?$/gm, ' ')
    .replace(/[*_`]+/g, '')
    .replace(/[|\\]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max + 1);
  const space = cut.lastIndexOf(' ');
  return (space > max * 0.6 ? cut.slice(0, space) : cut.slice(0, max)).replace(/[\s,;:.]+$/, '') + '…';
}

/** Dicionário na ordem de `entries`, sem repetir e só com as chaves usadas (`used`). */
function dictionary<T>(entries: T[], key: (e: T) => string, used: Set<string>): { list: T[]; index: Map<string, number> } {
  const list: T[] = [];
  const index = new Map<string, number>();
  for (const e of entries) {
    const k = key(e);
    if (used.has(k) && !index.has(k)) {
      index.set(k, list.length);
      list.push(e);
    }
  }
  return { list, index };
}

/** `questions` na ordem do snapshot, que é a ordem de `api.search_questions`. */
export function buildSearch(questions: Question[], catalog: Catalog): SearchBuild {
  // Dicionários: catálogo (ordem do banco) + o que só aparecer nas questões, no fim.
  const boards = dictionary(
    [...catalog.exam_board.map((b) => [b.slug, b.name, b.short_name] as [string, string, string]),
     ...questions.map((q) => [q.exam_board_slug, q.exam_board_name, q.exam_board_short_name] as [string, string, string])],
    (e) => e[0],
    new Set(questions.map((q) => q.exam_board_slug)),
  );
  const agencies = dictionary(
    [...catalog.agency.map((a) => [a.slug, a.name, a.short_name] as [string, string, string]),
     ...questions.map((q) => [q.agency_slug, q.agency_name, q.agency_short_name] as [string, string, string])],
    (e) => e[0],
    new Set(questions.map((q) => q.agency_slug)),
  );
  const positions = dictionary(
    [...catalog.position.map((p) => [p.slug, p.name] as [string, string]),
     ...questions.flatMap((q) => q.positions.map((p) => [p.slug, p.name] as [string, string]))],
    (e) => `${e[0]}\u0000${e[1]}`,
    new Set(questions.flatMap((q) => q.positions.map((p) => `${p.slug}\u0000${p.name}`))),
  );
  const subjects = dictionary(
    [...catalog.subject.map((s) => [s.slug, s.name] as [string, string]),
     ...questions.map((q) => [q.subject_slug, q.subject_name] as [string, string])],
    (e) => e[0],
    new Set(questions.map((q) => q.subject_slug)),
  );
  // Assuntos das questões e os ancestrais deles (a faceta conta o assunto com os subassuntos).
  const usedTopics = new Set(
    questions.flatMap((q) =>
      q.topics.flatMap((t) => t.path.split('.').map((_, i, labels) => labels.slice(0, i + 1).join('.'))),
    ),
  );
  const topics = dictionary(
    [...catalog.topic.map((t) => [t.path, t.name] as [string, string]),
     ...questions.flatMap((q) => q.topics.map((t) => [t.path, t.name] as [string, string]))],
    (e) => e[0],
    usedTopics,
  );
  const careers = [...new Set(questions.map((q) => q.career))].sort(collate);
  const types = [...new Set(questions.map((q) => q.type))].sort(collate);

  const exams: BaseIndex['exams'] = [];
  for (const q of questions) {
    const last = exams[exams.length - 1];
    if (last && last.contest_slug === q.contest_slug && last.exam_slug === q.exam_slug) {
      last.count++;
      continue;
    }
    exams.push({
      contest_slug: q.contest_slug,
      exam_slug: q.exam_slug,
      contest_name: q.contest_name,
      exam_name: q.exam_name,
      year: q.year,
      exam_board: boards.index.get(q.exam_board_slug)!,
      agency: agencies.index.get(q.agency_slug)!,
      career: careers.indexOf(q.career),
      positions: q.positions.map((p) => positions.index.get(`${p.slug}\u0000${p.name}`)!),
      count: 1,
    });
  }

  // Índice invertido: lexema → (ordinal, posições).
  const postings = new Map<string, number[]>();
  const lastOrd = new Map<string, number>();
  questions.forEach((q, ord) => {
    for (const [lexeme, pos] of questionVector(q)) {
      let list = postings.get(lexeme);
      if (!list) postings.set(lexeme, (list = []));
      list.push(ord - (lastOrd.get(lexeme) ?? 0), pos.length, ...pos.map((p, i) => (i === 0 ? p : p - pos[i - 1])));
      lastOrd.set(lexeme, ord);
    }
  });
  let bytes = 0;
  for (const [lexeme, list] of postings) bytes += lexeme.length + 6 + JSON.stringify(list).length;
  let termShards = 1;
  while (bytes / termShards > SHARD_TARGET_BYTES && termShards < 4096) termShards *= 2;
  const shards: TermShard[] = Array.from({ length: termShards }, () => ({}));
  for (const lexeme of [...postings.keys()].sort()) shards[shardOf(lexeme, termShards)][lexeme] = postings.get(lexeme)!;

  const blocks: Card[][] = [];
  questions.forEach((q, ord) => {
    const b = Math.floor(ord / BLOCK_SIZE);
    (blocks[b] ??= []).push([q.id, q.number, excerpt(q)]);
  });

  const base: Omit<BaseIndex, 'version'> = {
    format: 1,
    count: questions.length,
    block_size: BLOCK_SIZE,
    term_shards: termShards,
    exam_board: boards.list,
    agency: agencies.list,
    career: careers,
    position: positions.list,
    subject: subjects.list,
    topic: topics.list,
    type: types,
    exams,
    subject_of: questions.map((q) => subjects.index.get(q.subject_slug)!),
    type_of: questions.map((q) => types.indexOf(q.type)),
    topics_of: questions.map((q) => q.topics.map((t) => topics.index.get(t.path)!)),
    annulled: questions.flatMap((q, ord) => (q.answer_status === 'annulled' ? [ord] : [])),
  };
  const version = hash(JSON.stringify([base, shards, blocks]));
  return { base: { ...base, version }, shards, blocks };
}

/** Hash curto (FNV-1a) para versionar as URLs do índice. */
function hash(s: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193);
    h2 = Math.imul(h2 ^ c, 0x5bd1e995);
  }
  return (h1 >>> 0).toString(36) + (h2 >>> 0).toString(36);
}

