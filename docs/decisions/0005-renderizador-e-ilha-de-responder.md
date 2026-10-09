# 0005 — Renderizador do Markdown restrito e ilha de responder

**Data:** 2026-10-09

## Contexto

F1 precisa renderizar no build o formato do `content-format.md` (v1.0) e deixar o usuário
responder sem recarregar a página, dentro de 30 KB gzip de JS e 20 KB de CSS. Os dados reais têm
≈ 190 `R$`/`US$` e nenhuma fórmula; a v1.1 do formato (`\$` = `$` literal) ainda não foi
confirmada pelo emmoni.

## Decisão

- **markdown-it 14** (preset `commonmark`, `html: false`) + tabelas GFM, em `src/lib/markdown.ts`.
  Cabeçalhos, citações, blocos de código, `hr`, links, autolinks e definições de referência
  ficam desligados: saem como texto literal. Regras próprias para `<u>` (só com fechamento) e
  para `$$...$$` em bloco.
- **KaTeX com saída MathML** (`output: 'mathml'`): nenhum CSS ou fonte extra no navegador.
- **`$` inline desligado** por padrão (`inlineMath: false`). Já existe, na regra do pandoc
  (`$` colado ao conteúdo, fechamento não seguido de dígito), para ligar quando a v1.1 sair.
- Imagens só por `asset:<sha256>` presente em `assets`, com `width`/`height`, `alt` e
  `loading="lazy"`; o resto vira "[Imagem: descrição]". Tabelas numa caixa rolável própria.
- Comando do Cebraspe: em certo/errado, se o primeiro parágrafo contém "julgue", é exibido
  separado (mesmo texto, sem alterar).
- **Ilha de responder** `AnswerForm` (Preact, `client:load`): as alternativas saem no HTML do
  build como `radio`s legíveis; sem JS, o botão "Conferir" fica desabilitado e o gabarito está
  num `<details>` "Ver gabarito". Resultado em texto (não só cor) numa região `aria-live`.

## Consequências

- JS da página de questão ≈ 11,6 KB gzip (Preact, hooks, signals do Astro, ilha); CSS ≈ 3,3 KB.
- O HTML das alternativas vai duas vezes na página (HTML e props da ilha); pequeno nas reais.
- Ao confirmar a v1.1, ligar `inlineMath` e tratar `\$` (já é escape do CommonMark).
