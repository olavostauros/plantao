// Stemmer Snowball do português, versão 2.2.0 (a do PostgreSQL 17, dicionário `portuguese_stem`).
// Porte de https://snowballstem.org/algorithms/portuguese/stemmer.html conferido contra
// src/backend/snowball/libstemmer/stem_UTF_8_portuguese.c. Trabalha com code points.

const VOWELS = new Set('aeiouáéíóúâêô');
const isV = (c: string | undefined) => c !== undefined && VOWELS.has(c);

const STANDARD: Record<string, number> = {};
for (const [list, n] of [
  ['eza ezas ico ica icos icas ismo ismos ável ível ista istas oso osa osos osas amento amentos imento imentos adora ador aça~o adoras adores aço~es ante antes ância', 1],
  ['logia logias', 2],
  ['uça~o uço~es', 3],
  ['ência ências', 4],
  ['amente', 5],
  ['mente', 6],
  ['idade idades', 7],
  ['iva ivo ivas ivos', 8],
  ['ira iras', 9],
] as const)
  for (const s of list.split(' ')) STANDARD[s] = n;

const VERB = new Set(
  (
    'ada ida ia aria eria iria ará ara erá era irá ava asse esse isse aste este iste ei arei erei irei am iam ariam ' +
    'eriam iriam aram eram iram avam em arem erem irem assem essem issem ado ido ando endo indo ara~o era~o ira~o ar ' +
    'er ir as adas idas ias arias erias irias arás aras erás eras irás avas es ardes erdes irdes ares eres ires asses ' +
    'esses isses astes estes istes is ais eis íeis aríeis eríeis iríeis áreis areis éreis ereis íreis ireis ásseis ' +
    'ésseis ísseis áveis ados idos ámos amos íamos aríamos eríamos iríamos áramos éramos íramos ávamos emos aremos ' +
    'eremos iremos ássemos êssemos íssemos imos armos ermos irmos eu iu ou ira iras'
  ).split(' '),
);
const RESIDUAL = new Set(['os', 'a', 'i', 'o', 'á', 'í', 'ó']);
const AMENTE = new Set(['ic', 'ad', 'os', 'iv']);
const MENTE = new Set(['ante', 'avel', 'ível']);
const IDADE = new Set(['ic', 'abil', 'iv']);
const FORM = new Set(['e', 'ç', 'é', 'ê']);

class Env {
  s: string[];
  c = 0;
  lb = 0;
  bra = 0;
  ket = 0;
  pV = 0;
  p1 = 0;
  p2 = 0;
  constructor(word: string) {
    this.s = Array.from(word);
  }
  get l() {
    return this.s.length;
  }
  /** Maior sufixo da lista que termina no cursor (find_among_b); move o cursor para o início. */
  amongB(list: { has(k: string): boolean } | Record<string, number>, maxLen = 8): string | null {
    const has = (k: string) => (list instanceof Set ? list.has(k) : Object.hasOwn(list, k));
    for (let n = Math.min(maxLen, this.c - this.lb); n >= 1; n--) {
      const cand = this.s.slice(this.c - n, this.c).join('');
      if (has(cand)) {
        this.c -= n;
        return cand;
      }
    }
    return null;
  }
  /** Literal antes do cursor (backward); move o cursor. */
  eqB(lit: string): boolean {
    const t = Array.from(lit);
    if (this.c - this.lb < t.length) return false;
    for (let i = 0; i < t.length; i++) if (this.s[this.c - t.length + i] !== t[i]) return false;
    this.c -= t.length;
    return true;
  }
  sliceFrom(text: string) {
    const t = Array.from(text);
    const delta = t.length - (this.ket - this.bra);
    this.s.splice(this.bra, this.ket - this.bra, ...t);
    if (this.c >= this.ket) this.c += delta;
    else if (this.c > this.bra) this.c = this.bra;
    this.ket = this.bra + t.length;
  }
  del() {
    this.sliceFrom('');
  }
  RV() {
    return this.pV <= this.c;
  }
  R1() {
    return this.p1 <= this.c;
  }
  R2() {
    return this.p2 <= this.c;
  }
}

function markRegions(z: Env) {
  const s = z.s;
  const l = z.l;
  z.pV = z.p1 = z.p2 = l;
  // gopast: índice logo depois do primeiro caractere (a partir de i) que satisfaz o teste.
  const gopast = (i: number, test: (c: string | undefined) => boolean) => {
    for (; i < l; i++) if (test(s[i])) return i + 1;
    return -1;
  };
  const nonV = (c: string | undefined) => c !== undefined && !isV(c);
  let pv = -1;
  if (l >= 1) {
    if (isV(s[0])) {
      if (nonV(s[1])) pv = gopast(2, isV);
      if (pv < 0 && isV(s[1])) pv = gopast(2, nonV);
    }
    if (pv < 0 && nonV(s[0])) {
      if (nonV(s[1])) pv = gopast(2, isV);
      if (pv < 0 && isV(s[1])) pv = l >= 3 ? 3 : -1;
    }
  }
  if (pv >= 0) z.pV = pv;
  let i = gopast(0, isV);
  if (i < 0) return;
  i = gopast(i, nonV);
  if (i < 0) return;
  z.p1 = i;
  i = gopast(i, isV);
  if (i < 0) return;
  i = gopast(i, nonV);
  if (i < 0) return;
  z.p2 = i;
}

function standardSuffix(z: Env): boolean {
  z.ket = z.c;
  const m = z.amongB(STANDARD);
  if (!m) return false;
  z.bra = z.c;
  switch (STANDARD[m]) {
    case 1:
      if (!z.R2()) return false;
      z.del();
      break;
    case 2:
      if (!z.R2()) return false;
      z.sliceFrom('log');
      break;
    case 3:
      if (!z.R2()) return false;
      z.sliceFrom('u');
      break;
    case 4:
      if (!z.R2()) return false;
      z.sliceFrom('ente');
      break;
    case 5: {
      if (!z.R1()) return false;
      z.del();
      const save = z.l - z.c;
      z.ket = z.c;
      const m2 = z.amongB(AMENTE);
      if (!m2 || ((z.bra = z.c), !z.R2())) {
        z.c = z.l - save;
        break;
      }
      z.del();
      if (m2 === 'iv') {
        z.ket = z.c;
        if (!z.eqB('at')) {
          z.c = z.l - save;
          break;
        }
        z.bra = z.c;
        if (!z.R2()) {
          z.c = z.l - save;
          break;
        }
        z.del();
      }
      break;
    }
    case 6: {
      if (!z.R2()) return false;
      z.del();
      const save = z.l - z.c;
      z.ket = z.c;
      if (!z.amongB(MENTE)) {
        z.c = z.l - save;
        break;
      }
      z.bra = z.c;
      if (!z.R2()) {
        z.c = z.l - save;
        break;
      }
      z.del();
      break;
    }
    case 7: {
      if (!z.R2()) return false;
      z.del();
      const save = z.l - z.c;
      z.ket = z.c;
      if (!z.amongB(IDADE)) {
        z.c = z.l - save;
        break;
      }
      z.bra = z.c;
      if (!z.R2()) {
        z.c = z.l - save;
        break;
      }
      z.del();
      break;
    }
    case 8: {
      if (!z.R2()) return false;
      z.del();
      const save = z.l - z.c;
      z.ket = z.c;
      if (!z.eqB('at')) {
        z.c = z.l - save;
        break;
      }
      z.bra = z.c;
      if (!z.R2()) {
        z.c = z.l - save;
        break;
      }
      z.del();
      break;
    }
    case 9:
      if (!z.RV()) return false;
      if (!z.eqB('e')) return false;
      z.sliceFrom('ir');
      break;
  }
  return true;
}

function verbSuffix(z: Env): boolean {
  if (z.c < z.pV) return false;
  const lb = z.lb;
  z.lb = z.pV;
  z.ket = z.c;
  if (!z.amongB(VERB)) {
    z.lb = lb;
    return false;
  }
  z.bra = z.c;
  z.del();
  z.lb = lb;
  return true;
}

function residualSuffix(z: Env): boolean {
  z.ket = z.c;
  if (!z.amongB(RESIDUAL, 2)) return false;
  z.bra = z.c;
  if (!z.RV()) return false;
  z.del();
  return true;
}

function residualForm(z: Env) {
  z.ket = z.c;
  const m = z.amongB(FORM, 1);
  if (!m) return;
  z.bra = z.c;
  if (m === 'ç') {
    z.sliceFrom('c');
    return;
  }
  if (!z.RV()) return;
  z.del();
  z.ket = z.c;
  const save = z.l - z.c;
  let ok = false;
  if (z.eqB('u')) {
    z.bra = z.c;
    if (z.c > z.lb && z.s[z.c - 1] === 'g') ok = true;
  }
  if (!ok) {
    z.c = z.l - save;
    if (!z.eqB('i')) return;
    z.bra = z.c;
    if (!(z.c > z.lb && z.s[z.c - 1] === 'c')) return;
  }
  if (!z.RV()) return;
  z.del();
}

/** Radical de uma palavra já em minúsculas, como o `portuguese_stem` do PostgreSQL. */
export function stemPortuguese(word: string): string {
  const z = new Env(word.replace(/ã/g, 'a~').replace(/õ/g, 'o~'));
  markRegions(z);
  z.lb = 0;
  z.c = z.l;

  const m = z.l - z.c;
  if (standardSuffix(z) || ((z.c = z.l - m), verbSuffix(z))) {
    z.c = z.l;
    z.ket = z.c;
    if (z.eqB('i')) {
      z.bra = z.c;
      if (z.c > z.lb && z.s[z.c - 1] === 'c' && z.RV()) z.del();
    }
  } else {
    z.c = z.l - m;
    residualSuffix(z);
  }
  z.c = z.l;
  residualForm(z);
  return z.s.join('').replace(/a~/g, 'ã').replace(/o~/g, 'õ');
}
