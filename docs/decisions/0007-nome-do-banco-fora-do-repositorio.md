# 0007 — O nome do projeto do banco de questões fica fora do repositório público

## Contexto

O Plantão é público; o banco de questões vem de um projeto privado. O nome desse projeto aparecia
em documentos, scripts, testes, fixtures e nos endereços fictícios do seed (que chegavam ao site),
e os scripts traziam como padrão uma string de conexão com papel e senha do docker local.

## Decisão

- Os textos falam em "banco de questões" ou "base de origem", sem o nome.
- Os scripts leem `SOURCE_DATABASE_URL`, `SOURCE_ASSETS_DIR`, `SOURCE_FIXTURES_DATABASE_URL` e
  `SOURCE_DB_CONTAINER`, sem valor padrão: sem a variável, param com uma mensagem clara.
- O `export-snapshot.mjs` troca o host `.invalid` dos documentos do seed por
  `seed.plantao.invalid`; as fixtures de busca guardam `scope: "seed"` em vez do nome do banco.
- `npm run check:private` (`scripts/check-private-words.mjs`) falha se uma palavra da lista
  aparecer num arquivo versionado (conteúdo ou caminho) ou no `dist/`. A lista fica em
  `.private-words` (no `.gitignore`, nunca versionado) ou na variável `PRIVATE_WORDS`; no CI, ela
  vem do secret `PRIVATE_WORDS`. Roda no fim do `npm run gates`.

## Consequências

- Quem roda `npm run snapshot` ou `npm run fixtures:search` precisa definir as variáveis.
- Sem `.private-words` nem o secret, a checagem é pulada com aviso; o relatório nunca mostra a
  palavra, só a linha da lista.
