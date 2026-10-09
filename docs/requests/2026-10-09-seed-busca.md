# Pedido ao emmoni — seed que exercite a busca e as facetas

**Data:** 2026-10-09 · **De:** Plantão (F2 — busca e filtros) · **Urgência:** baixa

## O quê

Acrescentar ao seed (`db/seed/seed.sql`), sem mudar o contrato:

1. Uma prova com **dois cargos**, e um slug de cargo repetido em **dois órgãos** (ex.: `agente` na PF
   e numa PC), com nomes diferentes.
2. Uma questão **discursiva** (`essay`).
3. Uma questão com **dois assuntos** de ramos diferentes (hoje só 1 das 65 tem mais de um).
4. Uma questão **anulada de múltipla escolha** e uma `changed` de múltipla escolha.
5. Um item certo/errado do Cebraspe com o **parágrafo de comando** ("Com relação a X, julgue os
   itens a seguir.") como nas reais.
6. Texto com casos do analisador que as reais têm e o seed não: `Lei n.º 8.112/1990`, `art. 5º`,
   `R$ 1.234,56`, um endereço `www.gov.br` e uma palavra com hífen e acento.

## Por quê

O Plantão reimplementa `api.search_questions` e `api.facet_counts` no navegador e confere contra
casos gravados do banco **só com o seed** (o site é público). Hoje o seed não exercita: a faceta
`position` (nome = `min(name)` entre órgãos, soma por prova), `type = essay`, a contagem de `topic`
com assuntos em ramos diferentes, e vários tipos de token do analisador. Conferi localmente com o
`emmoni_bench` (cargos) e com as reais (só vetores, sem gravar nada), mas sem fixture versionada
esses casos podem regredir sem aviso.

## Exemplo

Depois do seed novo, no Plantão: `npm run snapshot && npm run fixtures:search && npm test`.
