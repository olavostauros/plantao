# Status — atualizado em 2026-10-13

**Marco atual:** F2 — Busca e filtros **entregue**. Próximo: F3 — Provas e navegação. Em paralelo,
correção dos achados da auditoria de segurança de 2026-10-13 (`Quem corrige: agente`).

## Em andamento
- Segurança: PR `seg-ci` (P-004 actions por SHA, P-005 `--match-head-commit`); PR `seg-astro`
  (P-002 Astro 7, junto com P-003 se couber). O relatório e o `docs/CYBERSECURITY.md` estão no
  branch `cerberus`, ainda fora do `main`: o `Estado` dos achados é atualizado quando ele entrar.

## Próximos passos
1. Achados de agente que faltam: P-006 (CSP), P-007 (SVG do snapshot), P-008 (testes de
   `javascript:`/`data:`/KaTeX sem `trust`).
2. Conferir `/questoes/` no site publicado (Lighthouse e teclado).
3. F3: `/provas/`, `/prova/<contest_slug>/<exam_slug>/`, entrada com atalhos (a busca já tem URL
   para atalhos, ex. `questoes/?banca=cebraspe&orgao=pf`).
4. Quando o banco de questões ampliar o seed: `npm run snapshot && npm run fixtures:search && npm test`
   (com `SOURCE_DATABASE_URL`, `SOURCE_ASSETS_DIR` e `SOURCE_FIXTURES_DATABASE_URL` definidas).
5. F5: índice-base em colunas binárias antes do escopo `all` (decisão 0006, consequências).
6. Quando o banco de questões confirmar a content-format v1.1: ligar `inlineMath` em `renderMarkdown`.

## Comunicação com o banco de questões
- Pedidos: `docs/requests/AAAA-MM-DD-<assunto>.md` + mensagem ao agente do banco de questões.
- Aberto: `2026-10-09-seed-busca.md` (seed com cargos repetidos, discursiva, vários assuntos,
  tokens do analisador). Aguardando também a content-format v1.1.
- Mudança na busca do banco de questões (`ext.pt_unaccent`, `md_plain`, `search_condition`) exige regravar as
  fixtures; o teste de paridade aponta a diferença.

## Bloqueios e perguntas em aberto
- Achados do dono na auditoria de 2026-10-13: P-001 (ruleset do `main`), P-009 (Actions),
  P-010 (alertas), P-011 (senha local no histórico), P-012 (wiki/projects).
- Publicar as questões reais (`npm run snapshot -- --scope all`) depende de aprovação do dono.

## Números
- Snapshot: seed, 65 questões, 5 provas, 2 imagens (contrato v1.2, content-format v1.0)
- Página de questão: JS ≈ 11,6 KB gzip, CSS ≈ 3,3 KB gzip, LCP ≤ 1,0 s
- `/questoes/`: JS 25,9 KB gzip, CSS 3,8 KB gzip, LCP 1,5–1,7 s, Lighthouse 100 nas 4 categorias
- Site: https://olavostauros.github.io/plantao/
