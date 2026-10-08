import { describe, expect, it } from 'vitest';
import { assetHref, countBy, meta, questions } from '../src/lib/snapshot';

describe('snapshot', () => {
  it('bate com o meta e com o contrato', () => {
    expect(questions).toHaveLength(meta.question_count);
    expect(meta.contract_version.split('.')[0]).toBe('1');
  });

  it('tem gabarito válido para o tipo', () => {
    for (const q of questions) {
      if (q.answer_status === 'annulled') expect(q.answer).toBeNull();
      else if (q.type === 'true_false') expect(['C', 'E']).toContain(q.answer);
      else if (q.type === 'multiple_choice')
        expect(q.options.map((o) => o.letter)).toContain(q.answer);
    }
  });
});

describe('assetHref', () => {
  it('prefixa o base sem barra dupla', () => {
    expect(assetHref('/assets/abc.svg', '/plantao/')).toBe('/plantao/assets/abc.svg');
    expect(assetHref('/assets/abc.svg', '/')).toBe('/assets/abc.svg');
  });
});

describe('countBy', () => {
  it('ordena por contagem e depois por nome', () => {
    expect(countBy(['b', 'a', 'b', 'c', 'a'], (x) => x)).toEqual([
      { value: 'a', count: 2 },
      { value: 'b', count: 2 },
      { value: 'c', count: 1 },
    ]);
  });
});
