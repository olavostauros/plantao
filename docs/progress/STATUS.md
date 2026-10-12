# Status — atualizado em 2026-10-12

**Marco atual:** F2 — Busca e filtros **entregue** (PR `f2-busca`): `/questoes/` com paridade
testada contra `api.search_questions`/`api.facet_counts` (44 casos, 48 consultas, 65 vetores em
`tests/fixtures/search/`). Próximo: F3 — Provas e navegação.

## Em andamento
- Branch local `limpeza-nomes` (registro `2026-10-12-limpeza-nomes.md`, decisão 0007): o nome do
  projeto do banco de questões sai do repositório e do histórico. Reescrita do histórico e
  publicação dependem do dono, passo a passo; nada foi enviado ao GitHub.

## Próximos passos
1. Conferir `/questoes/` no site publicado (Lighthouse e teclado) depois do merge.
2. F3: `/provas/`, `/prova/<contest_slug>/<exam_slug>/`, entrada com atalhos (a busca já tem URL
   para atalhos, ex. `questoes/?banca=cebraspe&orgao=pf`).
3. Quando o banco de questões ampliar o seed: `npm run snapshot && npm run fixtures:search && npm test`
   (com `SOURCE_DATABASE_URL`, `SOURCE_ASSETS_DIR` e `SOURCE_FIXTURES_DATABASE_URL` definidas).
4. F5: índice-base em colunas binárias antes do escopo `all` (decisão 0006, consequências).
5. Quando o banco de questões confirmar a content-format v1.1: ligar `inlineMath` em `renderMarkdown`.

## Comunicação com o banco de questões
- Pedidos: `docs/requests/AAAA-MM-DD-<assunto>.md` + mensagem ao agente do banco de questões.
- Aberto: `2026-10-09-seed-busca.md` (seed com cargos repetidos, discursiva, vários assuntos,
  tokens do analisador). Aguardando também a content-format v1.1.
- Mudança na busca do banco de questões (`ext.pt_unaccent`, `md_plain`, `search_condition`) exige regravar as
  fixtures; o teste de paridade aponta a diferença.

## Bloqueios e perguntas em aberto
- Secret `PRIVATE_WORDS` no GitHub ainda não criado: sem ele o `check:private` é pulado no CI.
- Publicar as questões reais (`npm run snapshot -- --scope all`) depende de aprovação do dono.

## Números
- Snapshot: seed, 65 questões, 5 provas, 2 imagens (contrato v1.2, content-format v1.0)
- Página de questão: JS ≈ 11,6 KB gzip, CSS ≈ 3,3 KB gzip, LCP ≤ 1,0 s
- `/questoes/`: JS 25,9 KB gzip, CSS 3,8 KB gzip, LCP 1,5–1,7 s, Lighthouse 100 nas 4 categorias
- Site: https://olavostauros.github.io/plantao/
