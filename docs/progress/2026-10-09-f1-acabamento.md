# 2026-10-09 — F1: verificação no ar e acabamento

## Feito
- Lighthouse 12 (mobile, Chromium headless) no site publicado, uma questão de cada caso do seed:
  múltipla escolha com 5 e com 4 alternativas, com texto-base, com imagem; Certo/Errado simples,
  com texto-base, com imagem, alterada e anulada. Todas: Acessibilidade 100, Desempenho 100,
  SEO 100, Melhores práticas 96, LCP 0,8–1,0 s, ≈ 22 KB transferidos.
- Os 4 pontos de Melhores práticas eram o 404 do `/favicon.ico`: favicon SVG em
  `public/favicon.svg`, ligado no `Base.astro` com o `BASE_URL`.
- "Conferir" só pelo teclado (Tab até a opção, seta, Espaço, Tab, Enter) a 320 px, no site
  publicado: múltipla escolha, Certo/Errado, alterada e anulada mostram o resultado certo na
  região `aria-live`; sem rolagem horizontal.
- Fixture longa renderizada (container API) e capturada a 320 px: a tabela quebrava palavras no
  meio ("Colun/a"), porque o `overflow-wrap: anywhere` do `.md` era herdado pelas células e
  deixava a tabela encolher em vez de rolar. Células agora usam `break-word`: palavras inteiras, e
  a tabela larga rola dentro do `.table-wrap`. A página continua sem rolagem horizontal.

## Gates
`npm run gates`: 0 erros, 105 testes, 66 páginas. CSS ≈ 3,3 KB gzip.

## Não verificado
- Leitor de tela real (NVDA/TalkBack); a verificação foi de foco, teclado e `aria-live`.
- 3G simulado além do perfil padrão do Lighthouse mobile.
- A correção da tabela não tem teste automático (é CSS de layout); foi conferida por captura.
