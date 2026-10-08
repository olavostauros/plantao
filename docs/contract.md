# Contrato com o front-end

> **Cópia** do `docs/contract.md` do repositório emmoni (privado), onde está a versão que vale.
> No Plantão o site não consulta o banco: lê o snapshot gravado por `npm run snapshot` em
> `data/snapshot/`, com as linhas das views do esquema `api` descritas aqui. Filtros, facetas e
> busca textual (seções 2 e 3) são reimplementados no navegador sobre o snapshot, com a mesma
> semântica. Ver `SPECIFICATION.md` §3.

**Versão 1.2** · 2026-10-08

Este documento é tudo o que o agente de front-end precisa para trabalhar com o banco do emmoni.
Ele descreve o esquema `api` do PostgreSQL: o que existe, o formato de cada resposta e como os
filtros funcionam. Tabelas fora de `api` podem mudar a qualquer momento e não são acessíveis.

## 1. Começando

```sh
make db-up migrate seed     # Postgres local + esquema + 65 questões de exemplo
```

| | |
|---|---|
| Conexão | `postgres://emmoni_web:emmoni_web@localhost:55432/emmoni?sslmode=disable` |
| Papel | `emmoni_web`: só leitura, só o esquema `api` |
| Imagens | `make seed` copia as imagens para `data/assets/<sha256>.<ext>`. Sirva essa pasta em `/assets/`. |

Os dados do seed são fictícios: concursos com slug `seed-*`, documentos em `seed.emmoni.invalid`.
Bancas, órgãos, cargos, disciplinas e assuntos são o catálogo real.

## 2. Funções

Todas devolvem `jsonb`. Erros de entrada levantam SQLSTATE **`22023`**
(`invalid_parameter_value`) com mensagem em português; trate como erro 400.

### `api.search_questions(filters jsonb = '{}', query text = null, page_size int = 20, cursor text = null)`

Busca questões. Devolve:

```json
{ "total": 64, "items": [ <questão>, ... ], "next_cursor": "eyJjIjogInNlZWQtcG..." }
```

- `total`: número de questões que atendem à busca (todas as páginas).
- `items`: no máximo `page_size` questões (1 a 100), no formato da seção 4.
- `next_cursor`: passe de volta em `cursor` para a próxima página; `null` na última. É opaco: não
  monte nem interprete.
- **Ordem**: mais recentes primeiro (ano do concurso decrescente), depois concurso, prova e número
  da questão. A ordem é a mesma com ou sem `query`; não há ordenação por relevância na v1.
- Paginação por cursor (keyset): estável e sem `offset`. Não existe "ir para a página N"; use
  "carregar mais" ou rolagem infinita.

### `api.facet_counts(filters jsonb = '{}', query text = null)`

Contagens para os filtros do site, com os mesmos `filters` e `query` da busca:

```json
{
  "total": 26,
  "exam_board": [{"slug": "cebraspe", "name": "...", "short_name": "Cebraspe", "count": 26}, ...],
  "agency":     [{"slug": "pf", "name": "Polícia Federal", "short_name": "PF", "count": 14}, ...],
  "career":     [{"value": "pf", "count": 14}, ...],
  "position":   [{"slug": "agente", "name": "Agente de Polícia Federal", "count": 14}, ...],
  "year":       [{"value": 2025, "count": 27}, ...],
  "subject":    [{"slug": "lingua-portuguesa", "name": "Língua Portuguesa", "count": 14}, ...],
  "topic":      [{"path": "direito_penal.crimes_contra_o_patrimonio", "name": "...", "count": 4}, ...],
  "type":       [{"value": "multiple_choice", "count": 38}, ...]
}
```

- **Facetas disjuntivas**: a contagem de cada faceta ignora o próprio filtro e respeita os demais.
  Com `{"exam_board": ["cebraspe"]}`, `exam_board` continua mostrando FGV e Vunesp com as contagens
  que teriam se fossem marcadas; `agency` mostra só os órgãos com questões do Cebraspe.
- `topic` conta cada assunto **incluindo os subassuntos**; uma questão conta uma vez por assunto.
- Ordenação: maior contagem primeiro; `year` do mais recente para o mais antigo.
- Só aparecem valores com contagem > 0.

### `api.get_question(id uuid)`

Uma questão no formato da seção 4, ou `null` se não existe ou não está publicada.

### `api.asset_url(sha256 text)`

URL pública de uma imagem (`/assets/<sha256>.<ext>`), ou `null`. Normalmente desnecessária: cada
questão já traz `assets` com as URLs.

## 3. Filtros

`filters` é um objeto JSON; todas as chaves são opcionais. **Listas = OU** dentro da chave;
**chaves diferentes = E**. Lista vazia equivale a não filtrar. Chave desconhecida ou valor de tipo
errado → erro `22023`.

| Chave | Tipo | Exemplo | Observação |
|---|---|---|---|
| `exam_board` | lista de slugs | `["cebraspe", "fgv"]` | banca |
| `agency` | lista de slugs | `["pf", "pc-sp"]` | órgão |
| `career` | lista de valores | `["policia_civil"]` | ver valores abaixo |
| `position` | lista de slugs | `["agente"]` | cargo; o slug casa com cargos de **qualquer** órgão (combine com `agency` para restringir) |
| `year` | objeto | `{"from": 2018, "to": 2024}` | ano do concurso; `from` e `to` opcionais, inclusivos |
| `subject` | lista de slugs | `["direito-penal"]` | disciplina |
| `topic` | lista de caminhos | `["direito_penal.crimes_contra_o_patrimonio"]` | assunto **e todos os subassuntos** |
| `type` | lista | `["true_false"]` | `multiple_choice`, `true_false`, `essay` |
| `include_annulled` | booleano | `true` | padrão `false`: questões anuladas ficam de fora |

Valores de `career`: `pf`, `prf`, `policia_civil`, `policia_militar`, `bombeiro_militar`,
`policia_penal`, `policia_legislativa`, `guarda_municipal`, `policia_cientifica`, `outra`.

**`query`** (busca textual): sintaxe de buscador (`websearch_to_tsquery`), sem diferença entre
maiúsculas e minúsculas nem entre palavras com e sem acento, e com radicais em português
(`inquéritos` acha `inquérito`). Aspas buscam a frase exata (`"prisão em flagrante"`), `-palavra`
exclui e `or` faz OU. A busca cobre enunciado, alternativas e texto-base.

Para montar os controles de filtro, use as views de catálogo (seção 5) para os nomes e
`facet_counts` para as contagens da busca atual.

## 4. A questão

Um objeto por questão, com estes campos (todos sempre presentes; alguns podem ser `null`):

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | uuid | Identificador estável. Use nas URLs. |
| `number` | int | Número da questão na prova (caderno de referência). |
| `type` | text | `multiple_choice`, `true_false` ou `essay`. |
| `statement_md` | text | Enunciado ([formato](content-format.md)). Em certo/errado do Cebraspe, o primeiro parágrafo é o **comando** do grupo ("Com relação a X, julgue os itens a seguir."), repetido em cada item do grupo. |
| `options` | lista | `[{"letter": "A", "body_md": "..."}]`, em ordem. Vazia em `true_false`. |
| `answer` | text \| null | **Gabarito definitivo**: letra (`A`–`E`) ou `C`/`E` (certo/errado). `null` se anulada. |
| `answer_preliminary` | text \| null | Gabarito preliminar, antes dos recursos. `null` também quando a banca não publica mais o preliminar; nesse caso `answer_status` só distingue `annulled` de `valid` (uma alteração por recurso não é detectável). |
| `answer_status` | text | `valid`, `changed` (alterado após recurso) ou `annulled` (anulada). |
| `passage_id` | uuid \| null | Texto-base compartilhado com outras questões. |
| `passage_md` | text \| null | Conteúdo do texto-base (repetido em cada questão que o usa). |
| `assets` | lista | Imagens do enunciado, das alternativas e do texto-base: `{sha256, url, mime_type, width, height, alt_text}`. |
| `exam_board_slug`, `exam_board_name`, `exam_board_short_name` | text | Banca. |
| `agency_slug`, `agency_name`, `agency_short_name` | text | Órgão. |
| `career` | text | Carreira do órgão. |
| `government_level` | text | `federal`, `estadual`, `distrital` ou `municipal`. |
| `state` | text \| null | UF do órgão; `null` se federal. |
| `contest_slug`, `contest_name`, `year` | | Concurso. |
| `exam_slug`, `exam_name`, `applied_on` | | Prova; `applied_on` é data ISO ou `null`. |
| `positions` | lista | Cargos da prova: `[{"slug", "name"}]`. |
| `subject_slug`, `subject_name` | text | Disciplina. |
| `topics` | lista | Assuntos: `[{"path", "name"}]`. |
| `source_url` | text \| null | PDF oficial da prova. |
| `source_page` | int | Página do PDF onde a questão está. |

Certo/errado (estilo Cebraspe): `options` é vazia e o usuário escolhe **Certo** (`C`) ou
**Errado** (`E`). Mostre o gabarito preliminar só quando `answer_status` for `changed` ou
`annulled`, para explicar a mudança.

## 5. Views de catálogo

Leitura direta (`select * from api.<view>`). `question_count` conta questões publicadas,
**incluindo as anuladas**.

| View | Colunas |
|---|---|
| `api.exam_board` | `slug, name, short_name, question_count` |
| `api.agency` | `slug, name, short_name, career, government_level, state, question_count` |
| `api.position` | `agency_slug, slug, name, education_level, question_count` |
| `api.subject` | `slug, name, question_count` |
| `api.topic` | `path, name, subject_slug, depth, parent_path, question_count` (inclui subassuntos). `depth` 1 = primeiro nível abaixo da disciplina. |
| `api.exam` | `contest_slug, contest_name, year, notice_number, agency_slug, exam_board_slug, exam_slug, exam_name, applied_on, positions, question_count, source_url` (só provas publicadas) |
| `api.passage` | `id, body_md, assets` |
| `api.question` | as questões publicadas, mesmas colunas da seção 4 |

Para montar a árvore de assuntos: `api.topic` ordenada por `path`, ligando cada linha à de
`parent_path` (a raiz de cada disciplina tem `parent_path` nulo).

## 6. Garantias

- Só aparecem questões **publicadas**, de provas publicadas e que não são duplicata de outra.
- Toda questão publicada tem disciplina e gabarito definitivo (ou está anulada, ou é discursiva).
- `id`, slugs e `path` de assunto são estáveis: podem ir para URLs e favoritos.
- A interface só muda de forma incompatível com nova **versão maior** deste documento, com nota de
  migração abaixo. Campos novos podem aparecer em versões menores; ignore os que não conhece.

## 7. Histórico

| Versão | Data | Mudança |
|---|---|---|
| 1.0 | 2026-10-07 | Primeira versão. |
| 1.1 | 2026-10-07 | Sem mudança de interface. Documenta o comando no início do enunciado (Cebraspe) e `answer_preliminary` nulo quando o preliminar não está disponível. |
| 1.2 | 2026-10-08 | Novo valor de `career`: `policia_cientifica` (perícia oficial fora da Polícia Civil, ex.: Polícia Científica de Pernambuco). Compatível: trate valores desconhecidos como `outra`. |
