// Leitura do snapshot exportado do esquema `api` do emmoni (contrato v1.2, docs/contract.md).
// Os tipos espelham a seção 4 do contrato; campos novos de versões menores podem aparecer e
// devem ser ignorados.

import questionsJson from '../../data/snapshot/questions.json';
import catalogJson from '../../data/snapshot/catalog.json';
import metaJson from '../../data/snapshot/meta.json';

export type QuestionType = 'multiple_choice' | 'true_false' | 'essay';
export type AnswerStatus = 'valid' | 'changed' | 'annulled';

export interface Asset {
  sha256: string;
  url: string;
  mime_type: string;
  width: number | null;
  height: number | null;
  alt_text: string | null;
}

export interface Question {
  id: string;
  number: number;
  type: QuestionType;
  statement_md: string;
  options: { letter: string; body_md: string }[];
  answer: string | null;
  answer_preliminary: string | null;
  answer_status: AnswerStatus;
  passage_id: string | null;
  passage_md: string | null;
  assets: Asset[];
  exam_board_slug: string;
  exam_board_name: string;
  exam_board_short_name: string;
  agency_slug: string;
  agency_name: string;
  agency_short_name: string;
  career: string;
  government_level: string;
  state: string | null;
  contest_slug: string;
  contest_name: string;
  year: number;
  exam_slug: string;
  exam_name: string;
  applied_on: string | null;
  positions: { slug: string; name: string }[];
  subject_slug: string;
  subject_name: string;
  topics: { path: string; name: string }[];
  source_url: string | null;
  source_page: number;
}

export interface Exam {
  contest_slug: string;
  contest_name: string;
  year: number;
  agency_slug: string;
  exam_board_slug: string;
  exam_slug: string;
  exam_name: string;
  applied_on: string | null;
  positions: { slug: string; name: string }[];
  question_count: number;
  source_url: string | null;
}

export interface SnapshotMeta {
  contract_version: string;
  scope: 'seed' | 'all';
  exported_at: string;
  question_count: number;
  exam_count: number;
  asset_count: number;
}

export const questions = questionsJson as unknown as Question[];
export const exams = (catalogJson as unknown as { exam: Exam[] }).exam;
export const meta = metaJson as SnapshotMeta;

/** URL de uma imagem do contrato (`/assets/<sha>.<ext>`) sob o `base` do site. */
export function assetHref(contractUrl: string, base: string): string {
  return base.replace(/\/$/, '') + contractUrl;
}

/** Conta questões por chave, da maior contagem para a menor (empate: ordem alfabética). */
export function countBy<T>(items: T[], key: (item: T) => string): { value: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(key(item), (counts.get(key(item)) ?? 0) + 1);
  return [...counts]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value, 'pt-BR'));
}

const byExam = new Map<string, Question[]>();
for (const q of questions) {
  const key = `${q.contest_slug}/${q.exam_slug}`;
  if (!byExam.has(key)) byExam.set(key, []);
  byExam.get(key)!.push(q);
}
for (const list of byExam.values()) list.sort((a, b) => a.number - b.number);

/** Questões da mesma prova, na ordem original (inclui a própria). */
export function examQuestions(q: Pick<Question, 'contest_slug' | 'exam_slug'>): Question[] {
  return byExam.get(`${q.contest_slug}/${q.exam_slug}`) ?? [];
}
