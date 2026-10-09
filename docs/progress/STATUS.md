# Status — atualizado em 2026-10-09

**Marco atual:** F1 — A questão (SPECIFICATION.md §6), entregue no PR `f1-questao`. Falta
conferir no ar e passar o Lighthouse antes de dar F1 por pronto.

## Em andamento
- Nada além do PR de F1 (registro: `2026-10-09-f1-questao.md`, decisão 0005).

## Próximos passos
1. Com o PR no ar: Lighthouse (Acessibilidade = 100) em uma questão de cada tipo, teste de
   teclado e leitor de tela no "Conferir", e captura da fixture longa a 320 px.
2. Quando o emmoni confirmar a content-format v1.1: ligar `inlineMath` em `renderMarkdown`.
3. F2 — busca e filtros em `/questoes/` (gravar casos de `api.search_questions` e
   `api.facet_counts` em `tests/fixtures/`).

## Comunicação com o emmoni
- Pedidos: `docs/requests/AAAA-MM-DD-<assunto>.md` + mensagem ao agente do emmoni (sessão local,
  quando aberta; senão, avisar o dono).
- Aguardando dele: confirmação da content-format v1.1 (`$` literal).

## Bloqueios e perguntas em aberto
- Publicar as questões reais (`npm run snapshot -- --scope all`) depende de aprovação do dono.

## Números
- Snapshot: seed, 65 questões, 5 provas, 2 imagens (contrato v1.2, content-format v1.0)
- Reais no emmoni (2026-10-09): 5.152 visíveis, só Cebraspe
- Página de questão: JS ≈ 11,6 KB gzip, CSS ≈ 3,3 KB gzip
- Site: https://olavostauros.github.io/plantao/
