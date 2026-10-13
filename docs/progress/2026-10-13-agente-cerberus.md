# 2026-10-13 — Agente de segurança (cerberus)

Branch `cerberus`, decisão 0008.

## Feito
- `.claude/agents/cerberus.md`: o auditor de segurança do Plantão, só leitura; escreve apenas o
  relatório.
- `docs/CYBERSECURITY.md`: ativos, ameaças, regras para todo agente, verificações (comandos),
  severidade, formato do relatório e contrato de correção (ids `P-NNN`).
- `docs/security/reports/README.md`; `data/security/` no `.gitignore` para achado grave ainda não
  publicável.
- `AGENTS.md`: o agente de front-end corrige os achados de código pelo contrato.

## Gates
`npm run gates` verde (astro check, vitest, build, `check:private` limpo com os arquivos novos).

## Sem verificar
- Nenhuma auditoria rodou ainda; o primeiro relatório é o próximo passo.
- Nada foi commitado: o commit assinado é do dono.
