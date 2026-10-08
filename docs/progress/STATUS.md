# Status — atualizado em 2026-10-08

**Marco atual:** F1 — A questão (SPECIFICATION.md §6). F0 pronto no setup do repositório.

## Em andamento
- Branch `contexto-tailwind`: contexto do agente em `docs/` e Tailwind CSS (decisão 0002), aguardando PR.

## Próximos passos (F1)
1. Escolher o renderizador do Markdown restrito (`content-format.md`): HTML desabilitado salvo
   `<u>`, tabelas GFM, KaTeX no build, imagens `asset:<sha256>` → `public/assets/`. Registrar a
   decisão.
2. Testes do renderizador para cada elemento permitido e cada proibido.
3. `/questao/<id>/` para as 65 questões do seed: enunciado (com o comando do Cebraspe), texto-base,
   alternativas, fonte oficial (PDF e página), status do gabarito.
4. Responder: A–E e Certo/Errado, sem recarregar a página; gabarito preliminar só quando
   `changed`/`annulled` (contrato §4).
5. Layout base com Tailwind (cabeçalho, rodapé, tema claro/escuro pelos tokens de
   `src/styles/global.css`, tipografia legível) seguindo as personas. O preflight zera listas e
   tabelas: o conteúdo Markdown precisa de estilos próprios.

## Bloqueios e perguntas em aberto
- Publicar as questões reais (`npm run snapshot -- --scope all`) depende de aprovação do dono.

## Números
- Snapshot: seed, 65 questões, 5 provas, 2 imagens (contrato v1.2)
- Site: https://olavostauros.github.io/plantao/
