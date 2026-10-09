// Estado da busca na URL de /questoes/ (rotas e parâmetros em português, sem acento):
//   ?q=texto&banca=cebraspe&banca=fgv&orgao=pf&carreira=policia-civil&cargo=agente
//    &ano=2021-2024&disciplina=direito-penal&assunto=direito_penal.crimes_contra_o_patrimonio
//    &tipo=certo-errado&anuladas=1
// Listas aceitam o parâmetro repetido ou valores separados por vírgula. Valores inválidos são
// ignorados (o site não mostra erro por URL editada à mão).

import type { Filters, ListKey } from './engine';

export interface SearchState {
  filters: Filters;
  query: string;
}

export const PARAMS: Record<ListKey, string> = {
  exam_board: 'banca',
  agency: 'orgao',
  career: 'carreira',
  position: 'cargo',
  subject: 'disciplina',
  topic: 'assunto',
  type: 'tipo',
};

const TYPE_TO_URL: Record<string, string> = {
  multiple_choice: 'multipla-escolha',
  true_false: 'certo-errado',
  essay: 'discursiva',
};
const TYPE_FROM_URL = Object.fromEntries(Object.entries(TYPE_TO_URL).map(([k, v]) => [v, k]));

const SLUG = /^[a-z0-9][a-z0-9-]*$/;
const PATH = /^[A-Za-z0-9_-]+(\.[A-Za-z0-9_-]+)*$/;

function toUrlValue(key: ListKey, value: string): string {
  if (key === 'type') return TYPE_TO_URL[value] ?? value;
  if (key === 'career') return value.replace(/_/g, '-');
  return value;
}

function fromUrlValue(key: ListKey, value: string): string | null {
  if (key === 'type') return TYPE_FROM_URL[value] ?? null;
  if (key === 'topic') return PATH.test(value) ? value : null;
  if (!SLUG.test(value)) return null;
  return key === 'career' ? value.replace(/-/g, '_') : value;
}

function parseYear(raw: string | null): Filters['year'] {
  if (!raw) return undefined;
  const m = /^(\d{4})?(-)?(\d{4})?$/.exec(raw.trim());
  if (!m || (!m[1] && !m[3])) return undefined;
  const from = m[1] ? Number(m[1]) : undefined;
  const to = m[3] ? Number(m[3]) : m[2] ? undefined : from;
  const year: { from?: number; to?: number } = {};
  if (from !== undefined) year.from = from;
  if (to !== undefined) year.to = to;
  return year;
}

function formatYear(year: Filters['year']): string | null {
  if (!year || (year.from === undefined && year.to === undefined)) return null;
  if (year.from !== undefined && year.from === year.to) return String(year.from);
  return `${year.from ?? ''}-${year.to ?? ''}`;
}

export function parseSearchParams(params: URLSearchParams): SearchState {
  const filters: Filters = {};
  for (const [key, name] of Object.entries(PARAMS) as [ListKey, string][]) {
    const values = params
      .getAll(name)
      .flatMap((v) => v.split(','))
      .map((v) => fromUrlValue(key, v.trim()))
      .filter((v): v is string => !!v);
    if (values.length) filters[key] = [...new Set(values)];
  }
  const year = parseYear(params.get('ano'));
  if (year) filters.year = year;
  if (['1', 'sim'].includes(params.get('anuladas') ?? '')) filters.include_annulled = true;
  return { filters, query: (params.get('q') ?? '').slice(0, 300) };
}

export function toSearchParams({ filters, query }: SearchState): URLSearchParams {
  const params = new URLSearchParams();
  if (query.trim()) params.set('q', query.trim());
  for (const [key, name] of Object.entries(PARAMS) as [ListKey, string][])
    for (const v of filters[key] ?? []) params.append(name, toUrlValue(key, v));
  const year = formatYear(filters.year);
  if (year) params.set('ano', year);
  if (filters.include_annulled) params.set('anuladas', '1');
  return params;
}

/** Há algum filtro ou texto? */
export function isEmptyState({ filters, query }: SearchState): boolean {
  return !query.trim() && toSearchParams({ filters, query: '' }).toString() === '';
}
