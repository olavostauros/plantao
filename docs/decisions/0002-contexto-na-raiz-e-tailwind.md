# 0002 — Contexto na raiz e Tailwind CSS

**Data:** 2026-10-08

## Contexto

O dono quer que o contexto do agente seja só `AGENTS.md` (o `CLAUDE.md`, que apenas importava o
`AGENTS.md`, foi removido), acompanhado de `MISSION.md` e `SPECIFICATION.md`. Também definiu a
stack: Astro, TypeScript e Tailwind CSS. Até aqui o estilo era CSS com escopo do Astro e variáveis
em `:root`.

## Decisão

- `docs/MISSION.md` → `MISSION.md` e `docs/SPECIFICATIONS.md` → `SPECIFICATION.md`, na raiz, ao lado
  do `AGENTS.md`. Os demais documentos (personas, contrato, formato, decisões, progresso) seguem em
  `docs/`.
- Estilo com **Tailwind CSS 4** pelo plugin `@tailwindcss/vite`, versão fixa. Tokens de cor e fonte
  em `@theme` no `src/styles/global.css`; o tema escuro troca os tokens por
  `prefers-color-scheme`.
- Novo orçamento: CSS por página ≤ 20 KB gzip.

## Consequências

- Tailwind roda só no build; não entra JS no navegador. O CSS gerado tem só as classes usadas
  (≈ 2 KB gzip na página provisória, contando o preflight).
- O preflight zera estilos padrão (listas, títulos, margens): todo elemento precisa de classe, e o
  conteúdo Markdown renderizado (F1) vai precisar de estilos próprios para `ul`, `ol`, `table` etc.,
  com `@layer` ou `<style>` do componente.
- Links e referências a `docs/MISSION.md` e `docs/SPECIFICATIONS.md` foram atualizados; os
  registros de progresso antigos ficam como estavam.
