# Personas

O público concurseiro das carreiras policiais é diverso. Estas personas existem para que cada
decisão de interface seja testada contra pessoas diferentes, não contra um "usuário médio". São
fictícias e não esgotam o público.

**O que todos têm em comum:** resolvem muitas questões, se guiam pelo estilo da banca ("o Cebraspe
gosta de pegadinha em certo/errado"), têm pouco tempo e muita ansiedade, e querem a **posse**.

| Persona | Quem é | Como estuda | O que precisa do site |
|---|---|---|---|
| **Jéssica, 24, Belém (PA)** | Mulher negra, primeira da família na faculdade. Mira PRF. | Android de entrada, plano pré-pago, no ônibus. | Páginas leves que funcionem em 3G; filtro rápido por banca; nada de anúncio pesado. |
| **Seu Raimundo, 41, Juazeiro do Norte (CE)** | Vigilante, pai de três, ensino médio. Mira polícia penal estadual. | Madrugadas de plantão, às vezes em computador emprestado. | Letra grande, linguagem simples, sem jargão de app; retomar de onde parou. |
| **Thiago, 29, Porto Alegre (RS)** | Branco, advogado, saiu do escritório. Mira delegado da PC. | Notebook, sessões longas, planilha de desempenho. | Filtro fino por assunto, gabarito definitivo, anuladas marcadas; rigor. |
| **Ana Clara, 33, Brasília (DF)** | Mulher trans, servidora administrativa. Mira PF (agente/escrivão). | Veterana: já refez a mesma prova três vezes. | Fonte oficial de cada questão; confiança no dado; ambiente sem tom de quartel nem piadinha. |
| **Kauã, 19, Manaus (AM)** | Indígena (Sateré-Mawé), recém-saído do ensino médio. Mira PM/CBM. | Celular, Wi-Fi da escola ou da igreja, muitas vezes offline. | Funcionar com internet instável; linguagem acolhedora para quem começa. |
| **Marcos, 37, Belo Horizonte (MG)** | Pardo, ex-militar do Exército, cadeirante. Mira vagas PcD (perito, papiloscopista). | Computador com teclado e, às vezes, leitor de tela. | Acessibilidade de verdade: teclado, contraste, texto alternativo nas figuras. |
| **Luana, 27, interior de SP** | Mãe solo, técnica de enfermagem. Mira guarda municipal, depois PC. | Blocos de 15 minutos entre o trabalho e a criança. | Sessões curtas ("10 questões agora"); progresso salvo. |

## Consequências para o produto

- **Orçamento de peso** pensado para a Jéssica e o Kauã (SPECIFICATION.md §4).
- **Ler sem JavaScript; JavaScript melhora.** A questão é HTML estático; responder, filtrar e
  guardar progresso são camadas por cima.
- **Acessibilidade é requisito**, não acabamento: o Marcos usa o site do jeito que ele é.
- **Tom de voz**: direto, respeitoso, sem gíria militar, sem gamificação infantil, sem "você vai
  passar!". Erros são explicados, não punidos.
- **Sem cadastro** para estudar. Progresso no aparelho (`localStorage`), com aviso claro disso.
