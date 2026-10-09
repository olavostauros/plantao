import { useEffect, useState } from 'preact/hooks';
import { Button } from './ui/Button';
import type { AnswerStatus, QuestionType } from '../lib/snapshot';

// Ilha de responder (A–E e Certo/Errado). No build sai como HTML com as alternativas legíveis;
// sem JS o botão fica desabilitado e o gabarito continua acessível no <details> da página.

export interface Choice {
  letter: string;
  /** HTML já renderizado no build (renderMarkdown); vazio em Certo/Errado. */
  html: string;
}

export interface AnswerFormProps {
  id: string;
  type: Exclude<QuestionType, 'essay'>;
  choices: Choice[];
  answer: string | null;
  answerPreliminary: string | null;
  answerStatus: AnswerStatus;
}

const TF_LABEL: Record<string, string> = { C: 'Certo', E: 'Errado' };

export function label(type: AnswerFormProps['type'], letter: string): string {
  return type === 'true_false' ? (TF_LABEL[letter] ?? letter) : letter;
}

/** Mensagem do resultado, sem depender de cor. */
export function verdict(
  p: Pick<AnswerFormProps, 'type' | 'answer' | 'answerPreliminary' | 'answerStatus'>,
  chosen: string,
): string[] {
  const l = (x: string) => label(p.type, x);
  if (p.answerStatus === 'annulled' || p.answer === null) {
    const pre = p.answerPreliminary ? ` O gabarito preliminar era ${l(p.answerPreliminary)}.` : '';
    return [`Questão anulada pela banca: nenhuma resposta conta.${pre}`];
  }
  const msgs = [
    chosen === p.answer ? `Você acertou. Gabarito: ${l(p.answer)}.` : `Você errou. Gabarito: ${l(p.answer)}.`,
  ];
  if (p.answerStatus === 'changed' && p.answerPreliminary)
    msgs.push(
      `O gabarito foi alterado depois dos recursos: o preliminar era ${l(p.answerPreliminary)}.`,
    );
  return msgs;
}

export function AnswerForm(p: AnswerFormProps) {
  const [ready, setReady] = useState(false);
  const [chosen, setChosen] = useState<string | null>(null);
  const [checked, setChecked] = useState<string | null>(null);
  useEffect(() => setReady(true), []);

  const letters = p.type === 'true_false' ? ['C', 'E'] : p.choices.map((c) => c.letter);
  const html = new Map(p.choices.map((c) => [c.letter, c.html]));
  const name = `resposta-${p.id}`;
  const legend = p.type === 'true_false' ? 'Julgue o item' : 'Alternativas';

  return (
    <form
      class="answer-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (chosen) setChecked(chosen);
      }}
    >
      <fieldset class="m-0 border-0 p-0">
        <legend class="mb-2 text-base font-semibold text-muted">{legend}</legend>
        <ul class={p.type === 'true_false' ? 'flex flex-wrap gap-3' : 'flex flex-col gap-3'}>
          {letters.map((letter) => {
            // Anulada (answer null): sem certo nem errado.
            const graded = checked !== null && p.answer !== null;
            const isAnswer = graded && letter === p.answer;
            const isWrongPick = graded && checked === letter && letter !== p.answer;
            const state = isAnswer ? 'ok' : isWrongPick ? 'bad' : undefined;
            return (
              <li key={letter} data-state={state} class="choice">
                <label class="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border-2 border-line px-3 py-2">
                  <input
                    type="radio"
                    name={name}
                    value={letter}
                    checked={chosen === letter}
                    onChange={() => {
                      setChosen(letter);
                      setChecked(null);
                    }}
                    class="mt-1.5 size-5 shrink-0 accent-fg"
                  />
                  <span class="font-bold">{label(p.type, letter)}</span>
                  {html.get(letter) && (
                    <span class="md min-w-0 flex-1" dangerouslySetInnerHTML={{ __html: html.get(letter)! }} />
                  )}
                  {isAnswer && <span class="ml-auto shrink-0 font-semibold text-ok">✓ gabarito</span>}
                  {isWrongPick && <span class="ml-auto shrink-0 font-semibold text-bad">✗ sua resposta</span>}
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>
      <div class="mt-4 flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={!ready || !chosen}>
          Conferir resposta
        </Button>
        {ready && !chosen && <span class="text-base text-muted">Escolha uma opção.</span>}
      </div>
      <div aria-live="polite" class="mt-4">
        {checked &&
          verdict(p, checked).map((m, i) => (
            <p key={i} class={i === 0 ? 'm-0 text-xl font-bold' : 'mt-2 mb-0'}>
              {m}
            </p>
          ))}
      </div>
    </form>
  );
}
