# Fase 1, bloco 9, gaveta de ideias

> Spec da rodada 3 do ciclo. Último bloco da Fase 1. Depois dele, o critério de aceite da fase.
> Escopo em `docs/09_BACKLOG/mvp.md`, fluxo F-07 e regra RN-10.

## 1. Escopo

Capturar uma ideia de qualquer tela sem perder o foco: atalho global e botão sempre visível abrem
uma gaveta com título e próximo passo, gravam em `ideas` e devolvem o usuário exatamente para onde
estava, incluindo o foco no elemento de origem.

## 2. Fora de escopo

- Transformar ideia em projeto. O estado `virou_projeto` existe no schema e não é usado nesta
  rodada.
- Página própria de ideias, com rota, filtro e busca. A gaveta mostra as ideias abertas, e isso
  basta para a ideia não cair num buraco.
- Editar uma ideia já gravada.
- Copiloto sugerindo título ou próximo passo. É Fase 4, e o princípio nº 2 manda o fluxo
  funcionar sem ele.
- Atalho configurável em Configurações.
- Mexer no wizard, no runner, no gerador ou no motor de regras.

## 3. Origem e decisões que este item honra

- **`docs/09_BACKLOG/mvp.md`, bloco 9**: "Atalho global, campo com título e próximo passo, volta
  para onde estava".
- **`docs/05_FLUXOS/README.md`, F-07**: "grava em `ideas` e devolve o usuário exatamente para onde
  estava. Não abre projeto, não muda de tela, não pergunta mais nada".
- **RN-10, Ideias**, os dois itens: registrar de qualquer etapa sem sair do fluxo, e não
  interromper o que está em andamento.
- **`docs/06_COMPONENTES/`**: `CartaoIdeia` está previsto, com título e próximo passo.
- **`docs/04_MODELAGEM/schema.sql`**: a tabela `ideas` já existe desde a migration inicial. Não é
  preciso migration nova.
- **P-07**: ação relevante emite evento `dot.case` no passado.
- **CLAUDE.md, princípio nº 1**: o atalho é atalho, não é o único caminho. Existe botão visível.

## 4. Decisão sobre a lista, e por que ela entra

O bloco no backlog fala só da captura. A RN-10.2 diz que a ideia "vai para a lista de ideias", e
capturar sem nunca mostrar transforma a gaveta num buraco: o usuário não tem como confiar que
gravou, e o princípio nº 1 existe justamente para tirar essa carga.

Por isso a gaveta mostra as ideias abertas logo abaixo do campo, com `CartaoIdeia`, e permite
descartar uma. Descartar é o mínimo para a lista não virar entulho. Uma página própria de ideias,
com filtro e busca, fica para depois e não bloqueia nada.

## 5. Decisão sobre o atalho

`Ctrl+I` no Windows e Linux, `Cmd+I` no macOS, com `preventDefault`. É o mnemônico de "ideia" e
não é usado por Chrome nem Edge, que são o caso comum numa máquina Windows. O Firefox usa `Ctrl+I`
para informações da página em algumas versões, e nem sempre deixa o atalho ser cancelado, então o
botão visível na barra lateral é o caminho garantido, não um extra. `Escape` fecha.

O atalho não dispara enquanto o usuário digita em campo de texto ou área de texto, exceto dentro
da própria gaveta, onde não faz sentido reabrir o que já está aberto.

## 6. Arquivos afetados

Criados:

- `shared/schemas/ideia.js` — schema Zod da ideia, do pedido de criação e da lista.
- `server/modules/ideias/servico.js`, `rotas.js` e `servico.test.js`.
- `src/services/ideias.js` e `ideias.test.js`.
- `src/components/ideias/CartaoIdeia/CartaoIdeia.jsx`, `.module.css` e `.test.jsx`.
- `src/components/ideias/GavetaIdeias/GavetaIdeias.jsx`, `.module.css` e `.test.jsx`.
- `src/hooks/useAtalhoGlobal.js` e `useAtalhoGlobal.test.js`.

Modificados:

- `server/app.js` — registra o módulo de ideias.
- `src/components/layout/LayoutApp.jsx` e `.module.css` — botão e gaveta.
- `src/mensagens.js` — textos novos.
- `docs/06_COMPONENTES/README.md` e `docs/09_BACKLOG/mvp.md` — estado do bloco.

## 7. Critérios de aceite

### Servidor

1. `POST /api/ideias` grava título obrigatório e próximo passo opcional, e devolve a ideia criada
   com `id`, `estado: 'aberta'` e `criadoEm`.
2. Título vazio, só espaços, ou acima de 120 caracteres é recusado com `FORGE_VALIDATION` e o
   campo apontado. Próximo passo acima de 500 caracteres também.
3. `origem` é gravada quando enviada, limitada a 80 caracteres, e serve para saber de que tela a
   ideia saiu. Ausente vira `null`, nunca erro.
4. `GET /api/ideias` devolve as ideias abertas, mais recentes primeiro, sem as descartadas.
5. `PATCH /api/ideias/:id` com `{ estado: 'descartada' }` descarta. Estado fora do enum do schema
   é recusado. Ideia inexistente responde `FORGE_NOT_FOUND`.
6. Criar emite o evento `ideia.registrada` e descartar emite `ideia.descartada`, ambos
   fire-and-forget, sem bloquear a resposta.
7. Toda entrada passa por Zod na fronteira, e a saída é validada pelo `schemaSaida` da rota, como
   nas demais.
8. Nenhuma consulta usa `SELECT *` para montar a resposta; os campos vão nomeados na projeção.

### Gaveta

9. O botão na barra lateral abre a gaveta de qualquer tela, e a gaveta é um diálogo modal com
   `role="dialog"` e `aria-modal`, rotulado pelo próprio título.
10. `Ctrl+I`, ou `Cmd+I` no macOS, abre a gaveta de qualquer tela. `Escape` fecha.
11. O atalho não dispara enquanto o foco está em `input`, `textarea` ou elemento editável fora da
    gaveta.
12. Ao abrir, o foco vai para o campo de título. Ao fechar, o foco volta ao elemento que estava
    focado antes de abrir. É isso que "volta para onde estava" significa na prática.
13. Gravar não muda de rota, não abre projeto e não fecha o que estava em andamento. A rota
    depois de gravar é a mesma de antes.
14. Só o título é obrigatório. O próximo passo é opcional e diz isso no microtexto.
15. Gravar com sucesso limpa os campos, mostra confirmação e mantém a gaveta aberta com a ideia
    nova no topo da lista.
16. Erro ao gravar aparece legível e não perde o que o usuário digitou.
17. Enquanto grava, o botão mostra carregando e não aceita duplo clique.
18. A lista mostra estado de carregando, de vazio e de erro, cada um com texto humano.
19. Descartar uma ideia tira ela da lista sem confirmação extra, porque a ação é barata e
    reversível pelo banco, e não é destrutiva do ponto de vista do usuário.

### Sempre

20. Componente nunca chama `fetch`. Tudo passa por `src/services/ideias.js`.
21. CSS em CSS Modules co-localizado com tokens `--forge-*`. Nenhuma cor, fonte ou espaçamento
    hardcodado, nenhum estilo inline.
22. Todo texto visível sai de `src/mensagens.js`.
23. `npm test` verde e `npm run build` sem erro, no Windows.
24. Sem `console.log` esquecido e sem `TODO` sem justificativa escrita ao lado.

## 8. Edge cases conhecidos

- **Gaveta aberta com a API fora do ar.** A lista mostra erro, e o formulário continua utilizável:
  a tentativa de gravar falha com mensagem, sem apagar o texto.
- **Atalho apertado com a gaveta já aberta.** Não faz nada e não rouba o foco de onde o usuário
  está digitando dentro dela.
- **Título com espaço nas pontas.** É aparado antes de gravar. Título que vira vazio depois do
  aparo é recusado como vazio.
- **Duas gavetas.** Não existem. O estado vive no `LayoutApp`, então há uma só.
- **Lista longa.** As ideias abertas podem crescer sem limite. A gaveta rola dentro dela mesma,
  com altura limitada.
- **Ideia descartada por outra aba.** O `PATCH` numa ideia já descartada não é erro, é idempotente.

## 9. Definição de "aprovado sem ressalvas"

Todos os 24 critérios em sim, `npm test` verde e `npm run build` sem erro no Windows, o fluxo
exercido no servidor de verdade e não só em teste, sem TODO pendente, sem `console.log` esquecido,
e sem regressão nos blocos 1 a 8.

## 10. Review (2026-09-08)

**Aprovado sem ressalvas.** 24 de 24 critérios cobertos. `npm test` verde com 576 passando e 1
pulado, `npm run build` sem erro, em Windows 11.

### Validação no produto real

O módulo foi exercido no servidor de verdade, com `curl`: 401 sem token; criação aparando o título
e gravando próximo passo vazio como `null`; título só de espaços apontando o campo `titulo` com
mensagem humana; campo desconhecido e estado fora do enum recusados pelo schema estrito; 404 em
ideia inexistente; lista na ordem certa e sem descartadas; descarte idempotente nas duas chamadas.
Os eventos `ideia.registrada` e `ideia.descartada` ficaram gravados em `events`, o de descarte uma
vez só apesar dos dois `PATCH`. As ideias de teste foram apagadas do banco depois.

### Desvios do spec

1. **Foco no campo de título.** O átomo `Campo` não encaminha ref, e o spec assumia que sim. Em
   vez de alterar um átomo usado por todo o wizard, a gaveta usa a forma com children do `Campo`,
   que já existia justamente para controle vindo de fora.
2. **`mutationFn` do descarte encapsulada.** Passar `descartarIdeia` direto entrega o contexto do
   React Query como segundo argumento do serviço. O código do bloco 7 faz isso, e aqui foi
   encapsulado: serviço não deve receber o que não pediu.

### Corrigido durante a review

Os critérios 9 a 13 vivem no `LayoutApp`, que não tinha teste nenhum. Ganharam um: o botão e o
atalho abrindo a gaveta de qualquer tela, o atalho respeitando quem está digitando num campo, o
foco voltando ao botão que abriu, guardar sem mudar de tela e sem fechar a gaveta, e o atalho
visível na barra lateral.

### Fica para uma próxima rodada

- Página própria de ideias, com filtro e busca.
- Transformar ideia em projeto, que é o estado `virou_projeto` já previsto no schema.
- Uma armadilha do teste do `LayoutApp` vale registro: `mutationFn` recebendo a função de serviço
  direto passa o contexto do React Query adiante. O bloco 7 tem o mesmo padrão em
  `Materializar.jsx`, e vale revisar quando alguém encostar naquele arquivo.
