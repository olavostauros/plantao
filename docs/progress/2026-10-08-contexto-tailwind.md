# 2026-10-08 — Contexto do agente em docs/ e Tailwind CSS

## Feito
- `CLAUDE.md` removido; na raiz fica só o `AGENTS.md`, e o resto do contexto do agente em `docs/`
  (`MISSION.md`, `SPECIFICATION.md`, renomeado de `SPECIFICATIONS.md`; decisão 0002). Referências atualizadas em AGENTS.md, README, subagente, scripts e docs.
- Tailwind CSS 4.3.3 (`tailwindcss`, `@tailwindcss/vite`) no `astro.config.mjs`; tokens em
  `src/styles/global.css`; página provisória convertida para classes utilitárias.
- docs/SPECIFICATION.md: estrutura, stack (Estilo) e orçamento de CSS (≤ 20 KB gzip).
- Automerge por label (decisão 0003): job `automerge` no `pages.yml` faz o merge com gates verdes e
  dispara o deploy; label `automerge` criada no repositório; regra no AGENTS.md e no subagente.
- `.claude/settings.json`: leituras frequentes e `gh pr create/edit` com a label `automerge`.

## Gates
- `npm run gates`: verde (check, testes, build). CSS da página: 1,9 KB gzip.

## Sem verificar
- Visual no navegador (claro e escuro) e deploy no Pages: só depois do merge.
