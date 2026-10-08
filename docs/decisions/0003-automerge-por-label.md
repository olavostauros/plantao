# 0003 — Merge automático por label

**Data:** 2026-10-08

## Contexto

O dono quer que os PRs do agente entrem no `main` sem esperar um merge manual. O `main` não tem
proteção de branch, e o deploy no Pages roda no push ao `main`.

## Decisão

- Todo PR do agente leva a label `automerge`.
- O job `automerge` do `pages.yml` roda em PRs com essa label, depois do `build` (gates verdes):
  faz o merge (`--merge --delete-branch`) e dispara o deploy do `main` por `workflow_dispatch`.
- O workflow também roda no evento `labeled`, para que pôr a label num PR já verde baste.

## Consequências

- Um merge feito com o `GITHUB_TOKEN` não gera evento de push; por isso o deploy é pedido por
  `workflow_dispatch`, a exceção que esse token pode disparar.
- Os gates são a única barreira antes de publicar. Para revisar algo antes, tire a label.
