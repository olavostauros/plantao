// Filtros e facetas do contrato (seções 2 e 3 de docs/contract.md) sobre o índice-base gerado no
// build. Puro: roda no build (página inicial sem JS) e no navegador. Decisão 0006.
//
// Semântica: listas = OU, chaves = E, lista vazia = sem filtro, `topic` inclui subassuntos,
// anuladas fora por padrão, facetas disjuntivas (cada faceta ignora o próprio filtro). Ordem dos
// resultados = ordem do índice (a do snapshot: ano decrescente, concurso, prova, número).

/** Filtros do contrato (seção 3). */
export interface Filters {
  exam_board?: string[];
  agency?: string[];
  career?: string[];
  position?: string[];
  year?: { from?: number; to?: number };
  subject?: string[];
  topic?: string[];
  type?: string[];
  include_annulled?: boolean;
}

export const LIST_KEYS = ['exam_board', 'agency', 'career', 'position', 'subject', 'topic', 'type'] as const;
export type ListKey = (typeof LIST_KEYS)[number];
export const FACETS = ['exam_board', 'agency', 'career', 'position', 'year', 'subject', 'topic', 'type'] as const;
export type Facet = (typeof FACETS)[number];

/** Saída de `api.facet_counts`. */
export interface FacetCounts {
  total: number;
  exam_board: { slug: string; name: string; short_name: string; count: number }[];
  agency: { slug: string; name: string; short_name: string; count: number }[];
  career: { value: string; count: number }[];
  position: { slug: string; name: string; count: number }[];
  year: { value: number; count: number }[];
  subject: { slug: string; name: string; count: number }[];
  topic: { path: string; name: string; count: number }[];
  type: { value: string; count: number }[];
}

export interface IndexExam {
  contest_slug: string;
  exam_slug: string;
  contest_name: string;
  exam_name: string;
  year: number;
  exam_board: number;
  agency: number;
  career: number;
  positions: number[];
  /** Questões desta prova no índice (contíguas, na ordem do índice). */
  count: number;
}

/**
 * Índice-base (indice/base.json). Dicionários na ordem da collation do banco (desempate das
 * facetas); colunas por questão na ordem dos resultados.
 */
export interface BaseIndex {
  format: 1;
  version: string;
  count: number;
  block_size: number;
  term_shards: number;
  exam_board: [slug: string, name: string, short_name: string][];
  agency: [slug: string, name: string, short_name: string][];
  career: string[];
  position: [slug: string, name: string][];
  subject: [slug: string, name: string][];
  topic: [path: string, name: string][];
  type: string[];
  exams: IndexExam[];
  subject_of: number[];
  type_of: number[];
  topics_of: number[][];
  /** Ordinais das questões anuladas. */
  annulled: number[];
}

/** Máscara do texto: 1 = a questão atende à busca textual; `null` = sem busca textual. */
export type TextMask = Uint8Array | null;

const isActive = (filters: Filters, key: Facet): boolean => {
  if (key === 'year') return !!filters.year && (filters.year.from !== undefined || filters.year.to !== undefined);
  const list = filters[key];
  return Array.isArray(list) && list.length > 0;
};

/** `path <@ ancestor` do ltree, sobre texto. */
export const isDescendant = (path: string, ancestor: string) => path === ancestor || path.startsWith(ancestor + '.');

export class SearchEngine {
  readonly n: number;
  private readonly examIds: Uint32Array;
  private readonly annulled: Uint8Array;
  /** Por questão: assuntos e todos os ancestrais existentes, sem repetir. */
  private readonly topicClosure: number[][];
  private readonly positionSlugRank: number[];
  private readonly positionSlugs: string[];

  constructor(readonly index: BaseIndex) {
    this.n = index.count;
    this.examIds = new Uint32Array(this.n);
    let ord = 0;
    index.exams.forEach((exam, e) => {
      for (let k = 0; k < exam.count; k++) this.examIds[ord++] = e;
    });
    this.annulled = new Uint8Array(this.n);
    for (const a of index.annulled) this.annulled[a] = 1;

    const byPath = new Map(index.topic.map(([path], i) => [path, i]));
    const ancestors = index.topic.map(([path]) => {
      const labels = path.split('.');
      const out: number[] = [];
      for (let k = 1; k <= labels.length; k++) {
        const t = byPath.get(labels.slice(0, k).join('.'));
        if (t !== undefined) out.push(t);
      }
      return out;
    });
    this.topicClosure = index.topics_of.map((ts) => [...new Set(ts.flatMap((t) => ancestors[t]))]);

    this.positionSlugs = [];
    const rank = new Map<string, number>();
    this.positionSlugRank = index.position.map(([slug]) => {
      if (!rank.has(slug)) {
        rank.set(slug, this.positionSlugs.length);
        this.positionSlugs.push(slug);
      }
      return rank.get(slug)!;
    });
  }

  isAnnulled(ord: number): boolean {
    return this.annulled[ord] === 1;
  }

  /** A prova de uma questão do índice. */
  examOf(ord: number): IndexExam {
    return this.index.exams[this.examIds[ord]];
  }

  /** Um teste por chave ativa. */
  private compile(filters: Filters): Map<Facet | 'annulled', (ord: number) => boolean> {
    const ix = this.index;
    const tests = new Map<Facet | 'annulled', (ord: number) => boolean>();
    const exam = (ord: number) => ix.exams[this.examIds[ord]];
    const idSet = (key: ListKey, dict: readonly (string | readonly string[])[]) => {
      const wanted = new Set(filters[key] as string[]);
      const ids = new Set<number>();
      dict.forEach((entry, i) => {
        if (wanted.has(typeof entry === 'string' ? entry : entry[0])) ids.add(i);
      });
      return ids;
    };
    if (isActive(filters, 'exam_board')) {
      const ids = idSet('exam_board', ix.exam_board);
      tests.set('exam_board', (o) => ids.has(exam(o).exam_board));
    }
    if (isActive(filters, 'agency')) {
      const ids = idSet('agency', ix.agency);
      tests.set('agency', (o) => ids.has(exam(o).agency));
    }
    if (isActive(filters, 'career')) {
      const ids = idSet('career', ix.career);
      tests.set('career', (o) => ids.has(exam(o).career));
    }
    if (isActive(filters, 'position')) {
      const ids = idSet('position', ix.position);
      tests.set('position', (o) => exam(o).positions.some((p) => ids.has(p)));
    }
    if (isActive(filters, 'year')) {
      const { from = -Infinity, to = Infinity } = filters.year!;
      tests.set('year', (o) => exam(o).year >= from && exam(o).year <= to);
    }
    if (isActive(filters, 'subject')) {
      const ids = idSet('subject', ix.subject);
      tests.set('subject', (o) => ids.has(ix.subject_of[o]));
    }
    if (isActive(filters, 'topic')) {
      const wanted = filters.topic!;
      const ids = new Set<number>();
      ix.topic.forEach(([path], i) => {
        if (wanted.some((w) => isDescendant(path, w))) ids.add(i);
      });
      tests.set('topic', (o) => ix.topics_of[o].some((t) => ids.has(t)));
    }
    if (isActive(filters, 'type')) {
      const ids = idSet('type', ix.type);
      tests.set('type', (o) => ids.has(ix.type_of[o]));
    }
    if (!filters.include_annulled) tests.set('annulled', (o) => this.annulled[o] === 0);
    return tests;
  }

  /** Ordinais das questões que atendem a tudo, na ordem dos resultados. */
  search(filters: Filters, text: TextMask = null): number[] {
    const tests = [...this.compile(filters).values()];
    const out: number[] = [];
    for (let o = 0; o < this.n; o++) {
      if (text && !text[o]) continue;
      if (tests.every((t) => t(o))) out.push(o);
    }
    return out;
  }

  /** `api.facet_counts`: cada faceta conta com todos os filtros menos o dela. */
  facets(filters: Filters, text: TextMask = null): FacetCounts {
    const ix = this.index;
    const tests = [...this.compile(filters)];
    const counts = {
      exam_board: new Uint32Array(ix.exam_board.length),
      agency: new Uint32Array(ix.agency.length),
      career: new Uint32Array(ix.career.length),
      position: new Uint32Array(this.positionSlugs.length),
      year: new Map<number, number>(),
      subject: new Uint32Array(ix.subject.length),
      topic: new Uint32Array(ix.topic.length),
      type: new Uint32Array(ix.type.length),
    };
    const positionName = new Int32Array(this.positionSlugs.length).fill(-1);
    let total = 0;

    for (let o = 0; o < this.n; o++) {
      if (text && !text[o]) continue;
      // Quantas chaves a questão não atende: com 0 conta em todas as facetas; com 1, só na
      // faceta dessa chave (a contagem dela ignora o próprio filtro); com 2 ou mais, em nenhuma.
      let failed: Facet | 'annulled' | null = null;
      let fails = 0;
      for (const [key, test] of tests) {
        if (!test(o)) {
          failed = key;
          if (++fails > 1) break;
        }
      }
      if (fails > 1 || failed === 'annulled') continue;
      if (fails === 0) total++;
      const want = (f: Facet) => fails === 0 || failed === f;
      const exam = ix.exams[this.examIds[o]];
      if (want('exam_board')) counts.exam_board[exam.exam_board]++;
      if (want('agency')) counts.agency[exam.agency]++;
      if (want('career')) counts.career[exam.career]++;
      if (want('position'))
        for (const p of exam.positions) {
          const r = this.positionSlugRank[p];
          counts.position[r]++;
          if (positionName[r] < 0 || p < positionName[r]) positionName[r] = p;
        }
      if (want('year')) counts.year.set(exam.year, (counts.year.get(exam.year) ?? 0) + 1);
      if (want('subject')) counts.subject[ix.subject_of[o]]++;
      if (want('topic')) for (const t of this.topicClosure[o]) counts.topic[t]++;
      if (want('type')) counts.type[ix.type_of[o]]++;
    }

    // Maior contagem primeiro; empate pela ordem do dicionário (collation do banco).
    const ranked = <T>(arr: Uint32Array, make: (i: number, count: number) => T) =>
      [...arr.keys()]
        .filter((i) => arr[i] > 0)
        .sort((a, b) => arr[b] - arr[a] || a - b)
        .map((i) => make(i, arr[i]));

    return {
      total,
      exam_board: ranked(counts.exam_board, (i, count) => {
        const [slug, name, short_name] = ix.exam_board[i];
        return { slug, name, short_name, count };
      }),
      agency: ranked(counts.agency, (i, count) => {
        const [slug, name, short_name] = ix.agency[i];
        return { slug, name, short_name, count };
      }),
      career: ranked(counts.career, (i, count) => ({ value: ix.career[i], count })),
      position: ranked(counts.position, (r, count) => ({
        slug: this.positionSlugs[r],
        name: ix.position[positionName[r]][1],
        count,
      })),
      year: [...counts.year].sort((a, b) => b[0] - a[0]).map(([value, count]) => ({ value, count })),
      subject: ranked(counts.subject, (i, count) => ({ slug: ix.subject[i][0], name: ix.subject[i][1], count })),
      topic: ranked(counts.topic, (i, count) => ({ path: ix.topic[i][0], name: ix.topic[i][1], count })),
      type: ranked(counts.type, (i, count) => ({ value: ix.type[i], count })),
    };
  }
}
