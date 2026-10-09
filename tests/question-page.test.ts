import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, it } from 'vitest';
import QuestionView from '../src/components/QuestionView.astro';
import { questions, type Question } from '../src/lib/snapshot';
import { longQuestion } from './fixtures/long-question';

let container: AstroContainer;
const view = (question: Question) => container.renderToString(QuestionView, { props: { question } });
const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

beforeAll(async () => {
  container = await AstroContainer.create();
  // A ilha de responder (Preact) também sai no HTML do build.
  const { getContainerRenderer } = await import('@astrojs/preact');
  const preact = getContainerRenderer();
  container.addServerRenderer({ renderer: (await import('@astrojs/preact/server.js')).default, name: preact.name });
  container.addClientRenderer({ name: preact.name, entrypoint: String(preact.clientEntrypoint) });
});

describe('página de questão sem JS', () => {
  it.each(questions.map((q) => [q.id, q] as const))('%s está completa', async (_id, q) => {
    const html = await view(q);
    expect(html).toContain(`Questão ${q.number}`);
    if (q.passage_md) expect(html).toContain('Texto-base');
    if (q.type === 'multiple_choice') expect(html.match(/type="radio"/g)).toHaveLength(q.options.length);
    if (q.type === 'true_false') expect(html.match(/type="radio"/g)).toHaveLength(2);
    expect(html).toContain('Ver gabarito');
    expect(html).toContain(`página ${q.source_page} do caderno`);
    if (q.source_url) expect(html).toContain(`href="${q.source_url}"`);
    for (const a of q.assets) expect(html).toContain(`src="/assets/${a.sha256}`);
    // Nada de Markdown cru: o renderizador tratou tudo.
    expect(text(html)).not.toMatch(/\*\*|!\[|\]\(asset:/);
  });

  it('alterada mostra o preliminar no gabarito; anulada avisa', async () => {
    const changed = questions.find((q) => q.answer_status === 'changed')!;
    expect(text(await view(changed))).toContain('Alterado depois dos recursos');
    const annulled = questions.find((q) => q.answer_status === 'annulled')!;
    expect(text(await view(annulled))).toContain('Questão anulada pela banca.');
  });

  it('texto longo (tamanho dos dados reais) sai inteiro, com o comando separado', async () => {
    const html = await view(longQuestion);
    expect(longQuestion.statement_md.length).toBeGreaterThan(3800);
    expect(longQuestion.passage_md!.length).toBeGreaterThan(3700);
    expect(html).toContain('<p>Com relação ao texto, julgue os itens a seguir.</p>');
    expect(html).toContain('Palavraextremamentelongasemespacoqueprecisaquebrarnatela320px.');
    expect(html).toContain('class="table-wrap"');
  });
});
