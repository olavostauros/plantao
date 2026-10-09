// Questão fictícia com os tamanhos máximos vistos nos dados reais (2026-10-09): enunciado com
// ≈ 3.900 caracteres e texto-base com ≈ 3.751. Serve para testar o layout; não é questão real.
import type { Question } from '../../src/lib/snapshot';
import { questions } from '../../src/lib/snapshot';

const sentence =
  'O agente público que, no exercício da função, deixa de praticar ato de ofício para satisfazer interesse pessoal responde pelo crime previsto na legislação penal. ';
const fill = (n: number) => sentence.repeat(Math.ceil(n / sentence.length)).slice(0, n).trim();

const base = questions.find((q) => q.type === 'true_false')!;

export const longQuestion: Question = {
  ...base,
  id: '00000000-0000-4000-8000-000000000001',
  statement_md: `Com relação ao texto, julgue os itens a seguir.\n\n${fill(3850)} Palavraextremamentelongasemespacoqueprecisaquebrarnatela320px.`,
  passage_id: '00000000-0000-4000-8000-000000000002',
  passage_md: `${fill(1800)}\n\n| Coluna larga com muito texto | Outra coluna larga | Terceira coluna |\n|---|---|---|\n| ${fill(60)} | ${fill(60)} | ${fill(60)} |\n\n${fill(1700)}`,
};
