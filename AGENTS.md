# AGENTS.md — Plantão

Instruções para o agente de front-end deste repositório. Antes de começar, leia:

1. [docs/MISSION.md](docs/MISSION.md): o que é o Plantão e para quem (o **porquê**).
2. [docs/personas.md](docs/personas.md): o público, diverso; toda decisão de interface passa por ele.
3. [docs/SPECIFICATION.md](docs/SPECIFICATION.md): stack, dados, orçamentos, rotas e marcos
   (o **o quê**). É a fonte de verdade técnica.
4. [docs/contract.md](docs/contract.md) e [docs/content-format.md](docs/content-format.md): o
   formato dos dados (cópia do contrato do emmoni).
5. Este arquivo: como trabalhar (o **como**).

Em caso de conflito, o SPECIFICATION.md manda nas decisões técnicas e este arquivo manda no processo.

## Papel e fronteiras

- Você é o **agente de front-end**: constrói o site que os concurseiros usam.
- O banco de questões é do projeto **emmoni** (repositório privado, outro agente). Você **não**
  altera esquema, migrações nem dados de lá. Precisa de um campo novo ou de uma correção num dado?
  Escreva o pedido em `docs/requests/AAAA-MM-DD-<assunto>.md` (o quê, por quê, exemplo) e avise o
  dono no fim da sessão.
- Os dados chegam só pelo snapshot (`npm run snapshot`, SPECIFICATION.md §3). Nunca embuta
  questões à mão no código.
- **Snapshot real (`--scope all`) só com aprovação explícita do dono**: o repositório e o site
  são públicos.

## Idioma

- Textos do site, documentação, comentários e mensagens de commit em **português**.
- Identificadores no código em **inglês**, seguindo os nomes do contrato (`exam_board`,
  `answer_key`, `statement_md`...). Não invente sinônimos.
- Rotas e parâmetros de URL em português simples, sem acento (`/questoes/`, `?banca=`).

## Princípios

- **Personas primeiro.** Antes de entregar uma tela, passe por ela como a Jéssica (Android de
  entrada, 3G), o Marcos (teclado e leitor de tela) e o Seu Raimundo (letra grande, linguagem
  simples).
- **HTML primeiro, JS por cima.** Ler uma questão não pode depender de JavaScript.
- **Orçamentos do SPECIFICATION.md §4 são gates**, não metas. Estourou? Não entregue; corte.
- **Fidelidade ao dado oficial.** Não reescreva, não "corrija" e não resuma enunciados. Mostre a
  fonte (PDF, página, número) em toda questão.
- **Nunca** copie conteúdo, comentários ou classificações de sites concorrentes de questões
  (QConcursos, TEC Concursos, Gran, Estratégia e similares), nem para "conferir".
- **Privacidade.** Sem rastreadores, anúncios ou cookies de terceiros. Progresso fica no aparelho.
- **Tom de voz**: direto e respeitoso; sem gíria militar, sem promessa de aprovação, sem
  infantilizar.

## Fluxo de trabalho

1. Ler os documentos acima e `docs/progress/STATUS.md` (onde a última sessão parou).
2. Seguir os **marcos F0 → F5 do SPECIFICATION.md §6, em ordem**. Não começar um marco antes de o
   anterior cumprir o critério de "pronto".
3. Trabalhar em incrementos pequenos e verticais: uma tela completa, testada e no ar, antes de
   ampliar.
4. Trabalhar num branch (`f1-questao`, `f2-busca`...) e abrir PR para o `main` **sempre com a
   label `automerge`** (`gh pr create ... --label automerge`, ou `gh pr edit <n> --add-label
   automerge`). O CI roda `npm run gates` em todo PR; com os gates verdes e a label, ele faz o
   merge sozinho e publica no GitHub Pages. Tirar a label segura o PR.
5. Rodar `npm run gates` (check + testes + build) antes de entregar. Não entregue com gates
   falhando; se algo foi pulado, diga.
6. Registrar decisões em `docs/decisions/NNNN-titulo.md` (contexto, decisão, consequências;
   curto). Mudou a especificação? Decisão e SPECIFICATION.md no mesmo commit.
7. **Antes de encerrar a sessão**, criar `docs/progress/AAAA-MM-DD-<assunto>.md` (o que foi feito,
   resultado do `npm run gates`, o que ficou sem verificar) e **sobrescrever**
   `docs/progress/STATUS.md` com o estado atual: marco, em andamento, próximos passos, bloqueios.

## Comandos

```sh
npm ci                  # dependências
npm run dev             # http://localhost:4321/plantao/
npm run snapshot        # atualiza data/snapshot/ a partir do emmoni (seed por padrão)
npm run gates           # astro check + vitest + build; o mesmo que o CI roda
npm run preview         # serve o dist/ como o Pages serviria
```

`npm run snapshot` precisa do Postgres do emmoni rodando (`make db-up migrate seed` no emmoni) e
das imagens em `../emmoni/data/assets` (ou `EMMONI_ASSETS_DIR`). Sem acesso ao banco, trabalhe com o
snapshot já commitado.
