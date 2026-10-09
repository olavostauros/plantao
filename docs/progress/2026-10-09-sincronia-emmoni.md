# 2026-10-09 — Sincronia com o agente do emmoni

## Feito
- Primeiro contato direto com o agente do emmoni (sessão local, a pedido do dono). Sem mudança de
  código.
- Versões confirmadas: contrato **v1.2** (2026-10-08) e `content-format.md` **v1.0**, iguais às
  cópias em `docs/`. Nenhuma mudança planejada no `api`. O M5 do emmoni (mais bancas) só traz valores
  novos de `exam_board_slug`.
- Protocolo combinado:
  - Pedidos do Plantão: arquivo em `docs/requests/AAAA-MM-DD-<assunto>.md` (o quê, por quê,
    exemplo) **e** uma mensagem ao agente do emmoni. Ele lê o arquivo, não escreve neste
    repositório e responde por mensagem.
  - Mudança de contrato ou de content-format: o emmoni avisa por mensagem com a versão nova, o que
    mudou e se é compatível. Mudança incompatível = versão maior + nota de migração no contrato.
  - `--scope all` continua dependendo da aprovação do dono.

## O que o emmoni informou sobre os dados reais (consulta ao `api` em 2026-10-09)
- 5.152 questões visíveis, só Cebraspe. Certo/errado: 2.863. Múltipla escolha: 2.162 com 5
  alternativas e 127 com 4. Anuladas: 250. **`changed`: 0**, só o seed exercita esse estado.
- `answer_preliminary` é `null` em 5.088: a tela precisa ficar boa sem preliminar (caso comum).
- `applied_on` é `null` em 4.919: não depender da data para ordenar nem exibir.
- Texto-base em 1.279 questões. Tamanhos: enunciado até 3.900 caracteres e texto-base até 3.751
  (no seed, no máximo 348 e 443).
- O enunciado de certo/errado começa pelo parágrafo de comando do Cebraspe.
- Elementos: negrito (82), itálico (≈ 119), lista (1). Imagem, tabela, sublinhado, código inline e
  fórmula: **0** nos reais. Só o seed os exercita. Imagens reais virão com a etapa `structure` do
  emmoni (sem data).
- `topics` e `source_url` sempre preenchidos.
- **`$` literal**: cerca de 190 ocorrências de `R$`/`US$` e zero fórmulas reais. O emmoni vai propor
  ao dono a content-format v1.1 (`\$` para `$` literal; só `$...$` não escapado é fórmula) e
  confirmará por mensagem.
- Defeitos publicados que o emmoni vai corrigir e tirar do `api` (não testar contra eles):
  `pmal-2021/oficial` q1–q4 (lixo de capa), `pf-2018/papiloscopista` q49 (`≥` como `$`),
  `pcpb-2021/...escrivao-de-policia` q62 (`$ E6`). Cerca de 16 provas serão reprocessadas e somem do
  `api` até a nova aprovação; os IDs são estáveis.

## Gates
Não rodados: só documentação.

## Sem verificar
- Os números acima vêm da mensagem do agente do emmoni, não de um snapshot nosso.
