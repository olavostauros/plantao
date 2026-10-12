# 2026-10-12 — Nome do banco de origem fora do repositório

## Feito
- Documentos, scripts, `src/`, testes e fixtures falam em "banco de questões" / "base de
  origem", sem o nome do projeto privado (27 arquivos). O registro da sincronia de 2026-10-09
  mudou de nome: `2026-10-09-sincronia-banco-de-questoes.md`.
- Scripts: variáveis `SOURCE_DATABASE_URL`, `SOURCE_ASSETS_DIR`, `SOURCE_FIXTURES_DATABASE_URL` e
  `SOURCE_DB_CONTAINER`, sem padrão (saem com código 2 e mensagem clara). Nenhuma string de
  conexão no código. Sem fallback para os nomes antigos: nada no repositório privado chama
  esses scripts nem define essas variáveis.
- `export-snapshot.mjs` troca o host `.invalid` do seed por `seed.plantao.invalid`. O
  snapshot commitado foi atualizado com a mesma transformação (conferido: aplicar a função ao
  JSON antigo dá byte a byte o novo). As fixtures de busca guardam `scope: "seed"`.
- `npm run check:private` (decisão 0007), no fim do `npm run gates`; CI lê o secret
  `PRIVATE_WORDS`.

## Gates
`npm run gates`: 0 erros, 270 testes, 67 páginas, `check:private` limpo.
`check:private` testado com um arquivo e um HTML em `dist/` contendo a palavra (falha, código 1),
pela variável (falha) e sem lista (pula).

## Sem verificar
- `npm run snapshot` e `npm run fixtures:search` contra o banco: o Postgres da base de origem não
  estava rodando. Só os caminhos de erro sem variáveis foram exercitados.
- O secret `PRIVATE_WORDS` não existe ainda no GitHub.
