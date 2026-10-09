import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import Page from '../src/pages/questoes/index.astro';
import { excerpt } from '../src/lib/search/build';
import { splitCommand } from '../src/lib/markdown';
import { isEmptyState, parseSearchParams, toSearchParams } from '../src/lib/search/url';

const parse = (qs: string) => parseSearchParams(new URLSearchParams(qs));

describe('estado da busca na URL', () => {
  it('lê listas repetidas ou com vírgula, ano, tipo, carreira e anuladas', () => {
    expect(
      parse('banca=cebraspe&banca=fgv&orgao=pf,prf&ano=2021-2024&tipo=certo-errado&carreira=policia-civil&anuladas=1&q=furto'),
    ).toEqual({
      filters: {
        exam_board: ['cebraspe', 'fgv'],
        agency: ['pf', 'prf'],
        year: { from: 2021, to: 2024 },
        type: ['true_false'],
        career: ['policia_civil'],
        include_annulled: true,
      },
      query: 'furto',
    });
  });

  it('ano exato, aberto no começo ou no fim', () => {
    expect(parse('ano=2021').filters.year).toEqual({ from: 2021, to: 2021 });
    expect(parse('ano=2021-').filters.year).toEqual({ from: 2021 });
    expect(parse('ano=-2024').filters.year).toEqual({ to: 2024 });
    expect(parse('ano=abc').filters.year).toBeUndefined();
  });

  it('ignora valores inválidos e repetidos', () => {
    expect(parse('banca=CEBRASPE&banca=x y&tipo=outro&assunto=a..b&banca=fgv&banca=fgv').filters).toEqual({
      exam_board: ['fgv'],
    });
  });

  it('ida e volta', () => {
    const qs = 'q=pris%C3%A3o&banca=cebraspe&assunto=direito_penal.crimes_contra_o_patrimonio&tipo=multipla-escolha&ano=2021-2024&anuladas=1';
    expect(toSearchParams(parse(qs)).toString()).toBe(qs);
    expect(isEmptyState(parse(''))).toBe(true);
    expect(isEmptyState(parse('utm_source=x'))).toBe(true);
    expect(isEmptyState(parse('ano=2024'))).toBe(false);
  });
});

describe('trecho do enunciado', () => {
  it('corta numa palavra e tira a marcação', () => {
    expect(excerpt({ type: 'multiple_choice', statement_md: 'O **réu** foi *preso*.' })).toBe('O réu foi preso.');
    const long = excerpt({ type: 'multiple_choice', statement_md: 'palavra '.repeat(60) });
    expect(long.length).toBeLessThanOrEqual(181);
    expect(long.endsWith('palavra…')).toBe(true);
  });

  it('em certo/errado do Cebraspe, mostra o item, não o comando', () => {
    const statement_md = 'Com relação ao inquérito policial, julgue os itens a seguir.\n\nO inquérito é dispensável.';
    expect(splitCommand(statement_md).command).not.toBeNull();
    expect(excerpt({ type: 'true_false', statement_md })).toBe('O inquérito é dispensável.');
  });
});

describe('/questoes/ sem JS', () => {
  it('traz as primeiras questões com link e avisa que a busca precisa de JS', async () => {
    const container = await AstroContainer.create();
    const { getContainerRenderer } = await import('@astrojs/preact');
    const preact = getContainerRenderer();
    container.addServerRenderer({ renderer: (await import('@astrojs/preact/server.js')).default, name: preact.name });
    container.addClientRenderer({ name: preact.name, entrypoint: String(preact.clientEntrypoint) });
    const html = await container.renderToString(Page);
    expect(html.match(/href="\/questao\/[0-9a-f-]+\/"/g)).toHaveLength(20);
    expect(html).toContain('A busca e os filtros precisam de JavaScript');
    expect(html).toMatch(/64 questões/); // 65 do seed menos a anulada
    expect(html).toContain('role="status"');
  });
});
