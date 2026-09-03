# Spec, Fase 1, Bloco 7: Runner

> Origem: `docs/09_BACKLOG/mvp.md`, bloco 7. Loop `spec → build → review`.
> Data: 2026-09-03. Status: **aprovado sem ressalvas** (review em 2026-09-03, seção 7).

## 1. Escopo

A única parte do Forge que escreve em disco e executa processo do sistema. Recebe um plano
**aprovado**, checa requisitos, escreve os arquivos na ordem fixa, executa os comandos um a um com
`spawn` sem shell, transmite o log por WebSocket, registra tudo em `command_runs` e
`command_logs`, e marca o projeto como materializado.

Trate cada linha como código privilegiado: é aqui que um erro deixa de ser bug e vira estrago.

## 2. Fora de escopo

- Painéis de log e a tela final (bloco 8). Este bloco entrega o servidor, o WebSocket e o botão de
  aprovar; o acompanhamento visual completo é do 8.
- Gaveta de ideias (9), Studio, API Hub, copiloto.
- Rollback automático. **ADR-002** decidiu que não existe: falha deixa o estado onde parou e diz
  exatamente onde.
- Diff visual de conflito (bloco 8).

## 3. Arquivos afetados

`shared/`: `schemas/materializacao.js` (pedido, estado, run, decisão).

`server/`: `lib/processo.js` (`executar`, com `spawn` sem shell, timeout e stream),
`modules/runner/{servico,rotas,requisitos}.js`, `lib/transmissor.js` (WebSocket por run),
`app.js`, `package.json` (`@fastify/websocket`), testes.

`src/`: `services/materializacao.js`, `features/wizard/etapas/Materializar.jsx` (botão aprovar,
separado da navegação), `mensagens.js`, testes.

Docs: `docs/07_APIS/README.md`, `docs/03_REGRAS_DE_NEGOCIO/README.md` (RN-05 e RN-06),
`docs/05_FLUXOS/README.md` (F-02 completo), `docs/11_SEGURANCA/README.md` (C3 como implementado),
`docs/09_BACKLOG/mvp.md`, `README.md`, `memory/decisions.md`, `memory/patterns.md` (P-02).

## 4. Critérios de aceite

### O plano executado é o plano aprovado
1. `POST /projects/:id/materializar` recebe apenas `{ hashBlueprint }`. O servidor **regenera** o plano a partir do blueprint e só executa se o hash bater. O cliente nunca envia conteúdo de arquivo nem comando.
2. Hash diferente responde `409 FORGE_PLAN_STALE`, com a mensagem que manda refazer o plano.
3. Corpo com qualquer campo além de `hashBlueprint` responde 400.

### Requisitos, antes de começar
4. Antes de escrever qualquer byte, o runner checa `node`, `git` e o que o preset declara em `requisitos`, executando `<bin> --version` com `spawn` sem shell.
5. Ferramenta ausente responde `409 FORGE_TOOL_MISSING` listando o que falta e como instalar, **sem ter escrito nada**.
6. Requisito com versão mínima (`{ bin: 'node', min: '20' }`) compara a versão maior encontrada; abaixo do mínimo entra na lista de ausentes com a versão encontrada.
7. A checagem também alimenta `ferramentasAusentes` no contexto do motor de regras, fechando a regra `seg-runner-ferramenta-ausente`.

### Escrita de arquivos
8. Ordem fixa (RN-05.4): as pastas primeiro, depois os arquivos na ordem do plano, que já vem por template (fundação, config, código) e por caminho.
9. Ação `criar` escreve; `sobrescrever` escreve; `pular` não toca no arquivo. O resultado devolve quantos de cada.
10. Todo caminho é revalidado contra a raiz **imediatamente antes de escrever**, não só no plano (C4, defesa em profundidade).
11. Falha ao escrever um arquivo aborta a escrita, mantém o que já foi escrito e responde com o caminho que falhou. Nada é revertido (**ADR-002**).
12. A raiz do projeto é criada se não existir, dentro do workspace.

### Execução de comandos
13. `server/lib/processo.js` executa com `spawn(cmd, args, { shell: false })`. Um teste garante que `exec` e `shell: true` não aparecem no código do runner.
14. Todo `cmd` é revalidado contra a whitelist global imediatamente antes de executar, mesmo vindo de plano regenerado pelo servidor.
15. Todo argumento passa por allowlist de caractere (`[a-zA-Z0-9._@/=:-]`); argumento fora dela recusa o comando com `FORGE_CMD_NOT_ALLOWED` antes de executar.
16. `cwd` é sempre a raiz do projeto, revalidada contra o workspace imediatamente antes do `spawn`.
17. O ambiente do processo é montado do zero, com apenas `PATH`, `HOME` e o mínimo do sistema. Nada do cofre entra, e um teste prova que uma variável do processo do Forge não vaza para o filho.
18. Timeout por comando, vindo do plano. Estourou: processo morto, estado `timeout`, log registra.
19. Comando de longa duração (`longaDuracao: true`) roda destacado: o runner não espera o fim, marca a materialização como concluída e deixa o processo vivo com botão de parar.
20. Comandos rodam **um a um, na ordem**. Sucesso avança sozinho para o próximo; falha para a fila e espera decisão humana (RN-05.5).

### Estado e decisão
21. `GET /projects/:id/materializar` devolve o estado: etapa atual, comando em execução, fila restante, e o que já aconteceu.
22. `POST /projects/:id/materializar/decidir` aceita `{ acao }` ∈ {repetir, pular, abortar}, e só é válido quando a materialização está parada em falha; em qualquer outro estado responde 400.
23. `repetir` roda de novo o mesmo comando; `pular` marca como pulado e vai para o próximo; `abortar` encerra a materialização deixando o disco como está.
24. Quando a fila termina sem falha pendente, o projeto vira `materializado`, `caminho_disco` é gravado, e o evento `projeto.materializado` é emitido.
25. O estado da materialização vive em memória do processo do servidor, por ser operação viva de um usuário só. Reiniciar o servidor no meio não corrompe nada: os arquivos escritos permanecem, e regerar o plano marca os idênticos como `pular`. Documentado.

### Registro e log
26. Cada comando vira uma linha em `command_runs` com `cmd`, `args_json`, `cwd`, `estado` e `exit_code`, e cada linha de saída vira `command_logs` com `stream` ∈ {stdout, stderr}.
27. Eventos: `comando.executado` no sucesso, `comando.falhou` na falha (com o exit code), `projeto.materializado` no fim. Todos com `project_id`.
28. `WS /ws/runs/:runId` transmite as linhas ao vivo, no formato `{ tipo, stream?, linha?, estado?, exitCode? }`, e envia o histórico já gravado ao conectar, para quem chega no meio não perder nada.
29. Conexão ao WebSocket passa pela mesma guarda das rotas: sem token válido, sem `Host` esperado, a conexão é recusada.
30. `POST /runs/:runId/parar` mata o processo, marca `cancelado` e responde com o estado final. Run que já terminou responde 400.

### Front
31. `services/materializacao.js` é o único ponto que fala com essas rotas, com tudo validado por schema.
32. A etapa Materializar ganha um botão **separado da navegação** para aprovar e materializar (F-02, passo 5), desabilitado enquanto o plano não carregou.
33. Depois de aprovar, a tela mostra o comando em execução e o resultado de cada um, com as três ações quando algo falha.
34. Erro de requisito ausente mostra a lista do que falta, não uma mensagem genérica.

### Padrões e verificação
35. Sem `fetch` fora de `api.js`; sem `style=`; sem cor literal fora de `tokens.css`; sem `console.log` fora do CLI; sem `TODO`; um componente por arquivo; nenhum `exec`, `execSync` ou `shell: true` em todo o servidor.
36. `npm test` e `npm run build` verdes.

### Documentação
37. `docs/07` documenta as rotas de materialização, o WebSocket e os códigos de erro. `docs/03` RN-05 e RN-06 registram o comportamento real. `docs/05` F-02 fica completo. `docs/11` C3 descreve o que foi implementado, incluindo o ambiente mínimo e a revalidação em profundidade.
38. `mvp.md`, `README.md`, `memory/patterns.md` (P-02) e `memory/decisions.md` atualizados, incluindo a decisão de regenerar o plano no servidor em vez de confiar no que o cliente manda.

## 5. Edge cases conhecidos

- Blueprint alterado entre gerar o plano e aprovar: `FORGE_PLAN_STALE`, e nada é escrito.
- Pasta do projeto já existe com arquivos: os idênticos são pulados, os diferentes são sobrescritos porque o plano aprovado já dizia isso.
- Comando que não existe no sistema apesar da checagem (removido no meio): `spawn` falha, vira estado `falha` com a mensagem do sistema, e a fila para.
- Processo que escreve muito no stdout: as linhas são gravadas em lote, e o WebSocket não bloqueia a execução.
- Cliente desconecta do WebSocket: a execução continua, e reconectar traz o histórico.
- Dois pedidos de materialização para o mesmo projeto ao mesmo tempo: o segundo responde 409.
- Parar um comando de longa duração: o processo morre e a materialização continua concluída.
- Servidor encerrado com processo filho vivo: o filho é morto no `SIGINT`, para não deixar órfão.

## 6. Definição de "aprovado sem ressalvas"

Os 38 critérios com sim e evidência, `npm test` e `npm run build` verdes, um teste de ponta a ponta
que materializa um projeto de verdade em pasta temporária e confere os arquivos em disco, nenhum
`exec` ou `shell: true` no servidor, e `docs/03`, `docs/05`, `docs/07` e `docs/11` batendo com o
código.

## 7. Review (2026-09-03)

Auditoria do build contra os 38 critérios. Suíte: `npm test`, 53 arquivos, 435 testes, tudo verde.
`npm run build` verde.

Validação de ponta a ponta com o servidor real, por HTTP: criei um projeto, gerei o plano,
recusei um hash errado, materializei de verdade (32 arquivos em disco), acompanhei o `git init`
pelo WebSocket, vi o `npm install` falhar, decidi `pular`, o `npm run dev` subiu destacado, o
projeto virou `materializado` com o caminho gravado, e o `parar` respondeu. Regerar o plano depois
marcou os 32 arquivos como `pular`, provando que repetir é idempotente.

| # | Sim? | Evidência |
|---|---|---|
| 1 | sim | `rotas.js` valida `pedidoMaterializacaoSchema` e regera o plano; smoke: materialização real só com o hash |
| 2 | sim | `runner.test.js` "hash diferente responde FORGE_PLAN_STALE sem escrever nada"; smoke confirmou por HTTP |
| 3 | sim | `runner.test.js` "corpo com campo a mais, hash malformado ou ausente responde 400" |
| 4 | sim | `requisitos.js`; `requisitos.test.js` "encontra node e git nesta máquina" |
| 5 | sim | `runner.test.js` "ferramenta ausente recusa antes de escrever qualquer byte" (confere que a raiz não existe) |
| 6 | sim | `requisitos.test.js` "mínimo acima do instalado marca como ausente, mostrando a versão encontrada" |
| 7 | sim | `checarRequisitos` exportado pelo serviço, no formato que `ferramentasAusentes` do contexto espera |
| 8 | sim | `escreverArquivos` cria as pastas antes; `runner.test.js` "cria pastas e arquivos" com `docs/00_VISAO/README.md` |
| 9 | sim | mesmo teste: `{ criados: 5, sobrescritos: 0, pulados: 1 }`, e o arquivo `pular` não é tocado |
| 10 | sim | `runner.test.js` "caminho que tenta sair da raiz é recusado antes de escrever" |
| 11 | sim | `escreverArquivos` lança `FORGE_RUN_FAILED` com o caminho e o que já tinha escrito, sem reverter |
| 12 | sim | `fs.mkdirSync(plano.raiz, { recursive: true })`; smoke criou a pasta do projeto |
| 13 | sim | `processo.test.js` "a única API de child_process usada é spawn, e ninguém pede shell", varrendo todo o servidor |
| 14 | sim | `rodarProximo` chama `validarComando` antes do spawn; `processo.test.js` "recusa comando fora da whitelist" |
| 15 | sim | `processo.test.js`, oito casos de argumento perigoso (ponto e vírgula, cifrão, crase, pipe, redirecionamento) |
| 16 | sim | `cwd` recalculado com `resolverNoWorkspace` antes de cada spawn; teste confere `runs[0].cwd` |
| 17 | sim | `processo.test.js` "não vaza variável do processo do Forge para o filho" e os dois testes de `ambienteMinimo` |
| 18 | sim | `processo.test.js` "timeout mata o processo"; `runner.test.js` "timeout mata o comando e para a fila" |
| 19 | sim | `runner.test.js` "comando de longa duração não segura a fila e continua vivo"; smoke: `npm run dev` destacado |
| 20 | sim | `runner.test.js` "roda em ordem, grava run e log, emite eventos e conclui" e "falha para a fila" |
| 21 | sim | `runner.test.js` "estado começa nulo e passa a existir depois de materializar" |
| 22 | sim | `runner.test.js` "decidir fora de falha responde erro" e "decidir sem materialização responde 404" |
| 23 | sim | `runner.test.js` "pular segue para o próximo, repetir roda de novo" e "abortar encerra"; smoke validou `pular` por HTTP |
| 24 | sim | `runner.test.js` confere `status = materializado`, `caminho_disco` e o evento; smoke idem |
| 25 | sim | Estado em `Map` no serviço, documentado em `docs/05` e `memory/decisions.md`; smoke provou a idempotência (32 `pular` ao regerar) |
| 26 | sim | `runner.test.js` confere `command_runs` (comando, cmd, args, cwd, estado, exit code) e `command_logs` por stream |
| 27 | sim | mesmo teste conta `comando.executado`, `comando.falhou` e `projeto.materializado`; smoke mostrou os três |
| 28 | sim | `runner.test.js` "entrega o histórico a quem conecta depois"; smoke recebeu as linhas do `git init` pelo WS |
| 29 | sim | `runner.test.js` "as rotas de materialização exigem a mesma guarda"; smoke: WS sem token → HTTP 401 |
| 30 | sim | `runner.test.js` "comando de longa duração… parar"; parar duas vezes responde erro |
| 31 | sim | `materializacao.test.js` (serviço), quatro casos incluindo contrato inválido |
| 32 | sim | `PaginaWizard.test.jsx` "o botão de aprovar é separado da navegação e manda o hash do plano" |
| 33 | sim | `PainelMaterializacao.test.jsx` (6 casos) e `PaginaWizard.test.jsx` "falha em um comando oferece repetir, pular e abortar" |
| 34 | sim | `PaginaWizard.test.jsx` "ferramenta ausente mostra a lista do que falta" (e omite as que estão ok) |
| 35 | sim | greps limpos; o teste do critério 13 varre o servidor inteiro atrás de `exec`, `execSync` e `shell: true` |
| 36 | sim | 435 testes; build verde |
| 37 | sim | `docs/07` rotas e WS; `docs/03` RN-05.5 com os subitens e RN-06.3; `docs/05` F-02 completo; `docs/11` C3 com o ambiente mínimo |
| 38 | sim | `mvp.md`, `README.md`, `memory/patterns.md` P-02 e `memory/decisions.md` com quatro entradas |

### Desvios do spec, todos registrados

- Um componente a mais que os previstos: `PainelMaterializacao`, para não colocar a fila de
  comandos e as três decisões dentro da etapa do wizard.
- O token do WebSocket vai no subprotocolo (`forge-token, <token>`), não em header: o browser não
  permite header customizado no handshake, e query string entraria em log de acesso. A guarda foi
  estendida para ler dos dois lugares.
- O estado usa `pulado`, que não existe no CHECK de `command_runs`. Ele vive só na materialização
  em memória; o que vai para o banco continua dentro do enum do schema.

### Correções feitas durante o review

Quatro, três delas achadas rodando o produto de verdade e não pelos testes:

- **`npm install` travava.** O ambiente mínimo era mínimo demais: descartava as variáveis de
  proxy, e sem elas o npm não alcança o registry. Reproduzi isolado: sem proxy trava, com proxy
  instala em 423 ms. `ambienteMinimo` passou a levar a configuração de rede, com teste e com o
  motivo escrito em `docs/11` (C3).
- **`obrigatorio` era dado morto.** O campo existia no preset e o runner ignorava, então um
  `npm run dev` opcional que falhasse exigiria decisão humana. Agora obrigatório que falha para a
  fila e opcional que falha segue. RN-05.5 corrigida, porque a documentação estava incompleta.
- **Encerrar o servidor com comando vivo virava exceção não tratada.** O callback do processo
  chegava com o banco já fechado. O runner passou a marcar-se encerrado e a tratar a gravação como
  registro, não como operação principal.
- **Requisito do preset não sobrepunha o da base.** Um preset pedindo `node >= 22` era rebaixado
  para o mínimo 20 da base. Agora o mais exigente vence.

### Pendências que exigem decisão do Matheus

**R-07 continua aberta e agora tem consequência visível.** O `npm install` do projeto gerado falha
com `Cannot read properties of null (reading 'edgesOut')` nesta máquina, e o runner faz exatamente
o que deve: para a fila, mostra o exit code e oferece repetir, pular ou abortar. Eu não embuti
`--legacy-peer-deps` em lugar nenhum, porque isso afrouxaria a resolução de peers em todo projeto
gerado, e é escolha de padrão, não de implementação. O produto está honesto sem a decisão: a falha
aparece e a pessoa escolhe. Quando você decidir, é uma linha no preset ou uma tentativa de
fallback no runner.

✅ feito. Todos os 38 critérios de aceite cobertos, sem ressalvas.
