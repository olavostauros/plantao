# Formato do conteúdo

**Versão 1.0** · vale para `statement_md` (enunciado), `body_md` das alternativas e `body_md` /
`passage_md` dos textos-base. Faz parte do [contrato](contract.md).

O conteúdo é **Markdown restrito**: CommonMark + tabelas GFM, com as regras abaixo. A ingestão
garante que nada fora disso chega ao banco publicado; o front-end pode renderizar com qualquer
biblioteca CommonMark/GFM com HTML desabilitado, mais os dois acréscimos (sublinhado e fórmulas).

## Permitido

| Elemento | Sintaxe | Observação |
|---|---|---|
| Parágrafos | linha em branco entre blocos | |
| Quebra de linha | `\` no fim da linha | raro; poemas e endereços |
| Itálico | `*texto*` | termos estrangeiros, nomes de leis em latim (*habeas corpus*) |
| Negrito | `**texto**` | ênfase do original (ex.: "**não** é prevista") |
| Sublinhado | `<u>texto</u>` | **única tag HTML aceita**; questões que pedem "o termo sublinhado" |
| Código inline | `` `=SOMA(A1:A3)` `` | fórmulas de planilha, comandos, atalhos |
| Listas | `- item` ou `1. item` | |
| Tabelas | GFM (`\| a \| b \|` + `\|---\|`) | alinhamento com `:` permitido |
| Fórmulas | `$x^2$` inline, `$$...$$` em bloco | LaTeX (renderizar com KaTeX/MathJax) |
| Imagens | `![texto alternativo](asset:<sha256>)` | ver abaixo |

## Imagens

- O destino é sempre `asset:` seguido do sha256 (64 hex minúsculos) do arquivo. Nunca há URL
  externa.
- O texto alternativo descreve a imagem o bastante para resolver a questão sem vê-la.
- Para obter a URL: o campo `assets` de cada questão já traz `{sha256, url, mime_type, width,
  height, alt_text}` de todas as imagens do enunciado, das alternativas e do texto-base. Também
  existe `api.asset_url(sha256)`.

## Proibido

- HTML além de `<u>`; links (`[x](url)`); cabeçalhos (`#`); citações (`>`); blocos de código
  cercados; notas de rodapé; imagens fora de `asset:`.

## Normalização aplicada na ingestão

- Unicode NFC.
- Hifenização de fim de linha do PDF removida (`investi-\ngação` → `investigação`).
- Espaços repetidos colapsados; espaços nas pontas removidos.
- Aspas (“ ”, ‘ ’) e travessões (—, –) do original preservados.
- O texto não é "corrigido": erros do original ficam, porque a questão pode ser justamente sobre eles.
