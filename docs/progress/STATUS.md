# Status — atualizado em 2026-10-09

**Marco atual:** F1 — A questão está **pronta** (no ar, critério do §6 cumprido, Lighthouse
Acessibilidade 100 em todos os casos do seed). Próximo: F2 — Busca e filtros.

## Em andamento
- PR `f1-acabamento` (favicon e tabelas a 320 px; registro `2026-10-09-f1-acabamento.md`).

## Próximos passos
1. F2 — busca e filtros em `/questoes/`: gravar casos de `api.search_questions` e
   `api.facet_counts` do emmoni em `tests/fixtures/` (precisa do Postgres do emmoni rodando).
2. Quando o emmoni confirmar a content-format v1.1: ligar `inlineMath` em `renderMarkdown`.
3. Quando houver acesso: conferir uma questão com NVDA ou TalkBack.

## Comunicação com o emmoni
- Pedidos: `docs/requests/AAAA-MM-DD-<assunto>.md` + mensagem ao agente do emmoni (sessão local,
  quando aberta; senão, avisar o dono).
- Aguardando dele: confirmação da content-format v1.1 (`$` literal).

## Bloqueios e perguntas em aberto
- Publicar as questões reais (`npm run snapshot -- --scope all`) depende de aprovação do dono.

## Números
- Snapshot: seed, 65 questões, 5 provas, 2 imagens (contrato v1.2, content-format v1.0)
- Reais no emmoni (2026-10-09): 5.152 visíveis, só Cebraspe
- Página de questão: JS ≈ 11,6 KB gzip, CSS ≈ 3,3 KB gzip, ≈ 22 KB transferidos, LCP ≤ 1,0 s
- Site: https://olavostauros.github.io/plantao/
