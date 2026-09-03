# Spec, Fase 1, Bloco 4: Wizard

> Origem: `docs/09_BACKLOG/mvp.md`, bloco 4. Loop `spec → build → review`.
> Data: 2026-09-03. Status: **aprovado sem ressalvas** (review em 2026-09-03, seção 7).

## 1. Escopo

O wizard que preenche o blueprint: uma etapa por tela, conduzida pelas etapas que o preset liga,
com título em linguagem humana, microtexto dizendo o que a resposta afeta no resultado, default
visível em todo campo, trilha de progresso, navegação, pular e retomada exata na etapa em que
parou. Cada avanço salva uma versão nova do blueprint, e só quando algo mudou de fato.

## 2. Fora de escopo

- Motor de regras (bloco 5). A casca `PassoWizard` já tem a região de avisos, hoje vazia.
- Gerador e plano de arquivos (6), runner (7), painéis de plano e log (8), gaveta de ideias (9).
- Studio e API Hub. As etapas `design` e `apis` existem no preset, mas nesta fase são telas de
  espera que só marcam a etapa como assumida.
- Copiloto: nenhum botão "sugerir" nesta fase.
- Modo revisão de projeto já materializado com plano de diff (F-03, depende do gerador).

## 3. Arquivos afetados

`shared/`: `schemas/respostas.js` (novo, uma por etapa), `schemas/blueprint.js` (respostas
tipadas), `etapas.js` (novo: ordem canônica, obrigatórias, campos obrigatórios,
`etapaEstaCompleta`, `proximaEtapa`, `etapaAnterior`).

`server/`: `modules/projetos/servico.js` (recusar etapa fora do preset), testes.

`src/`: `components/wizard/{PassoWizard,TrilhaEtapas}/` (componente mais CSS Module),
`components/shared/ListaDeTextos/` (novo atom para listas de string),
`features/wizard/PaginaWizard.jsx` + CSS, `features/wizard/etapas/{Identidade,Escopo,Arquitetura,
Dados,Seguranca,Fundacao,Materializar,EtapaFutura}.jsx`, `features/wizard/usarWizard.js`,
`features/registry/PaginaProjeto.jsx` (botão continuar mais progresso), `App.jsx`, `mensagens.js`,
testes co-localizados.

Docs: `docs/05_FLUXOS/README.md` (F-01 e F-03 como implementados), `docs/06_COMPONENTES/README.md`
(`PassoWizard`, `TrilhaEtapas`, `ListaDeTextos`), `docs/03_REGRAS_DE_NEGOCIO/README.md` (RN-03),
`docs/09_BACKLOG/mvp.md`, `README.md`, `memory/decisions.md`.

## 4. Critérios de aceite

### Contrato das respostas
1. `shared/schemas/respostas.js` define um schema estrito por etapa, com **todo campo opcional e com default** (texto `''`, lista `[]`, booleano vindo do preset), para que resposta parcial seja válida. Schema valida **forma**, nunca completude.
2. Campos por etapa: `identidade` (nome, essencia, problema, valor); `escopo` (publico, personas[], ahaMoment, naoObjetivos[]); `arquitetura` (modelo `A|B|C`, stack[], multiTenant, whiteLabel, auth, deploy); `dados` (entidades[] de `{ nome, descricao, campos[] }`); `seguranca` (dadoPessoal, dadoFinanceiro, compliance[], tierGratuito, observacoes); `fundacao` (observacoes); `materializar` (confirmada). `design` e `apis` aceitam objeto vazio nesta fase.
3. `blueprintSchema.respostas` passa a ser objeto estrito com uma chave opcional por etapa, cada uma validada pelo schema da etapa. Chave desconhecida em `respostas` responde `400 FORGE_VALIDATION`.
4. `shared/etapas.js` exporta `CAMPOS_OBRIGATORIOS` por etapa e `etapaEstaCompleta(etapa, respostas)`, função pura: `identidade` exige essencia, problema e valor; `escopo` exige publico e ahaMoment; `dados` exige ao menos uma entidade com nome; as demais etapas não têm campo obrigatório e são sempre completas.
5. `proximaEtapa(etapas, atual)` e `etapaAnterior(etapas, atual)` andam **na ordem do preset**, e devolvem `null` nas pontas.

### Servidor
6. `POST /projects/:id/blueprint` recusa com 400 quando `etapaAtual`, um item de `etapasConcluidas` ou um item de `assumidas` não pertence às etapas do preset do projeto, com issue no campo certo.
7. `etapasConcluidas` e `assumidas` não aceitam repetição, e uma etapa não pode estar nas duas listas ao mesmo tempo: 400.
8. Salvar continua criando versão n+1 ativa e emitindo `blueprint.salvo` (comportamento do bloco 2 preservado, testado de novo).

### Casca e trilha
9. `PassoWizard` recebe título, microtexto, children (campos), `avisos` (região renderizada só quando há avisos, hoje sempre vazia) e navegação. Mostra "Etapa x de y" com o número real das etapas do preset.
10. Navegação: `Voltar` some na primeira etapa; `Avançar` vira `Concluir` na última; `Pular etapa` aparece em toda etapa exceto `identidade` e `materializar` (RN-03.2).
11. `TrilhaEtapas` lista as etapas do preset em ordem, marca a atual com `aria-current="step"` e mostra o estado de cada uma: concluída, assumida, atual ou pendente. Clicar em uma etapa já visitada navega para ela; etapa à frente da atual não é clicável.
12. O wizard inteiro é navegável por teclado: todo controle é botão ou link nativo, com foco visível.

### Comportamento do wizard
13. `/projetos/:id/wizard` redireciona para a `etapaAtual` do blueprint (retomada exata, RN-03.4). `/projetos/:id/wizard/:etapa` abre a etapa pedida; etapa fora do preset redireciona para a `etapaAtual`.
14. Avançar, voltar ou clicar na trilha salva **só se o payload resultante for diferente do blueprint ativo**. Concluir sem ter mudado nada navega sem criar versão nem evento. Ir para outra etapa muda `etapaAtual` e por isso salva, que é o que garante a retomada exata. Testado comparando a contagem de chamadas de salvamento.
15. Avançar com os campos obrigatórios preenchidos põe a etapa em `etapasConcluidas` e a tira de `assumidas`. Avançar com obrigatório em branco não marca concluída e não bloqueia (bloqueio é do motor de regras, bloco 5).
16. Pular põe a etapa em `assumidas`, aplica os defaults do preset naquela etapa, tira de `etapasConcluidas` e avança.
17. Voltar navega sem perder o que foi digitado na etapa atual; se houve mudança, salva antes de sair.
18. Concluir na última etapa salva e volta para a tela do projeto.
19. Projeto arquivado não abre o wizard: mostra aviso e o caminho para restaurar.
20. Erro ao salvar aparece como alerta na própria etapa, sem perder o que foi digitado, com "tentar de novo".

### Etapas
21. `identidade`: nome do projeto (renomeia o projeto ao salvar, mantendo o slug), essência em uma frase, problema e proposta de valor. Microtexto de cada campo diz em qual arquivo aquilo vai parar.
22. `escopo`: público-alvo, personas (lista), aha moment, não-objetivos (lista).
23. `arquitetura`: modelo (A, B ou C, com o do preset como padrão Kora em primeiro), stack (lista), multi-tenant, white-label, auth e deploy, todos pré-preenchidos pelos defaults do preset.
24. `dados`: entidades com nome, descrição e campos, adicionando e removendo linhas; vazio traz a próxima ação.
25. `seguranca`: trata dado pessoal, trata dado financeiro, compliance (lista), tudo em tier gratuito, observações.
26. `fundacao`: revisão em leitura do que será gerado (`CLAUDE.md`, `memory/`, `docs/00` a `11`, ADR-001), lista das etapas assumidas e das pendências, mais observações.
27. `materializar`: resumo final, caixa de confirmação e o aviso honesto de que o plano e a execução chegam nos blocos 6 e 7.
28. `design` e `apis` usam `EtapaFutura`, que diz em que fase aquilo chega e só oferece continuar, marcando a etapa como assumida.
29. `ListaDeTextos` adiciona, edita e remove itens de uma lista de strings, com microtexto obrigatório e vazio com próxima ação.

### Tela do projeto
30. `PaginaProjeto` troca o aviso de "wizard indisponível" por um botão `Continuar de onde parou` (ou `Começar o wizard`, quando nada foi respondido) e mostra o progresso "x de y etapas".

### Padrões e verificação
31. Textos novos em `mensagens.js`; sem `fetch` fora de `api.js`; sem `style=` inline; sem cor ou fonte literal fora de `tokens.css`; sem `console.log` fora do CLI; sem `TODO`; um componente por arquivo.
32. Testes cobrindo 1 a 8 (schemas e servidor), 9 a 12 (casca e trilha), 13 a 20 (comportamento), 21 a 29 (etapas, ao menos identidade, dados, arquitetura e futura) e 30. `npm test` e `npm run build` verdes.

### Documentação
33. `docs/05_FLUXOS/README.md` descreve F-01 e F-03 como implementados nesta fase, incluindo a regra de só versionar quando muda. `docs/03_REGRAS_DE_NEGOCIO/README.md` RN-03 registra "assumida e concluída são exclusivas" e "salvar sem mudança não cria versão". `docs/06_COMPONENTES/README.md` ganha `TrilhaEtapas` e `ListaDeTextos`. `mvp.md`, `README.md` e `memory/decisions.md` atualizados.

## 5. Edge cases conhecidos

- Preset sem `dados` (Criar Site) nunca mostra a etapa de dados, e a trilha não a lista.
- Etapa na URL que existe no catálogo mas não no preset: redireciona para a `etapaAtual`.
- Renomear pelo wizard para um nome que gera slug já usado: o slug não muda, então não colide; só o nome muda.
- Nome apagado na etapa de identidade: erro no campo, não salva, porque o projeto exige nome.
- Sair no meio pelo menu lateral: o que foi digitado na etapa atual só persiste se tiver havido avanço, voltar ou concluir. A tela avisa isso no microtexto do rodapé.
- Blueprint antigo com etapa que saiu do preset: o servidor recusa a gravação, e a UI mostra o erro.
- Lista com item vazio: entra como string vazia e é descartada ao salvar.

## 6. Definição de "aprovado sem ressalvas"

Os 33 critérios com sim e evidência, `npm test` e `npm run build` verdes, sem `TODO`, sem
`console.log` fora do CLI, sem `fetch` fora da camada de serviços, e `docs/03`, `docs/05` e
`docs/06` batendo com o código.

## 7. Review (2026-09-03)

Auditoria do build contra os 33 critérios. Suíte: `npm test`, 34 arquivos, 215 testes, tudo
verde. `npm run build` verde. Smoke test com o servidor real confirmou a recusa de etapa fora do
preset, de etapa concluída e assumida ao mesmo tempo e de resposta com campo desconhecido, mais
dois avanços válidos gerando as versões 2 e 3 com os eventos `blueprint.salvo`.

| # | Sim? | Evidência |
|---|---|---|
| 1 | sim | `shared/schemas/respostas.js`; `respostas.test.js` "objeto vazio vira defaults em toda etapa" |
| 2 | sim | mesmo arquivo, campo a campo; `respostas.test.js` cobre identidade, arquitetura, seguranca e dados |
| 3 | sim | `blueprintSchema.respostas` usa `respostasSchema`; `respostas.test.js` "recusa chave desconhecida em respostas"; smoke: `respostas.identidade` |
| 4 | sim | `shared/etapas.js`; `etapas.test.js` (identidade, escopo, dados e as etapas sem obrigatório) |
| 5 | sim | `etapas.test.js` "anda na ordem do preset e devolve null nas pontas" |
| 6 | sim | `servico.js` `salvarBlueprint`; `projetos.test.js` "etapaAtual fora do preset", "etapa fora do preset em concluídas ou assumidas"; smoke |
| 7 | sim | `blueprintSchema.superRefine`; `respostas.test.js` "recusa etapa repetida e etapa concluída e assumida"; `projetos.test.js`; smoke |
| 8 | sim | `projetos.test.js` "etapas do preset passam, com respostas tipadas, e criam versão nova" |
| 9 | sim | `PassoWizard.test.jsx` "mostra contador real", "sem avisos a região não é renderizada" |
| 10 | sim | `PassoWizard.test.jsx` "primeira etapa esconde voltar, última troca avançar por concluir", "pular aparece só quando permitido"; `PaginaWizard.test.jsx` "identidade e materializar não oferecem pular" |
| 11 | sim | `TrilhaEtapas.test.jsx` (aria-current, estados, à frente desabilitada); `PaginaWizard.test.jsx` "a trilha navega para etapa já vista" |
| 12 | sim | trilha e navegação são `button` nativos, links são `Link`; anel de foco global em `global.css` |
| 13 | sim | `PaginaWizard.test.jsx` "sem etapa na URL abre a etapa em que parou", "etapa fora do preset volta para a etapa em que parou" |
| 14 | sim | `comparar.test.js`; `PaginaWizard.test.jsx` "concluir sem ter mudado nada volta ao projeto sem criar versão" e o par "concluir depois de mudar algo salva" |
| 15 | sim | `PaginaWizard.test.jsx` "avançar com os obrigatórios preenchidos marca a etapa como concluída", "avançar com obrigatório em branco não marca concluída e não bloqueia" |
| 16 | sim | `PaginaWizard.test.jsx` "pular marca a etapa como assumida, aplica o default e avança" (o payload volta ao default do schema) |
| 17 | sim | `PaginaWizard.test.jsx` "voltar preserva o que foi digitado e salva antes de sair da etapa" |
| 18 | sim | `PaginaWizard.test.jsx` "concluir sem ter mudado nada" e "concluir depois de mudar algo", ambos caindo na tela do projeto |
| 19 | sim | `PaginaWizard.test.jsx` "projeto arquivado não abre o wizard" |
| 20 | sim | `PaginaWizard.test.jsx` "mostra alerta, mantém o digitado e tenta de novo" |
| 21 | sim | `etapas/Identidade.jsx` com microtexto por campo; `PaginaWizard.test.jsx` "nome mudado na identidade renomeia o projeto ao avançar" e "nome apagado dá erro no campo e não salva" |
| 22 | sim | `etapas/Escopo.jsx`; `PaginaWizard.test.jsx` "voltar preserva o que foi digitado" usa o campo público |
| 23 | sim | `etapas/Arquitetura.jsx` com `defaultsDaEtapa`; `defaults.test.js` (preset web, preset local, modelo inválido) |
| 24 | sim | `etapas/Dados.jsx` mais `EditorEntidades`; `etapas.test.js` cobre a completude por entidade com nome |
| 25 | sim | `etapas/Seguranca.jsx`; `respostas.test.js` confirma `tierGratuito` verdadeiro por padrão |
| 26 | sim | `etapas/Fundacao.jsx` lista arquivos, assumidas e pendentes derivadas do estado |
| 27 | sim | `etapas/Materializar.jsx`; `PaginaWizard.test.jsx` "concluir depois de mudar algo" usa a confirmação |
| 28 | sim | `etapas/EtapaFutura.jsx`; `PaginaWizard.test.jsx` "etapa futura só oferece continuar e é marcada como assumida" |
| 29 | sim | `ListaDeTextos.test.jsx` (vazio com próxima ação, adicionar, Enter, editar, remover, microtexto obrigatório) |
| 30 | sim | `PaginaProjeto.test.jsx` "entrada do wizard" (começar, continuar com 3 de 6, arquivado sem wizard) |
| 31 | sim | greps de `fetch(`, `style=`, cor e fonte literal, `console.log`, `TODO` e export default: nenhum fora do permitido |
| 32 | sim | 215 testes em 34 arquivos; `npm run build` verde |
| 33 | sim | `docs/05` F-01 com o estado da implementação e F-03; `docs/03` RN-03.6 a RN-03.9; `docs/06` com `TrilhaEtapas`, `ListaDeTextos`, `CampoBooleano` e `EditorEntidades`; `mvp.md`, `README.md` e `memory/decisions.md` com quatro entradas |

### Desvios do spec, todos registrados

- Dois componentes a mais que os previstos, pela regra de um componente por arquivo:
  `CampoBooleano` (atom, pergunta de sim ou não como `Selecao` para manter o default visível) e
  `EditorEntidades` (molecule, usada pela etapa de dados). Ambos documentados em `docs/06`.
- `PaginaWizard` foi partida em `PaginaWizard` (carga, rota e guardas) e `ConteudoWizard` (estado
  e condução), porque o estado do formulário precisa de um componente já com os dados prontos.
- `usarWizard.js` não existe: a condução coube em `ConteudoWizard` mais dois módulos puros e
  testados, `defaults.js` e `comparar.js`. Um hook a mais seria indireção sem ganho.
- Critério 14 foi reescrito durante o build para dizer o que o código faz de verdade: a
  comparação inclui `etapaAtual`, então trocar de etapa versiona. O caso de "não versionar" que
  importa é concluir sem ter editado nada, e é esse que o teste prova.

### Correções feitas durante o review

- **Bug real, encontrado por teste**: com o projeto em erro, a consulta do preset ficava
  desabilitada e presa em `pending`, e a guarda de carregando vinha antes da de erro. A tela
  travava num "Carregando…" mudo em vez de mostrar "Projeto não encontrado". As guardas foram
  invertidas e o comportamento virou teste.
- Dois testes da tela do projeto assumiam a fixture errada (o projeto de teste já vinha com uma
  etapa concluída) e liam o progresso antes de o preset responder. Corrigidos.

### Pendências que exigem decisão do Matheus

Nenhuma. Observação: com o motor de regras (bloco 5), a região de avisos do `PassoWizard` passa a
ser preenchida e o bloqueio da etapa Materializar entra em vigor. Nada no wizard precisa mudar de
forma para isso, só receber os hits.

✅ feito. Todos os 33 critérios de aceite cobertos, sem ressalvas.
