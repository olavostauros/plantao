// Porte do analisador padrão de busca textual do PostgreSQL 17 (src/backend/tsearch/wparser_def.c),
// o `pg_catalog.default` usado pela configuração `ext.pt_unaccent` do emmoni. É uma máquina de
// estados em tabelas; as tabelas abaixo seguem as do C, na mesma ordem, para que a comparação
// linha a linha seja simples. Decisão 0006.
//
// Diferenças conhecidas (não afetam texto em português):
// - classes de caractere aproximam as do glibc em en_US.UTF-8 com propriedades Unicode do JS;
// - `p_isspecial` não inclui a lista de sinais de escritas indianas do C.

export const TOKEN = {
  ASCIIWORD: 1,
  WORD: 2,
  NUMWORD: 3,
  EMAIL: 4,
  URL: 5,
  HOST: 6,
  SCIENTIFIC: 7,
  VERSIONNUMBER: 8,
  NUMPARTHWORD: 9,
  PARTHWORD: 10,
  ASCIIPARTHWORD: 11,
  SPACE: 12,
  TAG: 13,
  PROTOCOL: 14,
  NUMHWORD: 15,
  ASCIIHWORD: 16,
  HWORD: 17,
  URLPATH: 18,
  FILEPATH: 19,
  DECIMAL: 20,
  SIGNEDINT: 21,
  UNSIGNEDINT: 22,
  XMLENTITY: 23,
} as const;

export interface Token {
  type: number;
  text: string;
}

// Estados (mesma ordem do enum TParserState).
const S = {
  Base: 0,
  InNumWord: 1,
  InAsciiWord: 2,
  InWord: 3,
  InUnsignedInt: 4,
  InSignedIntFirst: 5,
  InSignedInt: 6,
  InSpace: 7,
  InUDecimalFirst: 8,
  InUDecimal: 9,
  InDecimalFirst: 10,
  InDecimal: 11,
  InVerVersion: 12,
  InSVerVersion: 13,
  InVersionFirst: 14,
  InVersion: 15,
  InMantissaFirst: 16,
  InMantissaSign: 17,
  InMantissa: 18,
  InXMLEntityFirst: 19,
  InXMLEntity: 20,
  InXMLEntityNumFirst: 21,
  InXMLEntityNum: 22,
  InXMLEntityHexNumFirst: 23,
  InXMLEntityHexNum: 24,
  InXMLEntityEnd: 25,
  InTagFirst: 26,
  InXMLBegin: 27,
  InTagCloseFirst: 28,
  InTagName: 29,
  InTagBeginEnd: 30,
  InTag: 31,
  InTagEscapeK: 32,
  InTagEscapeKK: 33,
  InTagBackSleshed: 34,
  InTagEnd: 35,
  InCommentFirst: 36,
  InCommentLast: 37,
  InComment: 38,
  InCloseCommentFirst: 39,
  InCloseCommentLast: 40,
  InCommentEnd: 41,
  InHostFirstDomain: 42,
  InHostDomainSecond: 43,
  InHostDomain: 44,
  InPortFirst: 45,
  InPort: 46,
  InHostFirstAN: 47,
  InHost: 48,
  InEmail: 49,
  InFileFirst: 50,
  InFileTwiddle: 51,
  InPathFirst: 52,
  InPathFirstFirst: 53,
  InPathSecond: 54,
  InFile: 55,
  InFileNext: 56,
  InURLPathFirst: 57,
  InURLPathStart: 58,
  InURLPath: 59,
  InFURL: 60,
  InProtocolFirst: 61,
  InProtocolSecond: 62,
  InProtocolEnd: 63,
  InHyphenAsciiWordFirst: 64,
  InHyphenAsciiWord: 65,
  InHyphenWordFirst: 66,
  InHyphenWord: 67,
  InHyphenNumWordFirst: 68,
  InHyphenNumWord: 69,
  InHyphenDigitLookahead: 70,
  InParseHyphen: 71,
  InParseHyphenHyphen: 72,
  InHyphenWordPart: 73,
  InHyphenAsciiWordPart: 74,
  InHyphenNumWordPart: 75,
  InHyphenUnsignedInt: 76,
  Null: 77,
} as const;
type S = (typeof S)[keyof typeof S];

const A_NEXT = 0x0000;
const A_BINGO = 0x0001;
const A_POP = 0x0002;
const A_PUSH = 0x0004;
const A_RERUN = 0x0008;
const A_CLEAR = 0x0010;
const A_MERGE = 0x0020;
const A_CLRALL = 0x0040;

interface Position {
  pos: number; // posição em caracteres (code points)
  charlen: number; // 0 no fim, senão 1; `ascii` diz se o caractere tem 1 byte em UTF-8
  len: number; // tamanho do token até aqui, em caracteres
  state: S;
  prev: Position | null;
  pushedAt: number; // índice da ação que fez PUSH, ou -1
}

interface Parser {
  chars: string[];
  codes: number[];
  start: number; // início desta cópia (p_ishost/p_isURLPath criam cópias)
  state: Position;
  ignore: boolean;
  wanthost: boolean;
  c: string;
  tokenStart: number;
  tokenLen: number;
  type: number;
}

type Test = ((p: Parser) => boolean) | null;
type Special = ((p: Parser) => void) | null;
type Action = readonly [Test, string, number, S, number, Special];

// --- classes de caractere -------------------------------------------------------------------

const ALPHA = /[\p{Alphabetic}]/u;
const ND = /\p{Nd}/u;
const SPECIAL = /[\p{Mn}\p{Me}\p{Cf}]/u;

const code = (p: Parser) => p.codes[p.state.pos] ?? 0;
const ch = (p: Parser) => p.chars[p.state.pos] ?? '';

/** iswalpha do glibc: letras (Alphabetic) e dígitos não ASCII. */
export function isAlphaChar(s: string, c: number): boolean {
  if (c < 0x80) return (c >= 65 && c <= 90) || (c >= 97 && c <= 122);
  return ALPHA.test(s) || ND.test(s);
}
export function isSpaceCode(c: number): boolean {
  return (
    c === 0x20 ||
    (c >= 0x09 && c <= 0x0d) ||
    c === 0x1680 ||
    (c >= 0x2000 && c <= 0x2006) ||
    (c >= 0x2008 && c <= 0x200a) ||
    c === 0x2028 ||
    c === 0x2029 ||
    c === 0x205f ||
    c === 0x3000
  );
}
export const isDigitCode = (c: number) => c >= 48 && c <= 57;

const p_isEOF = (p: Parser) => p.state.pos >= p.chars.length || p.state.charlen === 0;
const p_isalpha = (p: Parser) => !p_isEOF(p) && isAlphaChar(ch(p), code(p));
const p_isdigit = (p: Parser) => !p_isEOF(p) && isDigitCode(code(p));
const p_isalnum = (p: Parser) => p_isalpha(p) || p_isdigit(p);
const p_isnotalnum = (p: Parser) => !p_isalnum(p);
const p_isspace = (p: Parser) => !p_isEOF(p) && isSpaceCode(code(p));
const p_isxdigit = (p: Parser) => {
  const c = code(p);
  return !p_isEOF(p) && (isDigitCode(c) || (c >= 65 && c <= 70) || (c >= 97 && c <= 102));
};
const p_iseqC = (p: Parser) => !p_isEOF(p) && ch(p) === p.c;
const p_isascii = (p: Parser) => !p_isEOF(p) && code(p) < 0x80;
const p_isasclet = (p: Parser) => p_isascii(p) && p_isalpha(p);
const p_isurlchar = (p: Parser) => {
  if (p_isEOF(p)) return false;
  const c = code(p);
  if (c <= 0x20 || c >= 0x7f) return false;
  return !'"<>\\^`{|}'.includes(ch(p));
};
/** pg_dsplen == 0: marcas e caracteres de formatação de largura zero. */
const p_isspecial = (p: Parser) => !p_isEOF(p) && SPECIAL.test(ch(p));
const p_isignore = (p: Parser) => p.ignore;
const p_isstophost = (p: Parser) => {
  if (p.wanthost) {
    p.wanthost = false;
    return true;
  }
  return false;
};

function copyParser(p: Parser): Parser {
  return {
    chars: p.chars,
    codes: p.codes,
    start: p.state.pos,
    state: { pos: p.state.pos, charlen: 0, len: 0, state: S.Base, prev: null, pushedAt: -1 },
    ignore: false,
    wanthost: false,
    c: '',
    tokenStart: 0,
    tokenLen: 0,
    type: 0,
  };
}

function absorb(p: Parser, tmp: Parser) {
  p.state.pos += tmp.tokenLen;
  p.state.len += tmp.tokenLen;
  p.state.charlen = tmp.state.charlen;
}

const p_ishost = (p: Parser) => {
  const tmp = copyParser(p);
  tmp.wanthost = true;
  if (next(tmp) && tmp.type === TOKEN.HOST) {
    absorb(p, tmp);
    return true;
  }
  return false;
};

const p_isURLPath = (p: Parser) => {
  const tmp = copyParser(p);
  tmp.state = { ...tmp.state, prev: tmp.state, state: S.InURLPathFirst, pushedAt: -1 };
  if (next(tmp) && tmp.type === TOKEN.URLPATH) {
    absorb(p, tmp);
    return true;
  }
  return false;
};

// --- ações especiais ------------------------------------------------------------------------

function SpecialTags(p: Parser) {
  const tok = p.chars.slice(p.tokenStart, p.tokenStart + p.state.len).join('').toLowerCase();
  switch (p.state.len) {
    case 8:
      if (tok === '</script') p.ignore = false;
      break;
    case 7:
      if (tok === '</style') p.ignore = false;
      else if (tok === '<script') p.ignore = true;
      break;
    case 6:
      if (tok === '<style') p.ignore = true;
      break;
  }
}
function SpecialFURL(p: Parser) {
  p.wanthost = true;
  p.state.pos -= p.state.len;
}
function SpecialHyphen(p: Parser) {
  p.state.pos -= p.state.len;
}
function SpecialVerVersion(p: Parser) {
  p.state.pos -= p.state.len;
  p.state.len = 0;
}

// --- tabelas (iguais às do C) ---------------------------------------------------------------

const T = TOKEN;
const N = S.Null;
const ACTIONS: Record<number, readonly Action[]> = {
  [S.Base]: [
    [p_isEOF, '', A_NEXT, N, 0, null],
    [p_iseqC, '<', A_PUSH, S.InTagFirst, 0, null],
    [p_isignore, '', A_NEXT, S.InSpace, 0, null],
    [p_isasclet, '', A_NEXT, S.InAsciiWord, 0, null],
    [p_isalpha, '', A_NEXT, S.InWord, 0, null],
    [p_isdigit, '', A_NEXT, S.InUnsignedInt, 0, null],
    [p_iseqC, '-', A_PUSH, S.InSignedIntFirst, 0, null],
    [p_iseqC, '+', A_PUSH, S.InSignedIntFirst, 0, null],
    [p_iseqC, '&', A_PUSH, S.InXMLEntityFirst, 0, null],
    [p_iseqC, '~', A_PUSH, S.InFileTwiddle, 0, null],
    [p_iseqC, '/', A_PUSH, S.InFileFirst, 0, null],
    [p_iseqC, '.', A_PUSH, S.InPathFirstFirst, 0, null],
    [null, '', A_NEXT, S.InSpace, 0, null],
  ],
  [S.InNumWord]: [
    [p_isEOF, '', A_BINGO, S.Base, T.NUMWORD, null],
    [p_isalnum, '', A_NEXT, S.InNumWord, 0, null],
    [p_isspecial, '', A_NEXT, S.InNumWord, 0, null],
    [p_iseqC, '@', A_PUSH, S.InEmail, 0, null],
    [p_iseqC, '/', A_PUSH, S.InFileFirst, 0, null],
    [p_iseqC, '.', A_PUSH, S.InFileNext, 0, null],
    [p_iseqC, '-', A_PUSH, S.InHyphenNumWordFirst, 0, null],
    [null, '', A_BINGO, S.Base, T.NUMWORD, null],
  ],
  [S.InAsciiWord]: [
    [p_isEOF, '', A_BINGO, S.Base, T.ASCIIWORD, null],
    [p_isasclet, '', A_NEXT, N, 0, null],
    [p_iseqC, '.', A_PUSH, S.InHostFirstDomain, 0, null],
    [p_iseqC, '.', A_PUSH, S.InFileNext, 0, null],
    [p_iseqC, '-', A_PUSH, S.InHostFirstAN, 0, null],
    [p_iseqC, '-', A_PUSH, S.InHyphenAsciiWordFirst, 0, null],
    [p_iseqC, '_', A_PUSH, S.InHostFirstAN, 0, null],
    [p_iseqC, '@', A_PUSH, S.InEmail, 0, null],
    [p_iseqC, ':', A_PUSH, S.InProtocolFirst, 0, null],
    [p_iseqC, '/', A_PUSH, S.InFileFirst, 0, null],
    [p_isdigit, '', A_PUSH, S.InHost, 0, null],
    [p_isdigit, '', A_NEXT, S.InNumWord, 0, null],
    [p_isalpha, '', A_NEXT, S.InWord, 0, null],
    [p_isspecial, '', A_NEXT, S.InWord, 0, null],
    [null, '', A_BINGO, S.Base, T.ASCIIWORD, null],
  ],
  [S.InWord]: [
    [p_isEOF, '', A_BINGO, S.Base, T.WORD, null],
    [p_isalpha, '', A_NEXT, N, 0, null],
    [p_isspecial, '', A_NEXT, N, 0, null],
    [p_isdigit, '', A_NEXT, S.InNumWord, 0, null],
    [p_iseqC, '-', A_PUSH, S.InHyphenWordFirst, 0, null],
    [null, '', A_BINGO, S.Base, T.WORD, null],
  ],
  [S.InUnsignedInt]: [
    [p_isEOF, '', A_BINGO, S.Base, T.UNSIGNEDINT, null],
    [p_isdigit, '', A_NEXT, N, 0, null],
    [p_iseqC, '.', A_PUSH, S.InHostFirstDomain, 0, null],
    [p_iseqC, '.', A_PUSH, S.InUDecimalFirst, 0, null],
    [p_iseqC, 'e', A_PUSH, S.InMantissaFirst, 0, null],
    [p_iseqC, 'E', A_PUSH, S.InMantissaFirst, 0, null],
    [p_iseqC, '-', A_PUSH, S.InHostFirstAN, 0, null],
    [p_iseqC, '_', A_PUSH, S.InHostFirstAN, 0, null],
    [p_iseqC, '@', A_PUSH, S.InEmail, 0, null],
    [p_isasclet, '', A_PUSH, S.InHost, 0, null],
    [p_isalpha, '', A_NEXT, S.InNumWord, 0, null],
    [p_isspecial, '', A_NEXT, S.InNumWord, 0, null],
    [p_iseqC, '/', A_PUSH, S.InFileFirst, 0, null],
    [null, '', A_BINGO, S.Base, T.UNSIGNEDINT, null],
  ],
  [S.InSignedIntFirst]: [
    [p_isEOF, '', A_POP, N, 0, null],
    [p_isdigit, '', A_NEXT | A_CLEAR, S.InSignedInt, 0, null],
    [null, '', A_POP, N, 0, null],
  ],
  [S.InSignedInt]: [
    [p_isEOF, '', A_BINGO, S.Base, T.SIGNEDINT, null],
    [p_isdigit, '', A_NEXT, N, 0, null],
    [p_iseqC, '.', A_PUSH, S.InDecimalFirst, 0, null],
    [p_iseqC, 'e', A_PUSH, S.InMantissaFirst, 0, null],
    [p_iseqC, 'E', A_PUSH, S.InMantissaFirst, 0, null],
    [null, '', A_BINGO, S.Base, T.SIGNEDINT, null],
  ],
  [S.InSpace]: [
    [p_isEOF, '', A_BINGO, S.Base, T.SPACE, null],
    [p_iseqC, '<', A_BINGO, S.Base, T.SPACE, null],
    [p_isignore, '', A_NEXT, N, 0, null],
    [p_iseqC, '-', A_BINGO, S.Base, T.SPACE, null],
    [p_iseqC, '+', A_BINGO, S.Base, T.SPACE, null],
    [p_iseqC, '&', A_BINGO, S.Base, T.SPACE, null],
    [p_iseqC, '/', A_BINGO, S.Base, T.SPACE, null],
    [p_isnotalnum, '', A_NEXT, S.InSpace, 0, null],
    [null, '', A_BINGO, S.Base, T.SPACE, null],
  ],
  [S.InUDecimalFirst]: [
    [p_isEOF, '', A_POP, N, 0, null],
    [p_isdigit, '', A_CLEAR, S.InUDecimal, 0, null],
    [null, '', A_POP, N, 0, null],
  ],
  [S.InUDecimal]: [
    [p_isEOF, '', A_BINGO, S.Base, T.DECIMAL, null],
    [p_isdigit, '', A_NEXT, S.InUDecimal, 0, null],
    [p_iseqC, '.', A_PUSH, S.InVersionFirst, 0, null],
    [p_iseqC, 'e', A_PUSH, S.InMantissaFirst, 0, null],
    [p_iseqC, 'E', A_PUSH, S.InMantissaFirst, 0, null],
    [null, '', A_BINGO, S.Base, T.DECIMAL, null],
  ],
  [S.InDecimalFirst]: [
    [p_isEOF, '', A_POP, N, 0, null],
    [p_isdigit, '', A_CLEAR, S.InDecimal, 0, null],
    [null, '', A_POP, N, 0, null],
  ],
  [S.InDecimal]: [
    [p_isEOF, '', A_BINGO, S.Base, T.DECIMAL, null],
    [p_isdigit, '', A_NEXT, S.InDecimal, 0, null],
    [p_iseqC, '.', A_PUSH, S.InVerVersion, 0, null],
    [p_iseqC, 'e', A_PUSH, S.InMantissaFirst, 0, null],
    [p_iseqC, 'E', A_PUSH, S.InMantissaFirst, 0, null],
    [null, '', A_BINGO, S.Base, T.DECIMAL, null],
  ],
  [S.InVerVersion]: [
    [p_isEOF, '', A_POP, N, 0, null],
    [p_isdigit, '', A_RERUN, S.InSVerVersion, 0, SpecialVerVersion],
    [null, '', A_POP, N, 0, null],
  ],
  [S.InSVerVersion]: [
    [p_isEOF, '', A_POP, N, 0, null],
    [p_isdigit, '', A_BINGO | A_CLRALL, S.InUnsignedInt, T.SPACE, null],
    [null, '', A_NEXT, N, 0, null],
  ],
  [S.InVersionFirst]: [
    [p_isEOF, '', A_POP, N, 0, null],
    [p_isdigit, '', A_CLEAR, S.InVersion, 0, null],
    [null, '', A_POP, N, 0, null],
  ],
  [S.InVersion]: [
    [p_isEOF, '', A_BINGO, S.Base, T.VERSIONNUMBER, null],
    [p_isdigit, '', A_NEXT, S.InVersion, 0, null],
    [p_iseqC, '.', A_PUSH, S.InVersionFirst, 0, null],
    [null, '', A_BINGO, S.Base, T.VERSIONNUMBER, null],
  ],
  [S.InMantissaFirst]: [
    [p_isEOF, '', A_POP, N, 0, null],
    [p_isdigit, '', A_CLEAR, S.InMantissa, 0, null],
    [p_iseqC, '+', A_NEXT, S.InMantissaSign, 0, null],
    [p_iseqC, '-', A_NEXT, S.InMantissaSign, 0, null],
    [null, '', A_POP, N, 0, null],
  ],
  [S.InMantissaSign]: [
    [p_isEOF, '', A_POP, N, 0, null],
    [p_isdigit, '', A_CLEAR, S.InMantissa, 0, null],
    [null, '', A_POP, N, 0, null],
  ],
  [S.InMantissa]: [
    [p_isEOF, '', A_BINGO, S.Base, T.SCIENTIFIC, null],
    [p_isdigit, '', A_NEXT, S.InMantissa, 0, null],
    [null, '', A_BINGO, S.Base, T.SCIENTIFIC, null],
  ],
  [S.InXMLEntityFirst]: [
    [p_isEOF, '', A_POP, N, 0, null],
    [p_iseqC, '#', A_NEXT, S.InXMLEntityNumFirst, 0, null],
    [p_isasclet, '', A_NEXT, S.InXMLEntity, 0, null],
    [p_iseqC, ':', A_NEXT, S.InXMLEntity, 0, null],
    [p_iseqC, '_', A_NEXT, S.InXMLEntity, 0, null],
    [null, '', A_POP, N, 0, null],
  ],
  [S.InXMLEntity]: [
    [p_isEOF, '', A_POP, N, 0, null],
    [p_isalnum, '', A_NEXT, S.InXMLEntity, 0, null],
    [p_iseqC, ':', A_NEXT, S.InXMLEntity, 0, null],
    [p_iseqC, '_', A_NEXT, S.InXMLEntity, 0, null],
    [p_iseqC, '.', A_NEXT, S.InXMLEntity, 0, null],
    [p_iseqC, '-', A_NEXT, S.InXMLEntity, 0, null],
    [p_iseqC, ';', A_NEXT, S.InXMLEntityEnd, 0, null],
    [null, '', A_POP, N, 0, null],
  ],
  [S.InXMLEntityNumFirst]: [
    [p_isEOF, '', A_POP, N, 0, null],
    [p_iseqC, 'x', A_NEXT, S.InXMLEntityHexNumFirst, 0, null],
    [p_iseqC, 'X', A_NEXT, S.InXMLEntityHexNumFirst, 0, null],
    [p_isdigit, '', A_NEXT, S.InXMLEntityNum, 0, null],
    [null, '', A_POP, N, 0, null],
  ],
  [S.InXMLEntityHexNumFirst]: [
    [p_isEOF, '', A_POP, N, 0, null],
    [p_isxdigit, '', A_NEXT, S.InXMLEntityHexNum, 0, null],
    [null, '', A_POP, N, 0, null],
  ],
  [S.InXMLEntityNum]: [
    [p_isEOF, '', A_POP, N, 0, null],
    [p_isdigit, '', A_NEXT, S.InXMLEntityNum, 0, null],
    [p_iseqC, ';', A_NEXT, S.InXMLEntityEnd, 0, null],
    [null, '', A_POP, N, 0, null],
  ],
  [S.InXMLEntityHexNum]: [
    [p_isEOF, '', A_POP, N, 0, null],
    [p_isxdigit, '', A_NEXT, S.InXMLEntityHexNum, 0, null],
    [p_iseqC, ';', A_NEXT, S.InXMLEntityEnd, 0, null],
    [null, '', A_POP, N, 0, null],
  ],
  [S.InXMLEntityEnd]: [[null, '', A_BINGO | A_CLEAR, S.Base, T.XMLENTITY, null]],
  [S.InTagFirst]: [
    [p_isEOF, '', A_POP, N, 0, null],
    [p_iseqC, '/', A_PUSH, S.InTagCloseFirst, 0, null],
    [p_iseqC, '!', A_PUSH, S.InCommentFirst, 0, null],
    [p_iseqC, '?', A_PUSH, S.InXMLBegin, 0, null],
    [p_isasclet, '', A_PUSH, S.InTagName, 0, null],
    [p_iseqC, ':', A_PUSH, S.InTagName, 0, null],
    [p_iseqC, '_', A_PUSH, S.InTagName, 0, null],
    [null, '', A_POP, N, 0, null],
  ],
  [S.InXMLBegin]: [
    [p_isEOF, '', A_POP, N, 0, null],
    [p_iseqC, 'x', A_NEXT, S.InTag, 0, null],
    [null, '', A_POP, N, 0, null],
  ],
  [S.InTagCloseFirst]: [
    [p_isEOF, '', A_POP, N, 0, null],
    [p_isasclet, '', A_NEXT, S.InTagName, 0, null],
    [null, '', A_POP, N, 0, null],
  ],
  [S.InTagName]: [
    [p_isEOF, '', A_POP, N, 0, null],
    [p_iseqC, '/', A_NEXT, S.InTagBeginEnd, 0, null],
    [p_iseqC, '>', A_NEXT, S.InTagEnd, 0, SpecialTags],
    [p_isspace, '', A_NEXT, S.InTag, 0, SpecialTags],
    [p_isalnum, '', A_NEXT, N, 0, null],
    [p_iseqC, ':', A_NEXT, N, 0, null],
    [p_iseqC, '_', A_NEXT, N, 0, null],
    [p_iseqC, '.', A_NEXT, N, 0, null],
    [p_iseqC, '-', A_NEXT, N, 0, null],
    [null, '', A_POP, N, 0, null],
  ],
  [S.InTagBeginEnd]: [
    [p_isEOF, '', A_POP, N, 0, null],
    [p_iseqC, '>', A_NEXT, S.InTagEnd, 0, null],
    [null, '', A_POP, N, 0, null],
  ],
  [S.InTag]: [
    [p_isEOF, '', A_POP, N, 0, null],
    [p_iseqC, '>', A_NEXT, S.InTagEnd, 0, SpecialTags],
    [p_iseqC, "'", A_NEXT, S.InTagEscapeK, 0, null],
    [p_iseqC, '"', A_NEXT, S.InTagEscapeKK, 0, null],
    [p_isasclet, '', A_NEXT, N, 0, null],
    [p_isdigit, '', A_NEXT, N, 0, null],
    [p_iseqC, '=', A_NEXT, N, 0, null],
    [p_iseqC, '-', A_NEXT, N, 0, null],
    [p_iseqC, '_', A_NEXT, N, 0, null],
    [p_iseqC, '#', A_NEXT, N, 0, null],
    [p_iseqC, '/', A_NEXT, N, 0, null],
    [p_iseqC, ':', A_NEXT, N, 0, null],
    [p_iseqC, '.', A_NEXT, N, 0, null],
    [p_iseqC, '&', A_NEXT, N, 0, null],
    [p_iseqC, '?', A_NEXT, N, 0, null],
    [p_iseqC, '%', A_NEXT, N, 0, null],
    [p_iseqC, '~', A_NEXT, N, 0, null],
    [p_isspace, '', A_NEXT, N, 0, SpecialTags],
    [null, '', A_POP, N, 0, null],
  ],
  [S.InTagEscapeK]: [
    [p_isEOF, '', A_POP, N, 0, null],
    [p_iseqC, '\\', A_PUSH, S.InTagBackSleshed, 0, null],
    [p_iseqC, "'", A_NEXT, S.InTag, 0, null],
    [null, '', A_NEXT, S.InTagEscapeK, 0, null],
  ],
  [S.InTagEscapeKK]: [
    [p_isEOF, '', A_POP, N, 0, null],
    [p_iseqC, '\\', A_PUSH, S.InTagBackSleshed, 0, null],
    [p_iseqC, '"', A_NEXT, S.InTag, 0, null],
    [null, '', A_NEXT, S.InTagEscapeKK, 0, null],
  ],
  [S.InTagBackSleshed]: [
    [p_isEOF, '', A_POP, N, 0, null],
    [null, '', A_MERGE, N, 0, null],
  ],
  [S.InTagEnd]: [[null, '', A_BINGO | A_CLRALL, S.Base, T.TAG, null]],
  [S.InCommentFirst]: [
    [p_isEOF, '', A_POP, N, 0, null],
    [p_iseqC, '-', A_NEXT, S.InCommentLast, 0, null],
    [p_iseqC, 'D', A_NEXT, S.InTag, 0, null],
    [p_iseqC, 'd', A_NEXT, S.InTag, 0, null],
    [null, '', A_POP, N, 0, null],
  ],
  [S.InCommentLast]: [
    [p_isEOF, '', A_POP, N, 0, null],
    [p_iseqC, '-', A_NEXT, S.InComment, 0, null],
    [null, '', A_POP, N, 0, null],
  ],
  [S.InComment]: [
    [p_isEOF, '', A_POP, N, 0, null],
    [p_iseqC, '-', A_NEXT, S.InCloseCommentFirst, 0, null],
    [null, '', A_NEXT, N, 0, null],
  ],
  [S.InCloseCommentFirst]: [
    [p_isEOF, '', A_POP, N, 0, null],
    [p_iseqC, '-', A_NEXT, S.InCloseCommentLast, 0, null],
    [null, '', A_NEXT, S.InComment, 0, null],
  ],
  [S.InCloseCommentLast]: [
    [p_isEOF, '', A_POP, N, 0, null],
    [p_iseqC, '-', A_NEXT, N, 0, null],
    [p_iseqC, '>', A_NEXT, S.InCommentEnd, 0, null],
    [null, '', A_NEXT, S.InComment, 0, null],
  ],
  [S.InCommentEnd]: [[null, '', A_BINGO | A_CLRALL, S.Base, T.TAG, null]],
  [S.InHostFirstDomain]: [
    [p_isEOF, '', A_POP, N, 0, null],
    [p_isasclet, '', A_NEXT, S.InHostDomainSecond, 0, null],
    [p_isdigit, '', A_NEXT, S.InHost, 0, null],
    [null, '', A_POP, N, 0, null],
  ],
  [S.InHostDomainSecond]: [
    [p_isEOF, '', A_POP, N, 0, null],
    [p_isasclet, '', A_NEXT, S.InHostDomain, 0, null],
    [p_isdigit, '', A_PUSH, S.InHost, 0, null],
    [p_iseqC, '-', A_PUSH, S.InHostFirstAN, 0, null],
    [p_iseqC, '_', A_PUSH, S.InHostFirstAN, 0, null],
    [p_iseqC, '.', A_PUSH, S.InHostFirstDomain, 0, null],
    [p_iseqC, '@', A_PUSH, S.InEmail, 0, null],
    [null, '', A_POP, N, 0, null],
  ],
  [S.InHostDomain]: [
    [p_isEOF, '', A_BINGO | A_CLRALL, S.Base, T.HOST, null],
    [p_isasclet, '', A_NEXT, S.InHostDomain, 0, null],
    [p_isdigit, '', A_PUSH, S.InHost, 0, null],
    [p_iseqC, ':', A_PUSH, S.InPortFirst, 0, null],
    [p_iseqC, '-', A_PUSH, S.InHostFirstAN, 0, null],
    [p_iseqC, '_', A_PUSH, S.InHostFirstAN, 0, null],
    [p_iseqC, '.', A_PUSH, S.InHostFirstDomain, 0, null],
    [p_iseqC, '@', A_PUSH, S.InEmail, 0, null],
    [p_isdigit, '', A_POP, N, 0, null],
    [p_isstophost, '', A_BINGO | A_CLRALL, S.InURLPathStart, T.HOST, null],
    [p_iseqC, '/', A_PUSH, S.InFURL, 0, null],
    [null, '', A_BINGO | A_CLRALL, S.Base, T.HOST, null],
  ],
  [S.InPortFirst]: [
    [p_isEOF, '', A_POP, N, 0, null],
    [p_isdigit, '', A_NEXT, S.InPort, 0, null],
    [null, '', A_POP, N, 0, null],
  ],
  [S.InPort]: [
    [p_isEOF, '', A_BINGO | A_CLRALL, S.Base, T.HOST, null],
    [p_isdigit, '', A_NEXT, S.InPort, 0, null],
    [p_isstophost, '', A_BINGO | A_CLRALL, S.InURLPathStart, T.HOST, null],
    [p_iseqC, '/', A_PUSH, S.InFURL, 0, null],
    [null, '', A_BINGO | A_CLRALL, S.Base, T.HOST, null],
  ],
  [S.InHostFirstAN]: [
    [p_isEOF, '', A_POP, N, 0, null],
    [p_isdigit, '', A_NEXT, S.InHost, 0, null],
    [p_isasclet, '', A_NEXT, S.InHost, 0, null],
    [null, '', A_POP, N, 0, null],
  ],
  [S.InHost]: [
    [p_isEOF, '', A_POP, N, 0, null],
    [p_isdigit, '', A_NEXT, S.InHost, 0, null],
    [p_isasclet, '', A_NEXT, S.InHost, 0, null],
    [p_iseqC, '@', A_PUSH, S.InEmail, 0, null],
    [p_iseqC, '.', A_PUSH, S.InHostFirstDomain, 0, null],
    [p_iseqC, '-', A_PUSH, S.InHostFirstAN, 0, null],
    [p_iseqC, '_', A_PUSH, S.InHostFirstAN, 0, null],
    [null, '', A_POP, N, 0, null],
  ],
  [S.InEmail]: [
    [p_isstophost, '', A_POP, N, 0, null],
    [p_ishost, '', A_BINGO | A_CLRALL, S.Base, T.EMAIL, null],
    [null, '', A_POP, N, 0, null],
  ],
  [S.InFileFirst]: [
    [p_isEOF, '', A_POP, N, 0, null],
    [p_isasclet, '', A_NEXT, S.InFile, 0, null],
    [p_isdigit, '', A_NEXT, S.InFile, 0, null],
    [p_iseqC, '.', A_NEXT, S.InPathFirst, 0, null],
    [p_iseqC, '_', A_NEXT, S.InFile, 0, null],
    [p_iseqC, '~', A_PUSH, S.InFileTwiddle, 0, null],
    [null, '', A_POP, N, 0, null],
  ],
  [S.InFileTwiddle]: [
    [p_isEOF, '', A_POP, N, 0, null],
    [p_isasclet, '', A_NEXT, S.InFile, 0, null],
    [p_isdigit, '', A_NEXT, S.InFile, 0, null],
    [p_iseqC, '_', A_NEXT, S.InFile, 0, null],
    [p_iseqC, '/', A_NEXT, S.InFileFirst, 0, null],
    [null, '', A_POP, N, 0, null],
  ],
  [S.InPathFirst]: [
    [p_isEOF, '', A_POP, N, 0, null],
    [p_isasclet, '', A_NEXT, S.InFile, 0, null],
    [p_isdigit, '', A_NEXT, S.InFile, 0, null],
    [p_iseqC, '_', A_NEXT, S.InFile, 0, null],
    [p_iseqC, '.', A_NEXT, S.InPathSecond, 0, null],
    [p_iseqC, '/', A_NEXT, S.InFileFirst, 0, null],
    [null, '', A_POP, N, 0, null],
  ],
  [S.InPathFirstFirst]: [
    [p_isEOF, '', A_POP, N, 0, null],
    [p_iseqC, '.', A_NEXT, S.InPathSecond, 0, null],
    [p_iseqC, '/', A_NEXT, S.InFileFirst, 0, null],
    [null, '', A_POP, N, 0, null],
  ],
  [S.InPathSecond]: [
    [p_isEOF, '', A_BINGO | A_CLEAR, S.Base, T.FILEPATH, null],
    [p_iseqC, '/', A_NEXT | A_PUSH, S.InFileFirst, 0, null],
    [p_iseqC, '/', A_BINGO | A_CLEAR, S.Base, T.FILEPATH, null],
    [p_isspace, '', A_BINGO | A_CLEAR, S.Base, T.FILEPATH, null],
    [null, '', A_POP, N, 0, null],
  ],
  [S.InFile]: [
    [p_isEOF, '', A_BINGO, S.Base, T.FILEPATH, null],
    [p_isasclet, '', A_NEXT, S.InFile, 0, null],
    [p_isdigit, '', A_NEXT, S.InFile, 0, null],
    [p_iseqC, '.', A_PUSH, S.InFileNext, 0, null],
    [p_iseqC, '_', A_NEXT, S.InFile, 0, null],
    [p_iseqC, '-', A_NEXT, S.InFile, 0, null],
    [p_iseqC, '/', A_PUSH, S.InFileFirst, 0, null],
    [null, '', A_BINGO, S.Base, T.FILEPATH, null],
  ],
  [S.InFileNext]: [
    [p_isEOF, '', A_POP, N, 0, null],
    [p_isasclet, '', A_CLEAR, S.InFile, 0, null],
    [p_isdigit, '', A_CLEAR, S.InFile, 0, null],
    [p_iseqC, '_', A_CLEAR, S.InFile, 0, null],
    [null, '', A_POP, N, 0, null],
  ],
  [S.InURLPathFirst]: [
    [p_isEOF, '', A_POP, N, 0, null],
    [p_isurlchar, '', A_NEXT, S.InURLPath, 0, null],
    [null, '', A_POP, N, 0, null],
  ],
  [S.InURLPathStart]: [[null, '', A_NEXT, S.InURLPath, 0, null]],
  [S.InURLPath]: [
    [p_isEOF, '', A_BINGO, S.Base, T.URLPATH, null],
    [p_isurlchar, '', A_NEXT, S.InURLPath, 0, null],
    [null, '', A_BINGO, S.Base, T.URLPATH, null],
  ],
  [S.InFURL]: [
    [p_isEOF, '', A_POP, N, 0, null],
    [p_isURLPath, '', A_BINGO | A_CLRALL, S.Base, T.URL, SpecialFURL],
    [null, '', A_POP, N, 0, null],
  ],
  [S.InProtocolFirst]: [
    [p_isEOF, '', A_POP, N, 0, null],
    [p_iseqC, '/', A_NEXT, S.InProtocolSecond, 0, null],
    [null, '', A_POP, N, 0, null],
  ],
  [S.InProtocolSecond]: [
    [p_isEOF, '', A_POP, N, 0, null],
    [p_iseqC, '/', A_NEXT, S.InProtocolEnd, 0, null],
    [null, '', A_POP, N, 0, null],
  ],
  [S.InProtocolEnd]: [[null, '', A_BINGO | A_CLRALL, S.Base, T.PROTOCOL, null]],
  [S.InHyphenAsciiWordFirst]: [
    [p_isEOF, '', A_POP, N, 0, null],
    [p_isasclet, '', A_NEXT, S.InHyphenAsciiWord, 0, null],
    [p_isalpha, '', A_NEXT, S.InHyphenWord, 0, null],
    [p_isdigit, '', A_NEXT, S.InHyphenDigitLookahead, 0, null],
    [null, '', A_POP, N, 0, null],
  ],
  [S.InHyphenAsciiWord]: [
    [p_isEOF, '', A_BINGO | A_CLRALL, S.InParseHyphen, T.ASCIIHWORD, SpecialHyphen],
    [p_isasclet, '', A_NEXT, S.InHyphenAsciiWord, 0, null],
    [p_isalpha, '', A_NEXT, S.InHyphenWord, 0, null],
    [p_isspecial, '', A_NEXT, S.InHyphenWord, 0, null],
    [p_isdigit, '', A_NEXT, S.InHyphenNumWord, 0, null],
    [p_iseqC, '-', A_PUSH, S.InHyphenAsciiWordFirst, 0, null],
    [null, '', A_BINGO | A_CLRALL, S.InParseHyphen, T.ASCIIHWORD, SpecialHyphen],
  ],
  [S.InHyphenWordFirst]: [
    [p_isEOF, '', A_POP, N, 0, null],
    [p_isalpha, '', A_NEXT, S.InHyphenWord, 0, null],
    [p_isdigit, '', A_NEXT, S.InHyphenDigitLookahead, 0, null],
    [null, '', A_POP, N, 0, null],
  ],
  [S.InHyphenWord]: [
    [p_isEOF, '', A_BINGO | A_CLRALL, S.InParseHyphen, T.HWORD, SpecialHyphen],
    [p_isalpha, '', A_NEXT, S.InHyphenWord, 0, null],
    [p_isspecial, '', A_NEXT, S.InHyphenWord, 0, null],
    [p_isdigit, '', A_NEXT, S.InHyphenNumWord, 0, null],
    [p_iseqC, '-', A_PUSH, S.InHyphenWordFirst, 0, null],
    [null, '', A_BINGO | A_CLRALL, S.InParseHyphen, T.HWORD, SpecialHyphen],
  ],
  [S.InHyphenNumWordFirst]: [
    [p_isEOF, '', A_POP, N, 0, null],
    [p_isalpha, '', A_NEXT, S.InHyphenNumWord, 0, null],
    [p_isdigit, '', A_NEXT, S.InHyphenDigitLookahead, 0, null],
    [null, '', A_POP, N, 0, null],
  ],
  [S.InHyphenNumWord]: [
    [p_isEOF, '', A_BINGO | A_CLRALL, S.InParseHyphen, T.NUMHWORD, SpecialHyphen],
    [p_isalnum, '', A_NEXT, S.InHyphenNumWord, 0, null],
    [p_isspecial, '', A_NEXT, S.InHyphenNumWord, 0, null],
    [p_iseqC, '-', A_PUSH, S.InHyphenNumWordFirst, 0, null],
    [null, '', A_BINGO | A_CLRALL, S.InParseHyphen, T.NUMHWORD, SpecialHyphen],
  ],
  [S.InHyphenDigitLookahead]: [
    [p_isEOF, '', A_POP, N, 0, null],
    [p_isdigit, '', A_NEXT, S.InHyphenDigitLookahead, 0, null],
    [p_isalpha, '', A_NEXT, S.InHyphenNumWord, 0, null],
    [p_isspecial, '', A_NEXT, S.InHyphenNumWord, 0, null],
    [null, '', A_POP, N, 0, null],
  ],
  [S.InParseHyphen]: [
    [p_isEOF, '', A_RERUN, S.Base, 0, null],
    [p_isasclet, '', A_NEXT, S.InHyphenAsciiWordPart, 0, null],
    [p_isalpha, '', A_NEXT, S.InHyphenWordPart, 0, null],
    [p_isdigit, '', A_PUSH, S.InHyphenUnsignedInt, 0, null],
    [p_iseqC, '-', A_PUSH, S.InParseHyphenHyphen, 0, null],
    [null, '', A_RERUN, S.Base, 0, null],
  ],
  [S.InParseHyphenHyphen]: [
    [p_isEOF, '', A_POP, N, 0, null],
    [p_isalnum, '', A_BINGO | A_CLEAR, S.InParseHyphen, T.SPACE, null],
    [p_isspecial, '', A_BINGO | A_CLEAR, S.InParseHyphen, T.SPACE, null],
    [null, '', A_POP, N, 0, null],
  ],
  [S.InHyphenWordPart]: [
    [p_isEOF, '', A_BINGO, S.Base, T.PARTHWORD, null],
    [p_isalpha, '', A_NEXT, S.InHyphenWordPart, 0, null],
    [p_isspecial, '', A_NEXT, S.InHyphenWordPart, 0, null],
    [p_isdigit, '', A_NEXT, S.InHyphenNumWordPart, 0, null],
    [null, '', A_BINGO, S.InParseHyphen, T.PARTHWORD, null],
  ],
  [S.InHyphenAsciiWordPart]: [
    [p_isEOF, '', A_BINGO, S.Base, T.ASCIIPARTHWORD, null],
    [p_isasclet, '', A_NEXT, S.InHyphenAsciiWordPart, 0, null],
    [p_isalpha, '', A_NEXT, S.InHyphenWordPart, 0, null],
    [p_isspecial, '', A_NEXT, S.InHyphenWordPart, 0, null],
    [p_isdigit, '', A_NEXT, S.InHyphenNumWordPart, 0, null],
    [null, '', A_BINGO, S.InParseHyphen, T.ASCIIPARTHWORD, null],
  ],
  [S.InHyphenNumWordPart]: [
    [p_isEOF, '', A_BINGO, S.Base, T.NUMPARTHWORD, null],
    [p_isalnum, '', A_NEXT, S.InHyphenNumWordPart, 0, null],
    [p_isspecial, '', A_NEXT, S.InHyphenNumWordPart, 0, null],
    [null, '', A_BINGO, S.InParseHyphen, T.NUMPARTHWORD, null],
  ],
  [S.InHyphenUnsignedInt]: [
    [p_isEOF, '', A_POP, N, 0, null],
    [p_isdigit, '', A_NEXT, N, 0, null],
    [p_isalpha, '', A_CLEAR, S.InHyphenNumWordPart, 0, null],
    [p_isspecial, '', A_CLEAR, S.InHyphenNumWordPart, 0, null],
    [null, '', A_POP, N, 0, null],
  ],
};

// --- motor (TParserGet) ---------------------------------------------------------------------

function newPosition(prev: Position | null): Position {
  if (!prev) return { pos: 0, charlen: 0, len: 0, state: S.Base, prev: null, pushedAt: -1 };
  return { pos: prev.pos, charlen: prev.charlen, len: prev.len, state: prev.state, prev, pushedAt: -1 };
}

function next(p: Parser): boolean {
  const end = p.chars.length;
  if (p.state.pos >= end) return false;
  p.tokenStart = p.state.pos;
  p.state.pushedAt = -1;
  let action: Action | null = null;

  while (p.state.pos <= end) {
    p.state.charlen = p.state.pos === end ? 0 : 1;
    const table = ACTIONS[p.state.state];
    let i: number;
    if (p.state.pushedAt >= 0) {
      i = p.state.pushedAt + 1;
      p.state.pushedAt = -1;
    } else i = 0;
    while (table[i][0]) {
      p.c = table[i][1];
      if (table[i][0]!(p)) break;
      i++;
    }
    action = table[i];
    const [, , flags, to, type, special] = action;

    if (special) special(p);

    if (flags & A_BINGO) {
      p.tokenLen = p.state.len;
      p.state.len = 0;
      p.type = type;
    }

    if (flags & A_POP) {
      p.state = p.state.prev!;
    } else if (flags & A_PUSH) {
      p.state.pushedAt = i;
      p.state = newPosition(p.state);
    } else if (flags & A_CLEAR) {
      p.state.prev = p.state.prev!.prev;
    } else if (flags & A_CLRALL) {
      p.state.prev = null;
    } else if (flags & A_MERGE) {
      const cur = p.state;
      p.state = cur.prev!;
      p.state.pos = cur.pos;
      p.state.charlen = cur.charlen;
      p.state.len = cur.len;
    }

    if (to !== S.Null) p.state.state = to;

    if (flags & A_BINGO || (p.state.pos >= end && !(flags & A_RERUN))) break;
    if (flags & (A_RERUN | A_POP)) continue;

    if (p.state.charlen) {
      p.state.pos++;
      p.state.len++;
    }
  }
  return !!action && (action[2] & A_BINGO) !== 0;
}

/** Quebra o texto em tokens, como `ts_parse('default', text)`. */
export function parse(text: string): Token[] {
  const chars = Array.from(text);
  const p: Parser = {
    chars,
    codes: chars.map((c) => c.codePointAt(0)!),
    start: 0,
    state: newPosition(null),
    ignore: false,
    wanthost: false,
    c: '',
    tokenStart: 0,
    tokenLen: 0,
    type: 0,
  };
  const out: Token[] = [];
  while (next(p)) out.push({ type: p.type, text: chars.slice(p.tokenStart, p.tokenStart + p.tokenLen).join('') });
  return out;
}
