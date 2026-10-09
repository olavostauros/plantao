// `websearch_to_tsquery('ext.pt_unaccent', query)` e o operador `@@`, como no PostgreSQL 17
// (src/backend/utils/adt/tsquery.c, tsquery_cleanup.c, tsvector_op.c; src/backend/tsearch/to_tsany.c).
// Sintaxe de buscador: palavras = E, "aspas" = frase, -palavra = NÃO, or = OU. Decisão 0006.

import { isAlphaChar, isDigitCode, isSpaceCode } from './parser';
import { parseText } from './tsvector';

export type QueryNode =
  | { op: 'val'; lexeme: string }
  | { op: 'not'; arg: QueryNode }
  | { op: 'and' | 'or'; left: QueryNode; right: QueryNode }
  | { op: 'phrase'; left: QueryNode; right: QueryNode; distance: number };

type Stop = { op: 'stop' };
type RawNode =
  | Stop
  | { op: 'val'; lexeme: string }
  | { op: 'not'; arg: RawNode }
  | { op: 'and' | 'or'; left: RawNode; right: RawNode }
  | { op: 'phrase'; left: RawNode; right: RawNode; distance: number };

type Op = 'not' | 'and' | 'or' | 'phrase';
const PRIORITY: Record<Op, number> = { not: 4, phrase: 3, and: 2, or: 1 };

type Item = { kind: 'val'; lexeme: string } | { kind: 'stop' } | { kind: 'op'; op: Op; distance: number };

const isSpace = (c: string | undefined) => c !== undefined && isSpaceCode(c.codePointAt(0)!);
const isOperator = (c: string | undefined) => c !== undefined && '!&|()<'.includes(c);
const isAlnum = (c: string | undefined) =>
  c !== undefined && (isAlphaChar(c, c.codePointAt(0)!) || isDigitCode(c.codePointAt(0)!));

/** pushval_morph com qoperator = OP_PHRASE: um operando vira valor, frase ou "stopword". */
function pushvalMorph(out: Item[], operand: string) {
  const words = parseText(operand);
  if (words.length === 0) {
    out.push({ kind: 'stop' });
    return;
  }
  let pos = 0;
  let cntpos = 0;
  for (const w of words) {
    if (pos > 0 && pos + 1 < w.pos) {
      while (pos + 1 < w.pos) {
        out.push({ kind: 'stop' });
        if (cntpos) out.push({ kind: 'op', op: 'phrase', distance: 1 });
        cntpos++;
        pos++;
      }
    }
    pos = w.pos;
    out.push({ kind: 'val', lexeme: w.lexeme });
    if (cntpos) out.push({ kind: 'op', op: 'phrase', distance: 1 });
    cntpos++;
  }
}

/** parse_or_operator: "or" seguido de algum operando. Devolve o novo índice ou -1. */
function orOperator(s: string[], i: number): number {
  if ((s[i] ?? '').toLowerCase() !== 'o' || (s[i + 1] ?? '').toLowerCase() !== 'r') return -1;
  let p = i + 2;
  if (p >= s.length) return -1;
  if (s[p] === '-' || s[p] === '_' || isAlnum(s[p])) return -1;
  for (;;) {
    p++;
    if (p >= s.length) return -1;
    if (!isSpace(s[p])) break;
  }
  return i + 2;
}

/** Monta a notação polonesa (makepol) a partir da consulta, com o tokenizador "websearch". */
function makepol(query: string): Item[] {
  const s = Array.from(query);
  const out: Item[] = [];
  const stack: Op[] = [];
  const clean = (op: Op) => {
    while (stack.length) {
      const top = stack[stack.length - 1];
      if ((op !== 'not' && PRIORITY[op] > PRIORITY[top]) || (op === 'not' && PRIORITY[op] >= PRIORITY[top])) break;
      stack.pop();
      out.push({ kind: 'op', op: top, distance: top === 'phrase' ? 1 : 0 });
    }
  };
  const operator = (op: Op) => {
    clean(op);
    stack.push(op);
  };

  type State = 'first' | 'operand' | 'operator';
  let state: State = 'first';
  let i = 0;
  for (;;) {
    const c = s[i];
    if (state === 'first' || state === 'operand') {
      if (c === '-') {
        i++;
        state = 'operand';
        operator('not');
        continue;
      } else if (c === '"') {
        i++;
        const start = i;
        while (i < s.length && s[i] !== '"') i++;
        const text = s.slice(start, i).join('');
        if (i < s.length) i++;
        state = 'operator';
        pushvalMorph(out, text);
        continue;
      } else if (isOperator(c)) {
        i++;
        state = 'operand';
        continue;
      } else if (c !== undefined && !isSpace(c)) {
        // gettoken_tsvector (modo web): até espaço, fim, operador ou aspas; ':' também encerra.
        const start = i;
        i++;
        while (i < s.length && !isSpace(s[i]) && !isOperator(s[i]) && s[i] !== '"' && s[i] !== ':') i++;
        state = 'operator';
        pushvalMorph(out, s.slice(start, i).join(''));
        continue;
      } else if (c === undefined) {
        if (state === 'operand') out.push({ kind: 'stop' });
        break;
      }
    } else {
      if (c === undefined) break;
      const or = orOperator(s, i);
      if (or >= 0) {
        i = or;
        state = 'operand';
        operator('or');
        continue;
      } else if (isOperator(c)) {
        i++;
        continue;
      } else if (!isSpace(c)) {
        state = 'operand';
        operator('and');
        continue;
      }
    }
    i++;
  }
  clean('or');
  return out;
}

function buildTree(items: Item[]): RawNode | null {
  const st: RawNode[] = [];
  for (const it of items) {
    if (it.kind === 'val') st.push({ op: 'val', lexeme: it.lexeme });
    else if (it.kind === 'stop') st.push({ op: 'stop' });
    else if (it.op === 'not') st.push({ op: 'not', arg: st.pop()! });
    else {
      const right = st.pop()!;
      const left = st.pop()!;
      st.push(it.op === 'phrase' ? { op: 'phrase', left, right, distance: it.distance } : { op: it.op, left, right });
    }
  }
  return st.length ? st[st.length - 1] : null;
}

/** clean_stopword_intree: tira as stopwords e corrige as distâncias das frases. */
function cleanStopwords(node: RawNode): { node: QueryNode | null; ladd: number; radd: number } {
  if (node.op === 'val') return { node, ladd: 0, radd: 0 };
  if (node.op === 'stop') return { node: null, ladd: 0, radd: 0 };
  if (node.op === 'not') {
    const r = cleanStopwords(node.arg);
    return { node: r.node ? { op: 'not', arg: r.node } : null, ladd: r.ladd, radd: r.radd };
  }
  const l = cleanStopwords(node.left);
  const r = cleanStopwords(node.right);
  const isPhrase = node.op === 'phrase';
  const d = isPhrase ? node.distance : 0;
  if (!l.node && !r.node) {
    const add = isPhrase ? l.ladd + d + r.ladd : Math.max(l.ladd, r.ladd);
    return { node: null, ladd: add, radd: add };
  }
  if (!l.node) {
    return isPhrase
      ? { node: r.node, ladd: l.ladd + d + r.ladd, radd: r.radd }
      : { node: r.node, ladd: r.ladd, radd: r.radd };
  }
  if (!r.node) {
    return isPhrase
      ? { node: l.node, ladd: l.ladd, radd: l.radd + d + r.radd }
      : { node: l.node, ladd: l.ladd, radd: l.radd };
  }
  if (isPhrase)
    return { node: { op: 'phrase', left: l.node, right: r.node, distance: d + l.radd + r.ladd }, ladd: l.ladd, radd: r.radd };
  return { node: { op: node.op, left: l.node, right: r.node }, ladd: 0, radd: 0 };
}

/** Consulta compilada; `null` = consulta vazia (só stopwords ou nada): não acha nenhuma questão. */
export function websearchToTsQuery(query: string): QueryNode | null {
  const tree = buildTree(makepol(query));
  return tree ? cleanStopwords(tree).node : null;
}

/** Texto da consulta no formato do `tsqueryout` do PostgreSQL (para os testes de paridade). */
export function queryToString(node: QueryNode | null): string {
  if (!node) return '';
  const infix = (n: QueryNode, parent: number, rightPhrase: boolean): string => {
    if (n.op === 'val') return `'${n.lexeme.replace(/'/g, "''").replace(/\\/g, '\\\\')}'`;
    const pr = PRIORITY[n.op];
    if (n.op === 'not') {
      const inner = '!' + infix(n.arg, pr, false);
      return pr < parent ? `( ${inner} )` : inner;
    }
    const right = infix(n.right, pr, n.op === 'phrase');
    const left = infix(n.left, pr, false);
    const sym = n.op === 'or' ? '|' : n.op === 'and' ? '&' : n.op === 'phrase' && n.distance !== 1 ? `<${n.distance}>` : '<->';
    const s = `${left} ${sym} ${right}`;
    return pr < parent || (n.op === 'phrase' && rightPhrase) ? `( ${s} )` : s;
  };
  return infix(node, -1, false);
}

/** Lexemas da consulta (para carregar as fatias do índice). */
export function queryLexemes(node: QueryNode | null, out = new Set<string>()): Set<string> {
  if (!node) return out;
  if (node.op === 'val') out.add(node.lexeme);
  else if (node.op === 'not') queryLexemes(node.arg, out);
  else {
    queryLexemes(node.left, out);
    queryLexemes(node.right, out);
  }
  return out;
}

/** Posições de um lexema na questão (ordem crescente), ou `undefined` se ela não tem o lexema. */
export type PositionsOf = (lexeme: string) => readonly number[] | undefined;

interface PhraseData {
  pos: number[];
  width: number;
}

/** TS_phrase_execute para subárvores de frase (valores e <N>), as únicas que o websearch gera. */
function phrase(node: QueryNode, positions: PositionsOf): PhraseData | null {
  if (node.op === 'val') {
    const p = positions(node.lexeme);
    return p && p.length ? { pos: [...p], width: 0 } : null;
  }
  if (node.op !== 'phrase') return matches(node, positions) ? { pos: [], width: 0 } : null;
  const l = phrase(node.left, positions);
  if (!l) return null;
  const r = phrase(node.right, positions);
  if (!r) return null;
  const loff = node.distance + r.width;
  const out: number[] = [];
  let li = 0;
  for (const rp of r.pos) {
    while (li < l.pos.length && l.pos[li] + loff < rp) li++;
    if (li < l.pos.length && l.pos[li] + loff === rp) out.push(rp);
  }
  return out.length ? { pos: out, width: node.distance + l.width + r.width } : null;
}

/** `vector @@ query` para uma questão. */
export function matches(node: QueryNode, positions: PositionsOf): boolean {
  switch (node.op) {
    case 'val':
      return positions(node.lexeme) !== undefined;
    case 'not':
      return !matches(node.arg, positions);
    case 'and':
      return matches(node.left, positions) && matches(node.right, positions);
    case 'or':
      return matches(node.left, positions) || matches(node.right, positions);
    case 'phrase':
      return phrase(node, positions) !== null;
  }
}

/** A busca do contrato só usa o texto se ele não for vazio depois de tirar espaços das pontas. */
export function hasQuery(query: string | null | undefined): query is string {
  return !!query && query.replace(/^ +| +$/g, '') !== '';
}
