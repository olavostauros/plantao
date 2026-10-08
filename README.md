# Plantão

Questões de provas oficiais de **concursos policiais** (PF, PRF, polícias civis, militares e
penais, bombeiros, guardas), filtradas por banca, órgão, cargo, ano, disciplina e assunto.
Gratuito, leve no celular e acessível.

**No ar:** https://olavostauros.github.io/plantao/ (em construção; por enquanto só questões de
exemplo).

## Como funciona

O site é estático (Astro, TypeScript e Tailwind CSS, publicado no GitHub Pages). As questões vêm de um snapshot do banco do
projeto emmoni, extraído dos PDFs oficiais das bancas, com gabarito definitivo e a fonte de cada
questão. Ver [`SPECIFICATION.md`](SPECIFICATION.md) e a
[decisão 0001](docs/decisions/0001-site-estatico-com-snapshot.md).

## Desenvolvimento

```sh
npm ci
npm run dev      # http://localhost:4321/plantao/
npm run gates    # check + testes + build
```

O trabalho é feito por um agente de front-end. O contexto dele são três arquivos na raiz:
[`AGENTS.md`](AGENTS.md) (como), [`MISSION.md`](MISSION.md) (porquê) e
[`SPECIFICATION.md`](SPECIFICATION.md) (o quê).
