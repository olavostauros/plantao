import { describe, expect, it } from 'vitest';
import { renderMarkdown, splitCommand } from '../src/lib/markdown';
import type { Asset } from '../src/lib/snapshot';

const sha = 'a'.repeat(64);
const asset: Asset = {
  sha256: sha,
  url: `/assets/${sha}.svg`,
  mime_type: 'image/svg+xml',
  width: 400,
  height: 90,
  alt_text: 'Descrição do contrato.',
};
const r = (src: string, opts = {}) => renderMarkdown(src, opts).trim();

describe('renderMarkdown: elementos permitidos (content-format.md)', () => {
  it('parágrafos', () => {
    expect(r('Um.\n\nDois.')).toBe('<p>Um.</p>\n<p>Dois.</p>');
  });

  it('quebra de linha com \\ no fim da linha', () => {
    expect(r('Rua A, 10\\\nCentro')).toBe('<p>Rua A, 10<br>\nCentro</p>');
  });

  it('itálico e negrito', () => {
    expect(r('*habeas corpus* **não** é')).toBe('<p><em>habeas corpus</em> <strong>não</strong> é</p>');
  });

  it('sublinhado com <u>, inclusive com ênfase dentro', () => {
    expect(r('o termo <u>ontem</u> e <u>*hoje*</u>')).toBe(
      '<p>o termo <u>ontem</u> e <u><em>hoje</em></u></p>',
    );
  });

  it('<u> sem fechamento sai como texto', () => {
    expect(r('a <u>b')).toBe('<p>a &lt;u&gt;b</p>');
  });

  it('código inline', () => {
    expect(r('a fórmula `=SOMA(A1:A3)`')).toBe('<p>a fórmula <code>=SOMA(A1:A3)</code></p>');
  });

  it('listas com marcador e numeradas', () => {
    expect(r('- um\n- dois')).toBe('<ul>\n<li>um</li>\n<li>dois</li>\n</ul>');
    expect(r('1. um\n2. dois')).toBe('<ol>\n<li>um</li>\n<li>dois</li>\n</ol>');
  });

  it('tabela GFM com alinhamento, dentro de uma caixa rolável', () => {
    const html = r('| Mês | Autuações |\n|---|---:|\n| Janeiro | 200 |');
    expect(html).toContain('<div class="table-wrap" role="region" aria-label="Tabela" tabindex="0"><table>');
    expect(html).toContain('<th>Mês</th>');
    expect(html).toContain('<td style="text-align:right">200</td>');
    expect(html).toMatch(/<\/table><\/div>$/);
  });

  it('fórmula em bloco com $$ vira MathML, sem CSS nem fontes', () => {
    const html = r('$$\nx^2 + 1\n$$');
    expect(html).toMatch(/^<div class="math"><span class="katex"><math [^>]*display="block"/);
    expect(html).toContain('<msup><mi>x</mi><mn>2</mn></msup>');
    expect(r('$$x^2$$')).toContain('<msup>');
  });

  it('fórmula inline com $ só quando ligada (aguarda content-format v1.1)', () => {
    expect(r('vale $x^2$ aqui')).toBe('<p>vale $x^2$ aqui</p>');
    expect(r('vale $x^2$ aqui', { inlineMath: true })).toContain('<msup><mi>x</mi><mn>2</mn></msup>');
  });

  it('imagem asset: com URL sob o base, tamanho e alt', () => {
    expect(r(`![Cinco quadros.](asset:${sha})`, { assets: [asset], base: '/plantao/' })).toBe(
      `<p><img src="/plantao/assets/${sha}.svg" alt="Cinco quadros." width="400" height="90" loading="lazy" decoding="async"></p>`,
    );
  });

  it('imagem sem alt usa o alt_text do contrato', () => {
    expect(r(`![](asset:${sha})`, { assets: [asset] })).toContain('alt="Descrição do contrato."');
  });
});

describe('renderMarkdown: dinheiro não vira fórmula', () => {
  for (const inlineMath of [false, true]) {
    it(`"de R$ 5 e de R$ 20" sai como texto (inlineMath=${inlineMath})`, () => {
      expect(r('de R$ 5 e de R$ 20', { inlineMath })).toBe('<p>de R$ 5 e de R$ 20</p>');
      expect(r('de R$5 e de R$20', { inlineMath })).toBe('<p>de R$5 e de R$20</p>');
      expect(r('US$ 1.000,00 ou R$ 5.000,00', { inlineMath })).toBe('<p>US$ 1.000,00 ou R$ 5.000,00</p>');
    });
  }
});

describe('renderMarkdown: elementos proibidos saem como texto', () => {
  it('HTML além de <u>', () => {
    expect(r('<b>x</b> <script>alert(1)</script>')).toBe(
      '<p>&lt;b&gt;x&lt;/b&gt; &lt;script&gt;alert(1)&lt;/script&gt;</p>',
    );
    expect(r('<div>bloco</div>')).toBe('<p>&lt;div&gt;bloco&lt;/div&gt;</p>');
  });

  it('links e autolinks', () => {
    expect(r('[site](https://exemplo.com)')).toBe('<p>[site](https://exemplo.com)</p>');
    expect(r('<https://exemplo.com>')).toBe('<p>&lt;https://exemplo.com&gt;</p>');
    expect(r('veja https://exemplo.com')).not.toContain('<a');
  });

  it('cabeçalhos', () => {
    expect(r('# Título')).toBe('<p># Título</p>');
    expect(r('Título\n===')).toBe('<p>Título\n===</p>');
  });

  it('citações', () => {
    expect(r('> citado')).toBe('<p>&gt; citado</p>');
  });

  it('blocos de código cercados', () => {
    expect(r('```\ncódigo\n```')).not.toContain('<pre');
  });

  it('notas de rodapé e definições de referência', () => {
    expect(r('texto[^1]\n\n[^1]: nota')).not.toContain('<sup');
    expect(r('[a]\n\n[a]: https://exemplo.com')).not.toContain('<a');
  });

  it('imagem fora de asset: vira só a descrição', () => {
    expect(r('![um gráfico](https://exemplo.com/x.png)')).toBe(
      '<p><span class="img-missing">[Imagem: um gráfico]</span></p>',
    );
  });

  it('imagem asset: sem o arquivo vira só a descrição', () => {
    expect(r(`![figura](asset:${'b'.repeat(64)})`, { assets: [asset] })).toContain('[Imagem: figura]');
  });

  it('atributos não escapam do alt', () => {
    expect(r(`![a" onerror="x](asset:${sha})`, { assets: [asset] })).toContain('alt="a&quot; onerror=&quot;x"');
  });
});

describe('splitCommand', () => {
  it('separa o comando do Cebraspe do item', () => {
    expect(splitCommand('Com relação a X, julgue os itens a seguir.\n\nO item.')).toEqual({
      command: 'Com relação a X, julgue os itens a seguir.',
      item: 'O item.',
    });
  });

  it('não separa quando o primeiro parágrafo não é comando', () => {
    const s = `![figura](asset:${sha})\n\nConsiderando a figura, julgue.`;
    expect(splitCommand(s)).toEqual({ command: null, item: s });
    expect(splitCommand('Um só parágrafo.')).toEqual({ command: null, item: 'Um só parágrafo.' });
  });
});
