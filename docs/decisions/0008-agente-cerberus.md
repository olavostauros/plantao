# 0008 — Agente de segurança (cerberus)

**Data:** 2026-10-13

## Contexto

O Plantão é público e publica sozinho: com a label `automerge`, gates verdes levam o PR ao `main`
e ao Pages (decisão 0003). O conteúdo das questões vira HTML (decisão 0005) e o nome do banco de
origem não pode vazar (decisão 0007). Ninguém audita isso de forma sistemática.

## Decisão

- Um segundo agente, o **cerberus** (`.claude/agents/cerberus.md`), audita repositório, CI,
  configuração do GitHub e site publicado. Só lê; escreve apenas o relatório.
- O contrato fica em `docs/CYBERSECURITY.md`: ativos, ameaças, regras para todo agente,
  verificações, severidade e formato do relatório.
- Relatórios em `docs/security/reports/`, ids `P-NNN` estáveis entre relatórios. Achado grave fica
  fora do git (`data/security/`) até ser corrigido.
- O agente de front-end corrige os achados de código, um PR por achado; configuração do GitHub,
  secrets e aceitação de risco são do dono.

## Consequências

- Uma auditoria quando mudam `package*.json`, `.github/`, a renderização do conteúdo ou o escopo
  do snapshot, e antes do primeiro snapshot real (`--scope all`).
- As verificações são comandos registrados, não um script; se a lista crescer, vira um
  `scripts/audit.mjs` (proposta do próprio cerberus como achado BAIXA).
