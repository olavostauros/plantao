# 0006 — Busca no navegador: porte do PostgreSQL e índice fatiado

**Data:** 2026-10-09

## Contexto

F2 pede `/questoes/` com a semântica de `api.search_questions` e `api.facet_counts` (contrato,
seções 2 e 3), num site estático. A busca textual do emmoni é `websearch_to_tsquery` com a
configuração `ext.pt_unaccent` (analisador padrão, `unaccent` e Snowball português) sobre um vetor
`md_plain(enunciado) || alternativas || texto-base`. Aproximar isso (por exemplo, minúsculas e
remoção de acentos) daria resultados diferentes em hífens, números, stopwords, radicais e frases. O
índice precisa aguentar ≈ 100 mil questões e o orçamento de JS da busca é 60 KB gzip.

## Decisão

- **Porte fiel, não aproximação**, em `src/lib/search/`: o analisador `default` do PG 17 (tabelas de
  estados de `wparser_def.c`, linha a linha), os dicionários do `ext.pt_unaccent` (regras do
  `unaccent` e stopwords geradas de `tsearch_data` por `scripts/gen-pg-tsearch-data.mjs`; Snowball
  português 2.2.0, o do PG 17), `to_tsvector` com limites de posição e concatenação, e
  `websearch_to_tsquery` (tokenizador, precedência, limpeza de stopwords, operador de frase).
- **Filtros e facetas** num motor puro (`engine.ts`): uma passada para a busca e uma para as
  facetas disjuntivas (a questão que falha em só uma chave conta só na faceta dessa chave).
- **Ordem igual à do banco sem reimplementar a collation**: a lista de questões do snapshot já vem
  na ordem do contrato e os dicionários (bancas, órgãos, disciplinas, assuntos; cargos por slug e
  nome) na ordem `en_US.utf8` do banco; o desempate das facetas usa essa ordem.
- **Índice gerado no build**, servido como arquivos estáticos com `?v=<hash>`:
  `indice/base.json` (dicionários só com o que as questões usam, colunas por questão, provas),
  `indice/termos/<n>.json` (postings com posições, delta-codificadas, fatiadas por FNV-1a do lexema,
  ≈ 32 KB por fatia antes do gzip) e `indice/blocos/<n>.json` (id, número e trecho, 50 por bloco).
  O navegador baixa o base na primeira interação (ou na hora, se a URL tem filtros), as fatias dos
  lexemas da consulta e os blocos das questões visíveis.
- **Sem JS**: a página traz as 20 questões mais recentes e o aviso; o formulário só aparece com JS.
- **Paridade testada**: `npm run fixtures:search` grava, de um banco só com o seed (`emmoni_test`),
  44 casos de busca + facetas, 48 consultas e o vetor de cada questão; `tests/search-parity.test.ts`
  compara tudo.

## Consequências

- Medido: vetores iguais aos do PG nas 65 do seed e nas 5.152 reais (conferência local, nada
  gravado); stemmer igual à saída de referência do Snowball em 32.016 palavras; filtros e facetas
  iguais aos do banco em 7 combinações sobre as 100 mil questões sintéticas do `emmoni_bench`
  (busca 1–6 ms, facetas 3–12 ms).
- JS da página `/questoes/` ≈ 26 KB gzip (ilha ≈ 18,5 KB, Preact e runtime ≈ 7 KB), dos quais
  ≈ 5 KB são as regras do `unaccent`.
- Tamanhos: seed, base 2,3 KB gzip e 1 fatia; reais (5.152), base 33 KB gzip, 128 fatias de mediana
  7 KB gzip. Para 100 mil reais o base em JSON passaria de algumas centenas de KB: **F5** deve
  trocá-lo por colunas binárias (por exemplo, `Uint16Array` em base64) e medir de novo. O build
  leva ≈ 11 s para 100 mil questões.
- Mudou a configuração de busca do emmoni (dicionário, `md_plain`, pesos)? Regravar as fixtures; o
  teste de paridade falha e aponta onde.
- Diferenças conhecidas, fora do português: classes de caractere aproximam o glibc com propriedades
  Unicode do JS; a lista de sinais de escritas indianas de `p_isspecial` não foi portada; dentro de
  frases, só valores e `<N>` (o que o websearch gera) têm execução posicional.
- Valores inválidos na URL são ignorados em vez de erro `22023`.
