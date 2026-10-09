// Renderizador do Markdown restrito (docs/content-format.md v1.0), usado só no build.
// CommonMark + tabelas GFM, HTML desabilitado salvo <u>, fórmulas com KaTeX (saída MathML,
// sem CSS nem fontes) e imagens `asset:<sha256>` resolvidas pelo campo `assets` da questão.
// Decisão 0005.

import MarkdownIt from 'markdown-it';
import type StateInline from 'markdown-it/lib/rules_inline/state_inline.mjs';
import type StateBlock from 'markdown-it/lib/rules_block/state_block.mjs';
import katex from 'katex';
import type { Asset } from './snapshot';

export interface RenderOptions {
  /** Imagens da questão (`assets` do contrato). */
  assets?: Asset[];
  /** `import.meta.env.BASE_URL`; prefixa as URLs das imagens. */
  base?: string;
  /**
   * Fórmula inline com `$...$`. Desligada até o emmoni confirmar a content-format v1.1
   * (`\$` = `$` literal): os dados reais têm centenas de `R$` e nenhuma fórmula.
   */
  inlineMath?: boolean;
}

const SHA256 = /^asset:([0-9a-f]{64})$/;

function tex(src: string, displayMode: boolean): string {
  return katex.renderToString(src, { displayMode, output: 'mathml', throwOnError: false });
}

// `<u>texto</u>`: a única tag aceita. Só abre se houver o fechamento no mesmo trecho inline.
function underline(state: StateInline, silent: boolean): boolean {
  const { src, pos } = state;
  if (!src.startsWith('<u>', pos)) return false;
  const end = src.indexOf('</u>', pos + 3);
  if (end < 0) return false;
  if (!silent) {
    const max = state.posMax;
    state.push('u_open', 'u', 1);
    state.pos = pos + 3;
    state.posMax = end;
    state.md.inline.tokenize(state);
    state.posMax = max;
    state.push('u_close', 'u', -1);
  }
  state.pos = end + 4;
  return true;
}

// `$x$` inline, na regra do pandoc: `$` de abertura seguido de não espaço, `$` de fechamento
// precedido de não espaço e não seguido de dígito. "R$ 5 e R$ 20" não vira fórmula.
function inlineMath(state: StateInline, silent: boolean): boolean {
  const { src, pos } = state;
  if (src[pos] !== '$' || src[pos + 1] === '$') return false;
  if (!src[pos + 1] || /\s/.test(src[pos + 1])) return false;
  let end = pos + 1;
  for (;;) {
    end = src.indexOf('$', end);
    if (end < 0 || end >= state.posMax) return false;
    if (src[end - 1] === '\\') {
      end++;
      continue;
    }
    if (/\s/.test(src[end - 1]) || /\d/.test(src[end + 1] ?? '')) return false;
    break;
  }
  if (!silent) state.push('math_inline', 'math', 0).content = src.slice(pos + 1, end);
  state.pos = end + 1;
  return true;
}

// `$$...$$` em bloco, numa linha ou em várias.
function blockMath(state: StateBlock, startLine: number, endLine: number, silent: boolean): boolean {
  const start = state.bMarks[startLine] + state.tShift[startLine];
  const first = state.src.slice(start, state.eMarks[startLine]).trim();
  if (!first.startsWith('$$')) return false;
  let body: string;
  let last = startLine;
  if (first.length > 4 && first.endsWith('$$')) {
    body = first.slice(2, -2);
  } else {
    const lines = [first.slice(2)];
    for (;;) {
      last++;
      if (last >= endLine) return false;
      const line = state.src.slice(state.bMarks[last] + state.tShift[last], state.eMarks[last]).trim();
      if (line.endsWith('$$')) {
        lines.push(line.slice(0, -2));
        break;
      }
      lines.push(line);
    }
    body = lines.join('\n');
  }
  if (silent) return true;
  state.line = last + 1;
  const token = state.push('math_block', 'math', 0);
  token.block = true;
  token.content = body.trim();
  token.map = [startLine, state.line];
  return true;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function createRenderer(inline: boolean): MarkdownIt {
  const md = new MarkdownIt('commonmark', { html: false, xhtmlOut: false, linkify: false, typographer: false });
  md.enable('table');
  // Proibidos pelo formato: saem como texto literal.
  md.disable(['heading', 'lheading', 'blockquote', 'fence', 'code', 'hr', 'reference', 'link', 'autolink']);
  md.inline.ruler.before('html_inline', 'underline', underline);
  md.block.ruler.before('paragraph', 'math_block', blockMath, { alt: ['paragraph'] });
  if (inline) md.inline.ruler.after('escape', 'math_inline', inlineMath);

  md.renderer.rules.math_inline = (tokens, idx) => tex(tokens[idx].content, false);
  md.renderer.rules.math_block = (tokens, idx) => `<div class="math">${tex(tokens[idx].content, true)}</div>\n`;
  // Tabela larga rola dentro da própria caixa, nunca a página (320 px).
  md.renderer.rules.table_open = () => '<div class="table-wrap" role="region" aria-label="Tabela" tabindex="0"><table>\n';
  md.renderer.rules.table_close = () => '</table></div>\n';

  md.renderer.rules.image = (tokens, idx, _opts, env: { assets: Map<string, Asset>; base: string }) => {
    const token = tokens[idx];
    const alt = token.children ? md.renderer.renderInlineAsText(token.children, md.options, env) : '';
    const sha = SHA256.exec(token.attrGet('src') ?? '')?.[1];
    const asset = sha ? env.assets.get(sha) : undefined;
    // Imagem fora de `asset:` (proibida) ou sem o arquivo: mostra só a descrição.
    if (!asset) return `<span class="img-missing">[Imagem: ${escapeHtml(alt || 'sem descrição')}]</span>`;
    const src = env.base.replace(/\/$/, '') + asset.url;
    const size = asset.width && asset.height ? ` width="${asset.width}" height="${asset.height}"` : '';
    return `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt || asset.alt_text || '')}"${size} loading="lazy" decoding="async">`;
  };
  return md;
}

const renderers = { block: createRenderer(false), inline: createRenderer(true) };

/** Markdown restrito → HTML seguro (sem HTML do autor além de `<u>`). */
export function renderMarkdown(src: string, opts: RenderOptions = {}): string {
  const md = opts.inlineMath ? renderers.inline : renderers.block;
  const assets = new Map((opts.assets ?? []).map((a) => [a.sha256, a]));
  return md.render(src, { assets, base: opts.base ?? '/' });
}

/**
 * Separa o comando do Cebraspe ("Com relação a X, julgue os itens a seguir.") do item, quando o
 * primeiro parágrafo do enunciado é esse comando (contrato §4). O texto não muda; só é exibido
 * em duas partes.
 */
export function splitCommand(statement: string): { command: string | null; item: string } {
  const at = statement.indexOf('\n\n');
  const first = at < 0 ? '' : statement.slice(0, at);
  if (!/\bjulgue\b/i.test(first) || first.includes('![')) return { command: null, item: statement };
  return { command: first, item: statement.slice(at + 2) };
}
