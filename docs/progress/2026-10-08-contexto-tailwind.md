# 2026-10-08 — Contexto na raiz e Tailwind CSS

## Feito
- `CLAUDE.md` removido; o contexto do agente é `AGENTS.md`, `MISSION.md` e `SPECIFICATION.md`, na
  raiz (decisão 0002). Referências atualizadas em AGENTS.md, README, subagente, scripts e docs.
- Tailwind CSS 4.3.3 (`tailwindcss`, `@tailwindcss/vite`) no `astro.config.mjs`; tokens em
  `src/styles/global.css`; página provisória convertida para classes utilitárias.
- SPECIFICATION.md: estrutura, stack (Estilo) e orçamento de CSS (≤ 20 KB gzip).

## Gates
- `npm run gates`: verde (check, testes, build). CSS da página: 1,9 KB gzip.

## Sem verificar
- Visual no navegador (claro e escuro) e deploy no Pages: só depois do merge.
