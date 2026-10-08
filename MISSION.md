# MISSION — Plantão

## O nome

**Plantão** é o plantão policial e também o plantão de estudo: a madrugada de quem estuda depois
do turno, o bloco de 15 minutos entre o trabalho e a criança, o "plantão de dúvidas" do cursinho.
Serve para todas as carreiras policiais sem soar como quartel. Na fala: "fiz 50 questões no
Plantão hoje". O endereço e o repositório usam `plantao`, sem acento.

## A missão

Ser o lugar onde o concurseiro das **carreiras policiais** encontra e resolve as questões de que
precisa: provas oficiais, gabarito definitivo, anuladas marcadas, filtradas por banca, órgão, cargo,
ano, disciplina e assunto. Gratuito, rápido no celular mais simples e acessível a todo mundo.

O banco de questões é do projeto **emmoni** (repositório privado). O Plantão é o site: consome o
snapshot do esquema `api` do emmoni e não altera dados.

## Para quem

Um público diverso: idade, região, renda, raça, gênero, deficiência e conexão variam muito. Leia
[`personas.md`](docs/personas.md) antes de decidir qualquer coisa de interface. Em resumo:

- Celular Android de entrada, plano pré-pago e 3G instável são o caso **comum**, não o caso extremo.
- Quem estuda tem pouco tempo: abrir, resolver e sair; e voltar de onde parou.
- Confiança vem da fonte oficial: toda questão mostra de onde veio (PDF, página, número).
- Linguagem simples e acolhedora, sem jargão de app, sem tom militar e sem promessa de aprovação.

## Critérios de sucesso

- "Cebraspe + PF + Língua Portuguesa + 2021" leva às questões certas em poucos toques, no celular.
- Uma questão abre e é legível **sem JavaScript** e em 3G em menos de 3 s.
- Certo/errado e múltipla escolha respondem na hora, com gabarito definitivo; anuladas e alteradas
  após recurso são explicadas.
- WCAG 2.2 AA: navegação por teclado, leitor de tela, contraste e texto alternativo nas figuras.
- O site no ar no GitHub Pages, publicado a cada merge no `main`, sem servidor para manter.

## Fora de escopo (por enquanto)

- Contas de usuário, login e sincronização entre aparelhos (progresso fica no aparelho).
- Comentários, resoluções e fórmulas de "macete". **Nunca** copiar conteúdo de sites concorrentes
  de questões (QConcursos, TEC, Gran, Estratégia e similares).
- Anúncios e rastreamento de terceiros.
