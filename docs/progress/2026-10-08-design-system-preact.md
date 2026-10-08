# 2026-10-08 — Design system em componentes JSX (Preact)

## Feito
- Pedido do dono: design system em componentes React. Escolha (com o dono): API do React sobre o
  **Preact** (`@astrojs/preact` 4.1.3 com `compat: true`, `preact` 10.29.8), para caber no
  orçamento de JS da página de questão. Decisão 0004; SPECIFICATION.md §1 e §2 atualizados.
- `tsconfig.json`: JSX do Preact e `react`/`react-dom` → `preact/compat`.
- Primeiro componente: `src/components/ui/Button.tsx` (variantes `primary`/`secondary`, alvo
  ≥ 44 px, foco visível) com testes em `tests/button.test.tsx` (`preact-render-to-string`).

## Gates
`npm run gates` verde: astro check 0 erros, 6 testes passando, build ok. `dist/index.html` sem
`<script>` (nenhuma ilha ainda).

## Sem verificar
- O `Button` ainda não é usado em nenhuma página; aparência e contraste no claro/escuro não foram
  vistos no navegador.
- Peso real de uma ilha Preact hidratada (o build gera ≈ 9 KB gzip de runtime + signals) será
  medido quando a primeira ilha entrar (responder, F1).
