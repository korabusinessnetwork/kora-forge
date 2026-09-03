# Spec, Fase 1, Bloco 8: Telas de fechamento

> Origem: `docs/09_BACKLOG/mvp.md`, bloco 8. Loop `spec → build → review`.
> Data: 2026-09-03. Status: **em construção**. É o último bloco da Fase 1.

## 1. Escopo

Fechar o fluxo de materialização na tela: **ver o que está acontecendo enquanto acontece** e
**saber o que fazer quando termina**.

Três peças no escopo do `mvp.md`:

1. **Painel do plano**, agrupado por pasta, com conflitos no topo. Já entregue no bloco 6
   (`PainelPlano`). Este bloco não o refaz; só confere que ele continua atendendo.
2. **Painel de log ao vivo**: `PainelLog` consumindo `WS /api/ws/runs/:runId`, com stdout e
   stderr diferenciados, autoscroll com trava e o botão de parar.
3. **Tela final**: caminho no disco, resumo do que nasceu, e atalho para abrir no editor.

Fecha também o defeito de dev encontrado ao ler o caminho real da conexão: o proxy do Vite não
encaminha *upgrade* de WebSocket sem `ws: true`, então em `npm run forge` o log ao vivo nunca
conectaria. O servidor está certo; a ponte de desenvolvimento é que não existia.

## 2. Fora de escopo

- `VisualizadorDiff` (diff linha a linha de arquivo em conflito). Está previsto em
  `docs/06_COMPONENTES` mas não está no bloco 8 do `mvp.md`. O conflito continua declarado como
  ação `sobrescrever` com os dois tamanhos, que é o que o bloco 6 entregou. Vira item de backlog.
- Gaveta de ideias (bloco 9).
- Rota HTTP para reler `command_logs` de execução antiga. O histórico ao vivo vem do transmissor,
  que já guarda por run; log de projeto materializado semanas atrás é outra feature.
- Abrir o editor **executando processo**. `code` não está na whitelist e ampliá-la é decisão de
  padrão (C7, ADR-002), não de tela. O atalho é um link `vscode://`, resolvido pelo sistema
  operacional, sem o Forge executar nada.
- Studio, API Hub, cofre, copiloto.
- A decisão sobre R-07 (`--legacy-peer-deps`). Continua aberta e é do dono.

## 3. Arquivos afetados

**`shared/`**
- `schemas/materializacao.js`: `eventoLogSchema` (o contrato que o transmissor publica).

**`src/services/`**
- `logDeRun.js` (novo): único ponto que abre o WebSocket. Monta a URL, põe o token no
  subprotocolo, valida cada evento pelo schema e devolve uma função de cancelar.

**`src/hooks/`**
- `useLogDoRun.js` (novo): assina o run, acumula as linhas, expõe estado da conexão.

**`src/components/plano/`**
- `PainelLog/{PainelLog.jsx,PainelLog.module.css,PainelLog.test.jsx}` (novo).
- `TelaFinal/{TelaFinal.jsx,TelaFinal.module.css,TelaFinal.test.jsx}` (novo).
- `PainelMaterializacao/`: cada comando com `runId` vira selecionável, para o log poder seguir
  qualquer um dos comandos, não só o que está rodando.

**`src/features/wizard/etapas/`**
- `Materializar.jsx`: liga o painel de log ao lado do `PainelMaterializacao` e mostra a
  `TelaFinal` quando a materialização conclui.

**`src/`**
- `mensagens.js`: textos novos.
- `utils/caminhoDeEditor.js` (novo) e teste: monta a URL `vscode://file/…` a partir de um caminho
  de disco, com Windows normalizado e componente codificado.

**Raiz**
- `vite.config.js`: `ws: true` no proxy de `/api`, mais `vite.config.test.js` guardando isso.

**Docs**
- `docs/06_COMPONENTES/README.md`: `TelaFinal` no catálogo (regra 5: componente novo entra no
  catálogo antes de existir), e `PainelLog` com o comportamento real.
- `docs/07_APIS/README.md`: formato dos eventos do WebSocket, campo a campo.
- `docs/05_FLUXOS/README.md`: F-01 e F-02 com o fechamento implementado.
- `docs/09_BACKLOG/mvp.md`: bloco 8 entregue; `VisualizadorDiff` registrado como adiado.
- `memory/decisions.md`, `memory/bugs.md`, `README.md`, `INSTALACAO.md`.

## 4. Critérios de aceite

### O WebSocket conecta de verdade, inclusive em desenvolvimento
1. `vite.config.js` declara `ws: true` no proxy de `/api`, e um teste lê a configuração resolvida e falha se a chave sumir. Sem ela o `upgrade` não é encaminhado ao Fastify e o log ao vivo fica mudo em `npm run forge`, que é o único jeito de usar o produto em dev.
2. O token vai no subprotocolo (`new WebSocket(url, ['forge-token', token])`), nunca em query string nem em header. Um teste confere os dois valores e a ordem.
3. A URL é derivada de `location` (`ws:` para `http:`, `wss:` para `https:`) e do caminho `/api/ws/runs/:runId`, com o `runId` codificado. O componente nunca monta URL; quem monta é o serviço.
4. Sem token de sessão, o serviço não abre conexão nenhuma e reporta `FORGE_UNAUTHORIZED` para a tela, em vez de tentar e falhar em silêncio.

### Contrato dos eventos
5. `eventoLogSchema` em `shared/` cobre os dois eventos que o transmissor publica: `{ tipo: 'linha', stream: 'stdout'|'stderr', linha, ts }` e `{ tipo: 'fim', estado, exitCode, erro }`. Ele é a fonte de verdade; `docs/07` passa a descrever exatamente esses campos.
6. Mensagem que não é JSON, ou que é JSON fora do schema, é **descartada** com um contador de descartes, e não derruba o painel nem interrompe as linhas seguintes. O log é observação: um evento estranho não pode matar a tela que mostra a execução.
7. Conteúdo de linha vinda do processo é **dado, nunca instrução nem markup** (P-05). Renderizado como texto, sem `dangerouslySetInnerHTML` em lugar nenhum, e um teste tenta injetar `<img onerror>` e confere que o texto aparece literal.

### PainelLog
8. Renderiza `stdout` e `stderr` visualmente diferenciados, e a diferença não é só cor: `stderr` fica marcado no DOM (`data-stream`) e acessível a leitor de tela.
9. Os quatro estados obrigatórios (regra 4 do design system): **conectando**, **vazio** (conectado e ainda sem saída, com a próxima ação escrita), **erro** (com o motivo e o botão de tentar de novo) e **sucesso**.
10. Autoscroll com trava: acompanha o fim enquanto o usuário está no fim; se ele rolar para cima, a rolagem automática **para** e aparece a ação de voltar para o fim, que reativa. Nunca puxa a tela de baixo de quem está lendo.
11. Comando em execução mostra o botão de parar dentro do painel de log, e não só na fila. Comando terminado não mostra.
12. O painel é o log de **um** run por vez, e diz de qual comando é.
13. A contagem de linhas fica visível, porque log sem número não deixa perceber que ele está vivo (regra 10: progresso sempre com número).

### O log ao lado da fila, não no lugar dela
14. `PainelMaterializacao` continua mostrando arquivos, fila e as três decisões, exatamente como no bloco 7. Os testes do bloco 7 continuam passando sem alteração de expectativa.
15. Cada comando que já tem `runId` é selecionável e troca o log exibido, com o selecionado marcado (`aria-current`). Comando ainda pendente não é selecionável, porque não existe run para mostrar.
16. Sem seleção manual, o log segue sozinho o comando **em execução**; não havendo nenhum, segue o último que tem `runId`. O usuário não precisa clicar para ver o que está acontecendo agora.
17. Uma seleção manual é respeitada e não é atropelada pelo avanço da fila.

### Tela final
18. Aparece quando `materializacao.estado === 'concluida'`, e só então.
19. Mostra o caminho no disco em `Chave` (mono, com copiar), o nome do projeto e o resumo: arquivos criados, sobrescritos e pulados, e quantos comandos rodaram.
20. Traz o atalho **abrir no editor** como link `vscode://file/<caminho>`, com o caminho normalizado (barra invertida do Windows vira barra) e codificado. Nada é executado pelo Forge: quem resolve o esquema é o sistema operacional.
21. O microtexto do atalho diz que ele depende do VS Code instalado e que o caminho ao lado pode ser copiado. Atalho que pode não fazer nada sem avisar seria estado invisível, contra o princípio nº 1.
22. `caminhoDeEditor` tem teste com caminho do Windows, caminho POSIX, caminho com espaço e caminho com acento (risco R-01), e devolve `null` para caminho vazio, caso em que o link não é renderizado.
23. Traz a próxima ação explícita: voltar para o projeto no Registry. A tela final nunca é um beco sem saída.
24. Materialização **abortada** não mostra a tela final; mostra o que ficou no disco e diz onde parou, porque o `ADR-002` decidiu que não existe rollback.

### Padrões e verificação
25. Nenhum componente chama `fetch` nem abre `WebSocket` direto: os dois só existem em `src/services/`. Um teste varre `src/components` e `src/features` e falha se encontrar qualquer um.
26. Sem `style=` em componente de produto, sem cor, fonte, raio ou espaçamento literal fora de `tokens.css`, sem `console.log`, sem `TODO`, um componente por arquivo.
27. Toda string de UI nova mora em `mensagens.js`.
28. `npm test` e `npm run build` verdes **no Windows**, que é o ambiente primário (T-02).

### Documentação
29. `docs/06` lista `TelaFinal` e descreve `PainelLog` como implementado. `docs/07` descreve os eventos do WS campo a campo. `docs/05` marca o fechamento de F-01 e F-02.
30. `mvp.md` marca o bloco 8 como entregue e registra `VisualizadorDiff` como adiado, com o motivo. `memory/decisions.md` registra as decisões deste bloco.

### Critério de aceite da Fase 1 (rodado depois, com o produto de verdade)
31. Os 8 itens de "Critério de aceite da fase inteira" do `mvp.md` verificados um a um, com evidência, criando um projeto do começo ao fim sem tocar no terminal, em menos de 10 minutos.

## 5. Edge cases conhecidos

- **Servidor reiniciado com a materialização em memória**: `GET /materializar` volta `null`, e a
  tela precisa voltar ao plano em vez de ficar presa em um painel vazio.
- **Run inexistente ou já esquecido**: o transmissor cria o canal vazio e a conexão fica aberta
  sem nunca receber nada. A tela mostra o estado **vazio**, não um carregando infinito.
- **Conexão cai no meio**: a execução continua no servidor. Reconectar traz o histórico inteiro,
  então a reconexão precisa **substituir** as linhas, nunca concatenar, ou o log duplica.
- **Processo que escreve muito**: o painel corta o que renderiza a um teto de linhas, dizendo
  quantas ficaram de fora. Nunca joga fora em silêncio.
- **Linha vazia** vinda do processo: continua sendo uma linha, e não some do log.
- **Comando de longa duração** (`npm run dev`): a materialização conclui com ele vivo, então a
  tela final e um log ainda correndo coexistem, e o parar continua valendo.
- **Trocar de comando selecionado** enquanto o anterior transmite: a assinatura antiga é
  cancelada, e nenhuma linha do run antigo entra no novo.
- **Caminho com espaço ou acento** no atalho do editor (R-01).
- **`clipboard` indisponível**: `Chave` já trata; a tela final não pode assumir que copiar existe.

## 6. Definição de "aprovado sem ressalvas"

Os 31 critérios com sim e evidência nomeada (teste, arquivo ou checagem rodada), `npm test` e
`npm run build` verdes no Windows, nenhum `fetch` ou `WebSocket` fora de `src/services/`, e uma
validação com o **produto real**: `npm run forge`, um projeto criado do zero pela interface, o log
ao vivo chegando pelo WebSocket através do proxy do Vite, e a tela final com o caminho certo.
Sem essa última parte o bloco não é declarado feito, porque os três defeitos mais sérios da Fase 1
apareceram rodando o servidor, não nos testes.

---

## 7. Auditoria

Feita em 2026-09-03, depois de `npm test` (60 arquivos, **505 testes**, todos verdes) e
`npm run build` (limpo, `dist/assets/index-CTRLX_Ux.js 371.08 kB`), no Windows 11, que é o
ambiente primário (T-02).

### O WebSocket conecta de verdade, inclusive em desenvolvimento

| # | Sim | Evidência |
|---|---|---|
| 1 | sim | `vite.config.js` tem `ws: true` no proxy de `/api`. Teste `o proxy de /api encaminha WebSocket`, em `vite.config.test.js`, lê a configuração resolvida. Confirmado no produto: conexão aberta em `ws://127.0.0.1:5173/api/ws/runs/<runId>`, com o proxy no caminho |
| 2 | sim | `assinarLogDoRun` passa `[MARCADOR_DE_TOKEN, token]`. Teste `manda o token no subprotocolo, nunca na URL`. No produto, o servidor negociou o protocolo `forge-token` |
| 3 | sim | `urlDoRun` em `src/services/logDeRun.js`. Testes `usa ws: em http e wss: em https, com o host da página` e `codifica o runId, para id estranho não virar outro caminho` |
| 4 | sim | Teste `sem token, não abre conexão nenhuma e diz que não está autorizado` |

### Contrato dos eventos

| # | Sim | Evidência |
|---|---|---|
| 5 | sim | `eventoLinhaSchema`, `eventoFimSchema` e `eventoLogSchema` em `shared/schemas/materializacao.js`. O runner tem teste de laço conferindo que **todo** evento publicado valida contra o schema. `docs/07_APIS` descreve os campos um a um |
| 6 | sim | Teste `descarta e conta o que não é JSON ou está fora do contrato, sem parar o resto`, e `descarte de evento fora do contrato é dito, nunca escondido` no painel |
| 7 | sim | Teste `linha do processo é renderizada como texto, nunca como HTML`, que injeta `<img onerror>` e `<script>`. Nenhum `dangerouslySetInnerHTML` no repositório |

### PainelLog

| # | Sim | Evidência |
|---|---|---|
| 8 | sim | Teste `diferencia stdout de stderr no DOM e por rótulo textual`: confere `data-stream` e o rótulo textual, não só a cor |
| 9 | sim | Testes `conectando é dito em letras, nunca spinner mudo`, `conectado e sem saída mostra o vazio, não um carregando infinito`, `erro mostra o motivo e oferece conectar de novo` e `mostra as linhas, o comando de origem e a contagem` |
| 10 | sim | Teste `rolar para cima trava o autoscroll e oferece voltar para o fim` |
| 11 | sim | Teste `comando rodando oferece parar, nomeado pelo comando; terminado não oferece` |
| 12 | sim | `PainelLog` recebe um `comando` e os eventos de um run. Teste `mostra as linhas, o comando de origem e a contagem` confere o `m.de('npm install')` |
| 13 | sim | Mesma evidência: `m.linhas(2)` na tela. E `corta o que renderiza no teto, diz que cortou e mantém a contagem real` prova que a contagem continua sendo a real depois do corte |

### O log ao lado da fila, não no lugar dela

| # | Sim | Evidência |
|---|---|---|
| 14 | sim | `PainelMaterializacao.test.jsx` não teve **nenhuma** expectativa alterada e continua passando. As props novas (`onSelecionar`, `selecionado`) são opcionais e nascem `null` |
| 15 | sim | Teste de integração `clicar em um comando já executado troca o log, e o pendente não é clicável`, em `PaginaWizard.test.jsx` |
| 16 | sim | `runIdEmFoco` com quatro testes em `Materializar.test.js`, mais o de integração `o log segue sozinho o comando em execução` |
| 17 | sim | `runEscolhido ?? runIdEmFoco(dados)` em `Materializar.jsx`: a escolha manual tem precedência. Coberto pelo teste do critério 15, que continua no comando escolhido |

### Tela final

| # | Sim | Evidência |
|---|---|---|
| 18 | sim | `terminada` em `Materializar.jsx` cobre `concluida` e `abortada`; o plano sai da tela nas duas. Testes `concluída mostra a tela final com o caminho e o atalho para o editor` e `abortada não mostra a tela de sucesso` |
| 19 | sim | Testes `mostra o nome, o caminho no disco e o resumo do que nasceu` e `o caminho vem em Chave, então dá para copiar` |
| 20 | sim | Teste `o atalho do editor é um link vscode://, com o caminho do Windows normalizado`. Verificado com o caminho real gerado: `vscode://file/C:/.../%C3%81rea%20de%20Testes/beta-teste` |
| 21 | sim | Teste `diz que o atalho depende do VS Code instalado, para o silêncio não virar estado invisível` |
| 22 | sim | `caminhoDeEditor.test.js`, 7 testes, incluindo espaço, acento, POSIX, Windows e o `null` de caminho vazio, mais `caminho vazio não renderiza atalho quebrado` na `TelaFinal` |
| 23 | sim | Teste `nunca é beco sem saída: traz a volta para o projeto` |
| 24 | sim | Teste `abortada não mostra a tela de sucesso e diz o que ficou escrito` |

### Padrões e verificação

| # | Sim | Evidência |
|---|---|---|
| 25 | sim | `src/services/camadaDeServicos.test.js` varre `components`, `features` e `hooks` procurando `fetch(`, `new WebSocket` e `globalThis.WebSocket`, e falha nomeando o arquivo |
| 26 | sim | Checagem rodada: nenhum `style=`, `console.log` ou `TODO` em componente de produto. Nenhuma cor, `rgb()`, `hsl()` ou `font-family` literal em nenhum CSS Module do repositório; `PainelLog.module.css` usa 46 tokens `--forge-*` e `TelaFinal.module.css`, 28. Os `px` de dimensão (`min-height: 32px`, `max-height: 320px`) seguem exatamente o que `Botao`, `Campo` e `LayoutApp` já faziam antes deste bloco |
| 27 | sim | Seções `log` e `telaFinal` e a chave `materializacao.verSaida` em `src/mensagens.js`. Nenhuma string de UI literal nos componentes novos |
| 28 | sim | `npm test`: 60 arquivos, 505 testes, verdes. `npm run build`: limpo. No Windows |

### Documentação

| # | Sim | Evidência |
|---|---|---|
| 29 | sim | `docs/06_COMPONENTES` ganhou a linha de `TelaFinal` e reescreveu a de `PainelLog` e a de `PainelMaterializacao`. `docs/07_APIS` ganhou a seção `Log ao vivo, /api/ws/runs/:runId`, com tabela campo a campo dos dois eventos, o handshake e a pegadinha do proxy. `docs/05_FLUXOS` fechou F-01 e acrescentou o passo 9 em F-02 |
| 30 | sim | `mvp.md` marca o bloco 8 como entregue; `VisualizadorDiff` está registrado como adiado para a Fase 2, com motivo, em `docs/06_COMPONENTES` e em `memory/decisions.md`, que recebeu seis decisões deste bloco |

### Critério de aceite da Fase 1

| # | Sim | Evidência |
|---|---|---|
| 31 | sim | Os oito itens verificados um a um em `docs/09_BACKLOG/mvp.md`, com o projeto **Gama Clínica** gerado pelo produto rodando. 21 segundos da aprovação ao dev server, contra o teto de 10 minutos |

### Validação com o produto real

Feita como manda a seção 6, e foi ela que pagou o bloco.

1. `npm run forge:init` criou `~/.kora-forge`, o banco e os builtins.
2. `npm run forge` subiu API em `7337` e front em `5173`.
3. Workspace apontado para uma pasta **com espaço e acento** (`Área de Testes`), de propósito, por causa de R-01. Aceito e normalizado corretamente.
4. Projeto criado, plano gerado (34 arquivos, 4 comandos), aprovado pelo hash.
5. WebSocket aberto pelo **proxy do Vite**: protocolo negociado `forge-token`, histórico entregue na conexão, 13 eventos do `npm install` e o `fim` com `estado=sucesso, exit=0`.
6. Fila inteira verde e `npm run dev` do projeto gerado respondendo `HTTP 200`.
7. Parada de run pela rota, devolvendo `cancelado`.

### Dois defeitos que só apareceram aqui

**R-08, bloqueante.** Na primeira passada o `git init` passou e o `npm install` morreu com
`spawn npm ENOENT`. No Windows o que existe no PATH é o shim `npm.cmd`: `spawn` sem shell só
completa nome com `.exe`, e desde a correção do CVE-2024-27980 o Node recusa `.cmd` sem shell
(EINVAL). Como todo preset roda `npm install`, **nenhum projeto conseguia nascer inteiro no
ambiente primário**, e a suíte ficava verde porque todo teste de processo rodava `node script.js`.

Corrigido em `server/lib/processo.js` com `resolverComando()`, que traduz `npm` e `npx` para
`node <cli>.js` só no Windows, mantendo `spawn`, array de argumentos e `shell: false`, e sem tocar
na whitelist (a tradução roda depois de `validarComando`). Ganhou seis testes de unidade, mais
quatro que executam `npm`, `npx`, `node` e `git --version` **de verdade** na plataforma que está
rodando, que é o teste que faltava. `mensagemDeFalhaAoIniciar()` troca ENOENT, EACCES e EINVAL por
frase com próxima ação, porque `spawn npm ENOENT` chegava cru na tela. Registrado em
`memory/bugs.md`.

**Escapes de terminal no log.** O `npm run dev` do projeto gerado escreve cor, e o painel mostrava
`[32m[1mVITE` no meio da frase. `limparEscapes()` limpa na renderização; o log gravado em
`command_runs` continua cru e fiel. Três testes, um deles com a linha real capturada do produto.

### Ressalvas

Uma, e é de método, não de código: a validação foi conduzida contra o servidor e o proxy reais,
com cliente HTTP e cliente WebSocket, **não com cliques num browser**. As telas estão cobertas por
teste de componente e pelos sete testes de integração da `PaginaWizard`, e o caminho do WebSocket
foi exercitado de ponta a ponta pelo proxy, que era o risco real. Ainda assim, uma passada com o
olho humano na tela continua valendo antes da Fase 2.

### Veredito

Aprovado. 31 de 31 critérios com sim e evidência nomeada.
