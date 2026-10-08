# SPECIFICATION — Plantão

Fonte de verdade técnica do site. Mudou alguma coisa aqui? Registre a decisão em
`docs/decisions/` no mesmo commit.

## 1. Estrutura

```
AGENTS.md               como o agente trabalha (processo); o resto do contexto fica em docs/
astro.config.mjs        site e base do GitHub Pages; Tailwind via plugin do Vite
src/pages/              rotas (uma página .astro por rota)
src/lib/                lógica sem interface: snapshot, filtros, busca, renderização do conteúdo
src/components/         componentes .astro (ilhas de JS só quando necessário)
src/styles/global.css   Tailwind: `@import "tailwindcss"` e tokens de tema (`@theme`)
data/snapshot/          snapshot do esquema api do emmoni (gerado; versionado no git)
public/assets/          imagens das questões (geradas pelo snapshot)
scripts/                export-snapshot.mjs
tests/                  Vitest
docs/                   contexto do agente: MISSION.md (porquê), SPECIFICATION.md (o quê, este
                        arquivo), personas, contrato (cópia), formato do conteúdo, decisões, progresso
```

## 2. Stack

| Camada | Escolha |
|---|---|
| Framework | **Astro 5**, saída `static`, **TypeScript** estrito |
| Hospedagem | **GitHub Pages**, `https://olavostauros.github.io/plantao/` (`base: '/plantao'`) |
| CI/CD | `.github/workflows/pages.yml`: `npm ci` → `npm run gates` → deploy no push ao `main`; PR com a label `automerge` entra no `main` sozinho quando os gates passam (decisão 0003) |
| Testes | Vitest (lógica em `src/lib/`); testes de página quando houver interação |
| Estilo | **Tailwind CSS 4** (`@tailwindcss/vite`), classes utilitárias no markup; cores e fontes como tokens em `@theme` (`src/styles/global.css`); claro e escuro por `prefers-color-scheme`. `<style>` de componente só para o que o Tailwind não cobre (ex.: conteúdo Markdown renderizado) |
| Node | ≥ 22 (CI usa 24) |

Dependência nova só com motivo escrito no commit; preferir nenhuma a uma grande. Biblioteca que
roda no navegador conta no orçamento de peso (§4).

## 3. Dados

O GitHub Pages só serve arquivos estáticos e não alcança o Postgres do emmoni. Por isso
(decisão 0001):

1. `npm run snapshot` roda **numa máquina com acesso ao banco do emmoni** (papel `emmoni_web`,
   só leitura, esquema `api`) e grava `data/snapshot/{questions,catalog,meta}.json` e
   `public/assets/`.
2. O snapshot é **versionado no git**. O build (local e CI) só lê esses arquivos.
3. `--scope seed` (padrão) exporta só as 65 questões fictícias do seed; `--scope all` exporta as
   questões reais publicadas. **Publicar o escopo `all` exige aprovação explícita do dono** (o site
   é público).

Formato: cada item de `questions.json` é uma linha de `api.question`, no formato da seção 4 de
[`contract.md`](contract.md); `catalog.json` traz as views da seção 5. O conteúdo (`*_md`) segue
[`content-format.md`](content-format.md). `question_count` das views conta o banco todo; conte pelo
snapshot.

**Filtros, facetas e busca** reproduzem no navegador a semântica das seções 2 e 3 do contrato:
listas = OU, chaves = E, facetas disjuntivas, `topic` inclui subassuntos, anuladas fora por padrão,
busca sem diferença de maiúsculas e acentos. A implementação (índice gerado no build, fatiado e
carregado sob demanda) é decisão do agente, registrada em `docs/decisions/`. Ela deve aguentar o
escopo `all` (≈ 5 mil questões hoje, 100 mil no futuro do emmoni).

Mudou o contrato do emmoni? Atualize a cópia em `docs/contract.md`, a constante
`CONTRACT_VERSION` do exportador e os tipos em `src/lib/snapshot.ts`.

## 4. Qualidade (orçamentos)

| Métrica | Limite |
|---|---|
| Página de questão sem JS | legível e completa (enunciado, texto-base, alternativas, fonte) |
| JS na página de questão | ≤ 30 KB gzip |
| CSS por página | ≤ 20 KB gzip (o Tailwind só gera as classes usadas) |
| JS na busca (sem o índice) | ≤ 60 KB gzip; índice carregado em fatias |
| LCP em 3G lento (Moto G) | ≤ 3 s |
| Acessibilidade | WCAG 2.2 AA; Lighthouse Acessibilidade = 100 |
| Largura mínima | 320 px sem rolagem horizontal; alvos de toque ≥ 44 px |
| Idioma | `lang="pt-BR"`; textos em português simples |

Renderização do conteúdo: **no build** (HTML estático), com Markdown restrito do
`content-format.md`, HTML desabilitado salvo `<u>`, fórmulas com KaTeX **no build** e imagens
`asset:<sha256>` resolvidas para `public/assets/` (com `width`/`height` e `alt`).

## 5. Rotas (proposta inicial; o agente pode refinar com decisão)

| Rota | Conteúdo |
|---|---|
| `/` | Entrada: busca, atalhos por carreira e banca, "continuar de onde parei" |
| `/questoes/` | Busca com filtros e facetas, estado na URL (`?banca=cebraspe&ano=2021-2024`) |
| `/questao/<id>/` | Uma questão: resolver, gabarito, status, fonte oficial |
| `/provas/` e `/prova/<contest_slug>/<exam_slug>/` | Provas inteiras, na ordem original |
| `/sobre/` | O que é, de onde vêm os dados, privacidade (progresso só no aparelho) |

Domínio próprio no futuro: trocar `site`, remover `base` e adicionar `public/CNAME`. Todo link
interno passa por `import.meta.env.BASE_URL`; nunca escreva `/plantao` à mão.

## 6. Marcos

Siga em ordem; cada marco termina com `npm run gates` verde e o site no ar.

| Marco | Entrega | Pronto quando |
|---|---|---|
| **F0 — Fundação** | Astro, snapshot do seed, workflow do Pages, docs | Site no ar com a contagem do seed. **Feito no setup.** |
| **F1 — A questão** | `/questao/<id>/` para as 65 do seed: renderização completa do formato, responder (A–E, C/E), gabarito, anulada/alterada, fonte | Todas as questões do seed renderizam sem JS; testes do renderizador cobrem cada elemento do `content-format.md`. |
| **F2 — Busca e filtros** | `/questoes/` com filtros, facetas disjuntivas, busca textual, "carregar mais", estado na URL | Resultados e contagens batem com `api.search_questions`/`api.facet_counts` do emmoni para um conjunto de casos gravados em `tests/fixtures/`. |
| **F3 — Provas e navegação** | `/provas/`, `/prova/...`, `/` com atalhos | Toda prova do snapshot navegável na ordem original. |
| **F4 — Estudo** | Progresso no aparelho, "10 questões agora", continuar de onde parou, desempenho por disciplina | Funciona offline depois da primeira visita (service worker) e sobrevive a recarregar. |
| **F5 — Dados reais** | Snapshot `--scope all` aprovado pelo dono, índice fatiado, orçamentos medidos | Orçamentos do §4 atendidos com o escopo `all`. |
