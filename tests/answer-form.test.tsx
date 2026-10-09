import { describe, expect, it } from 'vitest';
import { render } from 'preact-render-to-string';
import { AnswerForm, verdict, type AnswerFormProps } from '../src/components/AnswerForm';

const mc: AnswerFormProps = {
  id: 'q1',
  type: 'multiple_choice',
  choices: ['A', 'B', 'C', 'D'].map((letter) => ({ letter, html: `<p>Opção ${letter}</p>` })),
  answer: 'B',
  answerPreliminary: null,
  answerStatus: 'valid',
};
const tf: AnswerFormProps = { ...mc, type: 'true_false', choices: [], answer: 'E' };

describe('AnswerForm no build (sem JS)', () => {
  it('mostra todas as alternativas, inclusive com 4', () => {
    const html = render(<AnswerForm {...mc} />);
    expect(html.match(/type="radio"/g)).toHaveLength(4);
    for (const l of ['A', 'B', 'C', 'D']) expect(html).toContain(`<p>Opção ${l}</p>`);
    expect(html).not.toContain('value="E"');
  });

  it('certo/errado tem as duas opções com nome por extenso', () => {
    const html = render(<AnswerForm {...tf} />);
    expect(html).toContain('value="C"');
    expect(html).toContain('>Certo<');
    expect(html).toContain('>Errado<');
  });

  it('o botão fica desabilitado até o JS carregar e não vaza o gabarito', () => {
    const html = render(<AnswerForm {...mc} />);
    expect(html).toMatch(/<button type="submit"[^>]* disabled/);
    expect(html).not.toContain('gabarito');
  });
});

describe('verdict', () => {
  it('acerto e erro', () => {
    expect(verdict(mc, 'B')).toEqual(['Você acertou. Gabarito: B.']);
    expect(verdict(tf, 'C')).toEqual(['Você errou. Gabarito: Errado.']);
  });

  it('alterada: mostra o preliminar', () => {
    const v = verdict({ ...tf, answerStatus: 'changed', answerPreliminary: 'C' }, 'E');
    expect(v).toEqual(['Você acertou. Gabarito: Errado.', 'O gabarito foi alterado depois dos recursos: o preliminar era Certo.']);
  });

  it('válida com preliminar igual não fala de alteração', () => {
    expect(verdict({ ...mc, answerPreliminary: 'B' }, 'A')).toHaveLength(1);
  });

  it('anulada: nenhuma resposta conta, com ou sem preliminar', () => {
    const annulled = { ...tf, answer: null, answerStatus: 'annulled' as const };
    expect(verdict({ ...annulled, answerPreliminary: 'E' }, 'C')).toEqual([
      'Questão anulada pela banca: nenhuma resposta conta. O gabarito preliminar era Errado.',
    ]);
    expect(verdict({ ...annulled, answerPreliminary: null }, 'C')).toEqual([
      'Questão anulada pela banca: nenhuma resposta conta.',
    ]);
  });
});
