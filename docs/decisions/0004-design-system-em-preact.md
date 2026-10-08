# 0004 — Design system em componentes JSX sobre o Preact

**Data:** 2026-10-08

## Contexto

O dono quer o design system em componentes React. No Astro, componentes de framework viram HTML
estático no build e só levam JS ao navegador quando hidratados (`client:*`). A página de questão
vai ter ao menos uma ilha (responder A–E e C/E, F1), e React + react-dom pesam ≈ 45 KB gzip, acima
do orçamento de 30 KB de JS da página de questão (SPECIFICATION.md §4).

## Decisão

- Componentes do design system em **TSX com a API do React, rodando no Preact**
  (`@astrojs/preact` com `compat: true`, ≈ 4 KB gzip quando hidratado). Versões fixas:
  `@astrojs/preact` 4.1.3 (a linha compatível com Astro 5/Vite 6) e `preact` 10.29.8.
- Ficam em `src/components/ui/`, estilizados com as classes do Tailwind e os tokens de `@theme`.
  Páginas e layouts continuam em `.astro`.
- Por padrão, sem `client:*`: o componente sai como HTML puro. Hidratar só o que precisa de
  interação, e a leitura da questão nunca depende disso.
- `preact-render-to-string` (dev) para testar os componentes no Vitest.

## Consequências

- `import ... from 'react'` resolve para `preact/compat` (tipos via `paths` no `tsconfig.json`);
  bibliotecas React simples funcionam, mas as que dependem de detalhes internos do React podem
  não funcionar. Toda biblioteca nova que roda no navegador conta no orçamento de peso.
- Atributos usam `class` (como no HTML), não `className`.
