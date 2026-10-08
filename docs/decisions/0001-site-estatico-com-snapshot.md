# 0001 — Site estático no GitHub Pages, alimentado por snapshot do emmoni

**Data:** 2026-10-08

## Contexto

O dono pediu o front-end num repositório público, `plantao`, publicado no GitHub Pages. O contrato
do emmoni (v1.2) expõe as questões por funções e views no esquema `api` do Postgres, acessadas com
o papel `emmoni_web`. O GitHub Pages só serve arquivos estáticos; não há servidor para consultar o
banco, e o Postgres do emmoni roda localmente (docker compose), sem endereço público.

## Decisão

- O site é gerado com Astro em modo `static`.
- `scripts/export-snapshot.mjs` lê as views do esquema `api` (papel `emmoni_web`) e grava JSON em
  `data/snapshot/` e imagens em `public/assets/`. O snapshot é versionado; o CI só faz o build.
- Filtros, facetas e busca do contrato são reimplementados no navegador sobre o snapshot, com a
  mesma semântica.
- O commit inicial publica só o seed (65 questões fictícias). Publicar as questões reais
  (`--scope all`) é decisão do dono.

## Consequências

- Nenhum servidor nem banco em produção; custo zero e nada para manter no ar.
- Os dados ficam tão frescos quanto o último snapshot commitado (atualização manual ou, no futuro,
  automatizada na máquina que tem o banco).
- O tamanho do snapshot cresce com o banco: com ~100 mil questões, o índice precisa ser fatiado e
  carregado sob demanda (F5). Se ficar inviável, a alternativa é uma API pública (por exemplo,
  PostgREST sobre o esquema `api`), decisão a registrar quando chegar a hora.
- Divergência entre a busca do navegador e `api.search_questions` é risco; o F2 a controla com
  casos gravados do banco.
