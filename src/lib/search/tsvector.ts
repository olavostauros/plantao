// `to_tsvector('ext.pt_unaccent', ...)` e o vetor de busca de uma questão, como o emmoni monta
// (migração 20261007100400_search.sql): enunciado || alternativas || texto-base, cada parte
// passada antes por `md_plain`. Decisão 0006.

import { parse, TOKEN } from './parser';
import { PORTUGUESE_STOPWORDS, UNACCENT } from './pg-data';
import { stemPortuguese } from './stem-pt';

/** Lexema → posições (1..16383), em ordem crescente. */
export type TsVector = Map<string, number[]>;

const MAXNUMPOS = 256;
const MAXENTRYPOS = 1 << 14;
const MAXSTRLEN = (1 << 11) - 1;
const limitPos = (p: number) => (p >= MAXENTRYPOS ? MAXENTRYPOS - 1 : p);
const encoder = new TextEncoder();
const bytes = (s: string) => encoder.encode(s).length;

/** towlower caractere a caractere (lowerstr_with_len / str_tolower). */
function lower(s: string): string {
  let out = '';
  for (const c of s) {
    const l = c.toLowerCase();
    out += [...l].length === 1 ? l : c;
  }
  return out;
}

function unaccent(s: string): string {
  let out = '';
  for (const c of s) out += UNACCENT[c] ?? c;
  return out;
}

function portugueseStem(token: string): string | null {
  const txt = lower(token);
  if (bytes(token) > 1000) return txt;
  if (txt === '' || PORTUGUESE_STOPWORDS.has(txt)) return null; // stopword: ocupa posição, sem lexema
  return stemPortuguese(txt);
}

// Mapeamento de `ext.pt_unaccent` (\dF+): tipo de token → dicionários.
const STEM = new Set<number>([TOKEN.ASCIIWORD, TOKEN.ASCIIHWORD, TOKEN.ASCIIPARTHWORD]);
const UNACCENT_STEM = new Set<number>([TOKEN.WORD, TOKEN.HWORD, TOKEN.PARTHWORD]);
const SIMPLE = new Set<number>([
  TOKEN.NUMWORD,
  TOKEN.NUMHWORD,
  TOKEN.NUMPARTHWORD,
  TOKEN.EMAIL,
  TOKEN.URL,
  TOKEN.HOST,
  TOKEN.SCIENTIFIC,
  TOKEN.VERSIONNUMBER,
  TOKEN.URLPATH,
  TOKEN.FILEPATH,
  TOKEN.DECIMAL,
  TOKEN.SIGNEDINT,
  TOKEN.UNSIGNEDINT,
]);

/**
 * Normaliza um token. `undefined`: tipo sem dicionário (espaço, tag...), não conta posição;
 * `null`: stopword, conta posição; string: o lexema.
 */
export function lexize(type: number, text: string): string | null | undefined {
  if (STEM.has(type)) return portugueseStem(text);
  if (UNACCENT_STEM.has(type)) return portugueseStem(unaccent(text));
  if (SIMPLE.has(type)) return lower(text);
  return undefined;
}

export interface ParsedWord {
  lexeme: string;
  pos: number;
}

/** `parsetext`: lexemas com posição; stopwords consomem posição. */
export function parseText(text: string): ParsedWord[] {
  const words: ParsedWord[] = [];
  let pos = 0;
  for (const t of parse(text)) {
    if (bytes(t.text) > MAXSTRLEN) continue; // IGNORE_LONGLEXEME: nem conta posição
    const lex = lexize(t.type, t.text);
    if (lex === undefined) continue;
    pos++;
    if (lex !== null && bytes(lex) <= MAXSTRLEN) words.push({ lexeme: lex, pos: limitPos(pos) });
  }
  return words;
}

/** `to_tsvector('ext.pt_unaccent', text)`. */
export function toTsVector(text: string): TsVector {
  const v: TsVector = new Map();
  for (const w of parseText(text)) {
    let list = v.get(w.lexeme);
    if (!list) v.set(w.lexeme, (list = []));
    // uniqueWORD: até MAXNUMPOS - 1 posições, sem repetir a última.
    if (list.length < MAXNUMPOS - 1 && list[list.length - 1] !== MAXENTRYPOS - 1 && list[list.length - 1] !== w.pos)
      list.push(w.pos);
  }
  return v;
}

function maxPos(v: TsVector): number {
  let m = 0;
  for (const list of v.values()) for (const p of list) if (p > m) m = p;
  return m;
}

/** `a || b`: as posições de `b` andam a maior posição de `a`. */
export function concat(a: TsVector, b: TsVector): TsVector {
  const shift = maxPos(a);
  const out: TsVector = new Map();
  for (const [lex, list] of a) out.set(lex, [...list]);
  for (const [lex, list] of b) {
    const dst = out.get(lex) ?? [];
    for (const p of list) {
      if (dst.length >= MAXNUMPOS || (dst.length > 0 && dst[dst.length - 1] === MAXENTRYPOS - 1)) break;
      dst.push(limitPos(p + shift));
    }
    out.set(lex, dst);
  }
  return out;
}

/** `md_plain` do emmoni: Markdown restrito → texto para indexar. */
export function mdPlain(md: string): string {
  return md
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<\/?u>/g, ' ')
    .replace(/-{3,}/g, ' ')
    .replace(/[*_|$`~\\]+/g, ' ');
}

export interface SearchableQuestion {
  statement_md: string;
  options: { letter: string; body_md: string }[];
  passage_md: string | null;
}

/** O `search_vector` de uma questão: enunciado || alternativas (em ordem de letra) || texto-base. */
export function questionVector(q: SearchableQuestion): TsVector {
  const options = [...q.options]
    .sort((a, b) => (a.letter < b.letter ? -1 : a.letter > b.letter ? 1 : 0))
    .map((o) => mdPlain(o.body_md))
    .join(' ');
  return concat(
    concat(toTsVector(mdPlain(q.statement_md)), toTsVector(options)),
    toTsVector(q.passage_md === null ? '' : mdPlain(q.passage_md)),
  );
}
