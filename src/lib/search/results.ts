// Itens da lista de resultados: o índice-base dá prova, disciplina e tipo; os blocos dão id, número
// e trecho. Roda no build (página sem JS) e no navegador.

import type { SearchEngine } from './engine';
import type { Card } from './text';

export interface ResultItem {
  id: string;
  number: number;
  excerpt: string;
  exam_name: string;
  contest_name: string;
  year: number;
  exam_board: string;
  agency: string;
  subject: string;
  type: string;
  annulled: boolean;
}

export const blockOf = (ord: number, blockSize: number) => Math.floor(ord / blockSize);

export function resultItem(engine: SearchEngine, ord: number, card: Card): ResultItem {
  const ix = engine.index;
  const exam = engine.examOf(ord);
  return {
    id: card[0],
    number: card[1],
    excerpt: card[2],
    exam_name: exam.exam_name,
    contest_name: exam.contest_name,
    year: exam.year,
    exam_board: ix.exam_board[exam.exam_board][2],
    agency: ix.agency[exam.agency][2],
    subject: ix.subject[ix.subject_of[ord]][1],
    type: ix.type[ix.type_of[ord]],
    annulled: engine.isAnnulled(ord),
  };
}
