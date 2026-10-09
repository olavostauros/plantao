# Status — atualizado em 2026-10-09

**Marco atual:** F2 — Busca e filtros **entregue** (PR `f2-busca`): `/questoes/` com paridade
testada contra `api.search_questions`/`api.facet_counts` (44 casos, 48 consultas, 65 vetores em
`tests/fixtures/search/`). Próximo: F3 — Provas e navegação.

## Em andamento
- PR `f2-busca` (registro `2026-10-09-f2-busca.md`, decisão 0006).

## Próximos passos
1. Conferir `/questoes/` no site publicado (Lighthouse e teclado) depois do merge.
2. F3: `/provas/`, `/prova/<contest_slug>/<exam_slug>/`, entrada com atalhos (a busca já tem URL
   para atalhos, ex. `questoes/?banca=cebraspe&orgao=pf`).
3. Quando o emmoni ampliar o seed: `npm run snapshot && npm run fixtures:search && npm test`.
4. F5: índice-base em colunas binárias antes do escopo `all` (decisão 0006, consequências).
5. Quando o emmoni confirmar a content-format v1.1: ligar `inlineMath` em `renderMarkdown`.

## Comunicação com o emmoni
- Pedidos: `docs/requests/AAAA-MM-DD-<assunto>.md` + mensagem ao agente do emmoni.
- Aberto: `2026-10-09-seed-busca.md` (seed com cargos repetidos, discursiva, vários assuntos,
  tokens do analisador). Aguardando também a content-format v1.1.
- Mudança na busca do emmoni (`ext.pt_unaccent`, `md_plain`, `search_condition`) exige regravar as
  fixtures; o teste de paridade aponta a diferença.

## Bloqueios e perguntas em aberto
- Publicar as questões reais (`npm run snapshot -- --scope all`) depende de aprovação do dono.

## Números
- Snapshot: seed, 65 questões, 5 provas, 2 imagens (contrato v1.2, content-format v1.0)
- Página de questão: JS ≈ 11,6 KB gzip, CSS ≈ 3,3 KB gzip, LCP ≤ 1,0 s
- `/questoes/`: JS 25,9 KB gzip, CSS 3,8 KB gzip, LCP 1,5–1,7 s, Lighthouse 100 nas 4 categorias
- Site: https://olavostauros.github.io/plantao/
