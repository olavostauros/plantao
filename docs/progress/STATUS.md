# Status — atualizado em 2026-10-09

**Marco atual:** F1 — A questão (SPECIFICATION.md §6). F0 pronto no setup do repositório.

## Em andamento
- Nada em código. Design system em TSX/Preact entrou no `main` (PR #2, decisão 0004). Sincronia com
  o agente do emmoni registrada em `2026-10-09-sincronia-emmoni.md`.

## Próximos passos (F1)
1. Escolher o renderizador do Markdown restrito (`content-format.md`): HTML desabilitado salvo
   `<u>`, tabelas GFM, KaTeX no build, imagens `asset:<sha256>` → `public/assets/`. Registrar a
   decisão. **`$` literal**: os dados reais têm ≈ 190 `R$`/`US$` e nenhuma fórmula. Até o emmoni
   confirmar a content-format v1.1 (`\$` = `$` literal), **não** ligar a fórmula inline com `$`
   simples. Se ligar, exigir `$` colado ao conteúdo (regra do pandoc/remark-math). `$$` em bloco pode.
2. Testes do renderizador para cada elemento permitido e cada proibido, incluindo
   "de R$ 5 e de R$ 20" saindo como texto.
3. `/questao/<id>/` para as 65 questões do seed: enunciado (com o comando do Cebraspe), texto-base,
   alternativas, fonte oficial (PDF e página), status do gabarito. **Testar o layout com textos
   longos** (reais: enunciado até 3.900 e texto-base até 3.751 caracteres; seed até ≈ 450): fixture
   de teste, não questão embutida.
4. Responder: A–E (também com 4 alternativas) e Certo/Errado, sem recarregar a página; gabarito
   preliminar só quando `changed`/`annulled` (contrato §4). Nos reais o preliminar quase nunca vem
   (`null` em 5.088 de 5.152) e `applied_on` costuma ser `null`: nada pode depender deles.
5. Layout base com Tailwind e componentes do design system em `src/components/ui/` (TSX/Preact,
   HTML no build; `client:*` só na ilha de responder). Cabeçalho, rodapé, tema claro/escuro pelos
   tokens de `src/styles/global.css` e tipografia legível, seguindo as personas. O preflight zera
   listas e tabelas: o conteúdo Markdown precisa de estilos próprios.

## Comunicação com o emmoni
- Pedidos: `docs/requests/AAAA-MM-DD-<assunto>.md` + mensagem ao agente do emmoni (sessão local,
  quando aberta; senão, avisar o dono).
- Aguardando dele: confirmação da content-format v1.1 (`$` literal).

## Bloqueios e perguntas em aberto
- Publicar as questões reais (`npm run snapshot -- --scope all`) depende de aprovação do dono.
  Antes disso, o emmoni corrige e tira do `api` alguns defeitos já conhecidos (ver o registro de
  2026-10-09).

## Números
- Snapshot: seed, 65 questões, 5 provas, 2 imagens (contrato v1.2, content-format v1.0)
- Reais no emmoni (2026-10-09): 5.152 visíveis, só Cebraspe
- Site: https://olavostauros.github.io/plantao/
