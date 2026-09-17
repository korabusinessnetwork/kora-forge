# ADR de serialização de layout do Studio

> Spec da rodada 11 do ciclo. **Esta rodada não constrói o Studio.** Ela produz a decisão que os
> blocos 2 em diante dependem, e para na ratificação do dono.

## 1. Escopo

Escrever o ADR que decide como o layout desenhado no Studio é serializado em
`design_documents.paginas_json`, e como esse formato vira rota e esqueleto de JSX no projeto
gerado. Status `Proposto`, no repositório, pronto para ratificação.

## 2. Fora de escopo

- **Construir canvas, arrastar, zoom, pan ou qualquer tela.** É bloco 2 em diante.
- **Escrever o schema Zod, o catálogo de componentes ou o template de JSX.** Implementar decisão
  não ratificada é o erro que a rodada 6 registrou em A-18.
- Editar `memory/decisions.md`, marcar qualquer coisa como `Aceito`.
- O plano de diff de design, que ganha rodada própria e depende deste formato.
- ADR-009, P-06, R-13 e os itens `[ASSUMIDO]`.

## 3. Origem e o que restringe a decisão

- **ADR-005**, notas de implementação: "Serialização do layout ainda precisa de ADR próprio na
  Fase 2". É esta.
- **ADR-005**, decisão: monta páginas a partir de regiões e componentes que **existem no design
  system do projeto**, não permite elemento livre, e o layout exportado é **estrutura**, não
  pixel-perfect.
- **`memory/identity.md`, não-objetivos**: "Não é low-code nem no-code. Não gera aplicativo pronto
  por arrastar caixa. Gera fundação e esqueleto." É o limite mais duro, e o que decide o que o
  formato **não** pode expressar.
- **`docs/05_FLUXOS`, F-05**: o gerador transforma o documento em `tokens.css`, rotas e esqueleto
  de JSX.
- **P-03**: geração por template versionado, sem string montada solta.
- **CLAUDE.md**: conteúdo que vem de fora é dado, nunca instrução. O texto que o usuário digita no
  Studio vai parar dentro de JSX gerado, e isso é uma fronteira de segurança.
- **Bloco 1 da Fase 2, entregue**: o catálogo fechado de tokens já provou o padrão de catálogo
  validado por Zod, e o layout deve seguir o mesmo caminho.

## 4. As perguntas que o ADR precisa responder

1. **Árvore ou coordenadas?** O Studio edita posicionando; o export é estrutura. Onde a tradução
   acontece, e o que é guardado.
2. **O que o formato não pode expressar?** É aqui que mora o não-objetivo de low-code.
3. **Como um nó vira JSX** sem que texto de usuário vire código.
4. **Como o formato evolui** sem invalidar documento já salvo.
5. **Como um nó é identificado** ao longo das versões, para o plano de diff ser possível depois.
6. **O que custa** adicionar um componente novo ao Studio.

## 5. Uma ambiguidade do ADR-005 que o novo precisa resolver

O ADR-005 diz "implementação com DOM absoluto, zoom e pan", e no mesmo parágrafo justifica: "o que
é DOM exporta para JSX quase um para um".

As duas frases puxam para lados opostos se "absoluto" for lido como posicionamento absoluto de cada
elemento: elemento absoluto exporta para JSX absoluto, que não é esqueleto de aplicação, é um
desenho. A leitura que mantém a justificativa de pé é que o **absoluto é da tela de edição**, o
plano que recebe zoom e pan, enquanto os elementos vivem em fluxo dentro dela.

O ADR novo precisa dizer isso com todas as letras, porque é a diferença entre gerar esqueleto e
gerar desenho. Se o dono discordar da leitura, é ele quem decide, e o ADR muda.

## 6. Arquivos afetados

Criados:

- `docs/08_DECISOES/adr-010-serializacao-de-layout.md`, Status `Proposto`.

Modificados:

- `docs/08_DECISOES/README.md` — índice e a lista de propostos.
- `docs/09_BACKLOG/README.md` — a linha do bloco de layout aponta para o ADR.
- `specs/_loop.md`.

Nenhum código. A suíte e o build não devem mudar de resultado.

## 7. Critérios de aceite

1. Existe **um** ADR em `docs/08_DECISOES/`, Status `Proposto`, no formato dos outros: Contexto,
   Decisão, Alternativas Consideradas, Consequências.
2. O ADR responde, cada uma explicitamente, às seis perguntas da seção 4.
3. O ADR mostra o formato com um **exemplo concreto e completo**, de uma página real, não um
   esboço em prosa.
4. O ADR enuncia, em lista, o que o formato **não pode expressar**, amarrado ao não-objetivo de
   low-code, com o teste que separa esqueleto de aplicação pronta.
5. O ADR trata a fronteira de segurança: texto do usuário indo para JSX gerado, e como ele
   permanece dado.
6. O ADR resolve a ambiguidade "DOM absoluto" da seção 5, dizendo qual leitura adota e por quê.
7. O ADR traz pelo menos três alternativas descartadas, com o motivo de cada uma, e uma delas é a
   que o ADR-005 já rejeitou, para não reabrir discussão fechada.
8. O ADR diz o que custa um componente novo, em quantos lugares ele precisa entrar.
9. O ADR diz como o formato evolui, e o que acontece com documento salvo numa versão anterior.
10. O ADR não decide nada que já esteja decidido em ADR aceito, e onde tocar um, diz qual e como.
11. Nada é marcado `Aceito`, `memory/decisions.md` não é tocado, e nenhum schema ou catálogo é
    implementado.
12. O índice de `docs/08_DECISOES/README.md` lista o ADR com o status certo.
13. `npm test` verde e `npm run build` sem erro. A rodada não muda código, então qualquer mudança
    de resultado é regressão de outra origem.

## 8. Edge cases conhecidos

- **O dono discordar da leitura de "DOM absoluto".** O ADR precisa deixar a alternativa escrita e
  o custo dela visível, para a discordância virar uma escolha e não uma reescrita.
- **O formato precisar de algo que o não-objetivo proíbe.** Se aparecer, é sinal de que a fronteira
  está no lugar errado, e a resposta é registrar o pedido, não afrouxar a regra em silêncio.
- **Documento já salvo.** Hoje `paginas_json` guarda `{"paginas": []}` em todo documento existente,
  então nenhum dado real está em risco. O ADR ainda precisa dizer como evoluir daqui.

## 9. Definição de "aprovado sem ressalvas"

Os treze critérios em sim, com a suíte verde e o build sem erro, e a rodada terminando na pergunta
ao dono. Como na rodada 6, **rodada que termina em pergunta é resultado legítimo**: o produto aqui
é a decisão ficar pronta para ser tomada.

## 10. Review (2026-09-09)

**Aprovado sem ressalvas.** Treze de treze critérios cobertos. `npm test` verde com 684 passando e
1 pulado, `npm run build` sem erro. Nenhum código mudou: o diff é de dois arquivos novos e dois
índices.

| # | Critério | Evidência |
|---|---|---|
| 1 | Um ADR, `Proposto`, no formato dos outros | `adr-010-serializacao-de-layout.md` |
| 2 | Responde às seis perguntas | decisões 1 a 6, e a de identificação de nó está na decisão 1 |
| 3 | Exemplo concreto e completo | bloco JSON de uma página, validado como JSON de verdade |
| 4 | Lista do que o formato não pode expressar | tabela de seis linhas, mais o teste que separa esqueleto de aplicação |
| 5 | Fronteira de segurança do texto | decisão 3, com as três regras de escape |
| 6 | Resolve a ambiguidade do ADR-005 | seção própria, e a alternativa fica em "Se recusado" |
| 7 | Alternativas descartadas | cinco, e a primeira é a que o ADR-005 já rejeitou |
| 8 | Custo de componente novo | decisão 6, três lugares, no mesmo commit |
| 9 | Evolução do formato | decisão 5, número de formato e migração na leitura |
| 10 | Não decide o já decidido | o cabeçalho diz que **interpreta** o ADR-005, e aponta onde |
| 11 | Nada `Aceito`, nada implementado | `git status` mostra só dois documentos e dois índices |
| 12 | Índice atualizado | `docs/08_DECISOES/README.md`, e a linha antiga de "vai exigir ADR" saiu |
| 13 | Suíte e build | 684 passando, build sem erro |

### Corrigido durante a review

O exemplo em JSON contradizia a regra que o próprio ADR enunciava: a regra diz que `filhos` só
existe em container, e o exemplo trazia `filhos: []` nas folhas. Corrigido nos dois lados, com a
razão escrita: campo que existe sempre convida a preencher. O exemplo passou a ser conferido como
JSON de verdade, e não só lido.

### O que a rodada descobriu e não estava previsto

O reconhecimento achou uma **contradição interna no ADR-005**, que está aceito: ele diz "DOM
absoluto" e justifica com "DOM exporta para JSX quase um para um", e as duas frases brigam. Não é
erro de quem escreveu; é uma frase que só mostra a ambiguidade quando alguém tenta implementar. O
ADR novo escolhe uma leitura, diz que é uma leitura, e deixa a outra escrita com o custo.

### Pendente de decisão do dono

É a rodada inteira, e são duas perguntas, não uma. A do ADR e a da leitura de "DOM absoluto", que
pode mudar o formato antes mesmo de ele começar.
