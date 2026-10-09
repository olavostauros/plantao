// Textos da busca em português simples.

const CAREERS: Record<string, string> = {
  pf: 'Polícia Federal',
  prf: 'Polícia Rodoviária Federal',
  policia_civil: 'Polícia Civil',
  policia_militar: 'Polícia Militar',
  bombeiro_militar: 'Corpo de Bombeiros Militar',
  policia_penal: 'Polícia Penal',
  policia_legislativa: 'Polícia Legislativa',
  guarda_municipal: 'Guarda Municipal',
  policia_cientifica: 'Polícia Científica',
  outra: 'Outras carreiras',
};

/** Carreira desconhecida (versão nova do contrato) aparece como "outra" (contrato, seção 7). */
export const careerLabel = (value: string) => CAREERS[value] ?? CAREERS.outra;

const TYPES: Record<string, string> = {
  multiple_choice: 'Múltipla escolha',
  true_false: 'Certo ou errado',
  essay: 'Discursiva',
};
export const typeLabel = (value: string) => TYPES[value] ?? value;

const number = new Intl.NumberFormat('pt-BR');
export const formatCount = (n: number) => number.format(n);

/** "1 questão", "1.234 questões". */
export const questionsLabel = (n: number) => `${formatCount(n)} ${n === 1 ? 'questão' : 'questões'}`;

/** Frase da região viva: o que mudou na lista. */
export function resultsAnnouncement(total: number): string {
  if (total === 0) return 'Nenhuma questão encontrada.';
  return `${questionsLabel(total)} ${total === 1 ? 'encontrada' : 'encontradas'}.`;
}
