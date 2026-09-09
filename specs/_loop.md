# Ledger do loop, KORA FORGE

Uma seção por rodada, mais recente no topo. O ciclo é `spec → build → review → aprender`, descrito
no CLAUDE.md e no ADR-008.

## Rodada 10 — Fase 2, bloco 1, os tokens do projeto — 2026-09-09

- Spec: `specs/fase2-bloco1-tokens-do-projeto.md`
- Resultado da review: aprovado sem ressalvas, 25 de 25 critérios. Suíte com 684 passando e 1
  pulado, build sem erro, prova da Fase 1 com os oito itens. Validado no produto real: token
  alterado, projeto materializado, e o valor conferido no `tokens.css` em disco.
- Aprendido: A-23, A-24 e A-25 em `memory/learnings.md`; TD-01 e TD-02 em
  `docs/09_BACKLOG/README.md`.
- Commit: `a0867d0` na branch `fix/r08-runner-npm-windows`, empurrada para o origin sem pull request.
- **Um defeito grave foi encontrado e corrigido dentro da rodada**: o hash do plano não cobria os
  tokens, então dava para aprovar um `tokens.css` e receber outro. Nenhum teste de módulo poderia
  ter pego, porque morava entre o gerador e o design.
- Pendente de decisão, três:
  1. **ADR-009**, ratificar, recusar ou dividir. No repositório como `Proposto`.
  2. **P-06**, que diz `--projeto-*` enquanto o template gera nome sem prefixo. Padrão que afeta
     output gerado precisa do aval do dono.
  3. Os itens `[ASSUMIDO]` em `respostas-intake.md`.
- Próximo item recomendado: **ADR de serialização de layout**, porque ele destrava os blocos 2 em
  diante do Studio e o ADR-005 já o previu. Se o dono preferir código antes de decisão, o **R-13**
  segue disponível e é pequeno.

## Rodada 9 — R-10, mutationFn encapsulada — 2026-09-08

- Spec: `specs/r10-mutationfn-encapsulada.md`
- Resultado da review: aprovado sem ressalvas, 9 de 9 critérios. Suíte com 619 passando e 1 pulado,
  build sem erro. A varredura foi vista ficando vermelha com o padrão reintroduzido de propósito.
- Aprendido: A-22 em `memory/learnings.md`; R-10 fechado e **R-13 aberto** em `memory/bugs.md`;
  P-09 corrigido em `memory/patterns.md`, que listava a mesma varredura duas vezes.
- Commit: `69f4669` na branch `fix/r08-runner-npm-windows`, empurrada para o origin sem pull request.
- **O R-07 deixou de precisar de decisão.** O repro mínimo não falha mais, medido nas duas versões
  de npm desta máquina, 11.16.0 e 12.0.1. Era bug do resolvedor do npm 10.9.7, corrigido pelo npm.
  Fechar o registro é do dono; a medição está em `memory/bugs.md`.
- Pendente de decisão, agora duas:
  1. **ADR-009**, ratificar, recusar ou dividir.
  2. Os itens `[ASSUMIDO]` em `respostas-intake.md`.
- Próximo item recomendado: **abrir a Fase 2**, ou o R-13 se o dono preferir mais uma correção
  antes. Não há mais defeito que atinja quem usa, e o backlog da Fase 1 está vazio.

## Rodada 8 — B-01 e B-02, a URL do projeto novo na tela final — 2026-09-08

- Spec: `specs/b01-b02-url-do-dev-server.md`
- Resultado da review: aprovado sem ressalvas, 18 de 18 critérios. Suíte com 618 passando e 1
  pulado, build sem erro, e `npm run verificar:fase1` com os oito itens passando. Validado no
  produto real: projeto nasceu na 5273 e a URL chegou ao estado da materialização.
- Aprendido: A-20 e A-21 em `memory/learnings.md`; B-01 e B-02 fechados em
  `docs/09_BACKLOG/README.md`.
- Commit: `5eefd70` na branch `fix/r08-runner-npm-windows`, empurrada para o origin sem pull request.
- Pendente de decisão, três, todas de rodadas anteriores:
  1. **ADR-009**, ratificar, recusar ou dividir. Está no repositório como `Proposto`.
  2. **R-07**, `--legacy-peer-deps` no preset ou fallback no runner.
  3. Os itens `[ASSUMIDO]` em `respostas-intake.md`.
- Próximo item recomendado: **R-10**, e ele é o último que dá para fechar sem decisão sua. Depois
  dele, o backlog que sobra é decisão do dono ou é Fase 2, e a Fase 2 só abre quando o dono mandar.

## Rodada 7 — R-11, o log persiste sem esperar o comando terminar — 2026-09-08

- Spec: `specs/r11-log-persiste-sem-esperar-o-fim.md`
- Resultado da review: aprovado sem ressalvas, 13 de 13 critérios. Suíte com 599 passando e 1
  pulado, build sem erro, e `npm run verificar:fase1` com os oito itens passando.
- Aprendido: A-19 em `memory/learnings.md`; R-11 fechado em `memory/bugs.md`.
- Commit: `dc572cc` na branch `fix/r08-runner-npm-windows`, empurrada para o origin sem pull request.
- Pendente de decisão, três, todas de rodadas anteriores:
  1. **ADR-009**, ratificar, recusar ou dividir. Duas capacidades em uso sem respaldo escrito.
  2. **R-07**, `--legacy-peer-deps` no preset ou fallback no runner.
  3. Os itens `[ASSUMIDO]` em `respostas-intake.md`.
- Próximo item recomendado: **B-02**, a tela final mostrar a URL do dev server. É a última coisa
  entre o dono e o projeto aberto no browser sem ler log, e o R-11 acabou de tornar isso possível
  pelo servidor, porque a URL agora existe no banco.

## Rodada 6 — ADR das capacidades próprias do Forge — 2026-09-08

- Spec: `specs/adr-capacidades-proprias-do-forge.md`. ADR em
  `docs/08_DECISOES/adr-009-capacidades-proprias-do-forge.md`, Status **Proposto**.
- Resultado da review: aprovado sem ressalvas, 11 de 11 critérios. Suíte com 595 passando e 1
  pulado, build sem erro. Nenhum código mudou nesta rodada.
- Aprendido: A-18 em `memory/learnings.md`, sobre proposta de ADR que não entra no repositório
  desaparecer.
- Commit: `3e8389a` na branch `fix/r08-runner-npm-windows`, empurrada para o origin sem pull request.
- **Pendente de decisão, e é a rodada inteira**: ratificar o ADR-009, recusar, ou pedir para
  dividir em dois. As duas propostas antigas foram absorvidas, e o número 010 ficou livre.
  Continuam abertos o R-07 e os itens `[ASSUMIDO]` de `respostas-intake.md`.
- Próximo item recomendado: **espera o dono**. Se ratificar, a primeira coisa é o teste que varre
  a árvore cobrando os controles CP-1 a CP-5, no padrão P-09. Se não quiser decidir agora, o
  próximo item sem dependência é o **R-11**, o log de comando de longa duração que não chega ao
  banco.

## Rodada 5 — R-12, parar mata a árvore de processos — 2026-09-08

- Spec: `specs/r12-parar-mata-a-arvore.md`
- Resultado da review: aprovado sem ressalvas, 15 de 15 critérios. Suíte com 595 passando e 1
  pulado, build sem erro, e `npm run verificar:fase1` com os oito itens passando **sem** a limpeza
  de sobras que existia só por causa deste defeito.
- Aprendido: A-16 e A-17 em `memory/learnings.md`; R-12 fechado em `memory/bugs.md`.
- Commit: `1ab5e6f` na branch `fix/r08-runner-npm-windows`, empurrada para o origin sem pull request.
- Pendente de decisão, quatro:
  1. **ADR-010**, novo, sobre o Forge chamar `taskkill`, binário do sistema fora da whitelist. A
     whitelist de preset não foi tocada. Compartilha o princípio do ADR-009 e pode virar um ADR só.
  2. **ADR-009**, da rodada 2, sobre abrir a pasta do projeto fora do runner.
  3. **R-07**, `--legacy-peer-deps` no preset ou fallback no runner.
  4. Os itens `[ASSUMIDO]` em `respostas-intake.md`.
- Próximo item recomendado: **decidir os dois ADRs abertos** — são duas capacidades já construídas
  e rodando sem ratificação, e nenhuma outra correção deveria entrar antes disso.

## Rodada 4 — critério de aceite da Fase 1 — 2026-09-08

- Spec: `specs/fase1-criterio-de-aceite.md`. Relatório em `docs/09_BACKLOG/fase1-aceite.md`.
- Resultado da review: aprovado sem ressalvas. Os oito itens do critério da fase passaram, mais os
  quatro desta spec. Suíte com 580 passando e 1 pulado, build sem erro, em Windows 11. A prova é
  repetível por `npm run verificar:fase1` e roda isolada do ambiente do dono.
- Aprendido: A-13, A-14 e A-15 em `memory/learnings.md`; R-11 e R-12 em `memory/bugs.md`; B-01 e
  B-02 em `docs/09_BACKLOG/README.md`.
- Commit: `bf080ea` na branch `fix/r08-runner-npm-windows`, empurrada para o origin sem pull request.
- Pendente de decisão, agora são quatro:
  1. **R-12**, parar um comando deixa o processo real vivo no Windows. O botão Parar não para o dev
     server. A correção mexe no ADR-002: `taskkill` na whitelist ou Job Object no runner?
  2. **ADR-009**, proposto na rodada 2, sobre abrir a pasta do projeto fora do runner.
  3. **R-07**, `--legacy-peer-deps` no preset ou fallback no runner.
  4. Os itens `[ASSUMIDO]` em `respostas-intake.md`.
- Próximo item recomendado: **R-12** — é o único defeito aberto que atinge quem usa, o botão Parar
  do bloco 7 não para nada, e o Forge deixa processo órfão segurando porta.

## Rodada 3 — Fase 1, bloco 9, gaveta de ideias — 2026-09-08

- Spec: `specs/fase1-bloco9-gaveta-de-ideias.md`
- Resultado da review: aprovado sem ressalvas, 24 de 24 critérios. Suíte com 576 passando e 1
  pulado, build sem erro, em Windows 11. Validado também no servidor real, com `curl`, incluindo
  descarte idempotente e os dois eventos de domínio gravados.
- Aprendido: A-11 e A-12 em `memory/learnings.md`; R-10 em `memory/bugs.md`.
- Commit: `74a0c19` na branch `fix/r08-runner-npm-windows`, empurrada para o origin sem pull request.
- Pendente de decisão: ADR-009, R-07 e os itens `[ASSUMIDO]`.
- Próximo item recomendado: **critério de aceite da Fase 1** — os nove blocos estão entregues, e o
  que falta é provar a fase de ponta a ponta.

## Rodada 2 — Fase 1, bloco 8, telas de fechamento — 2026-09-08

- Spec: `specs/fase1-bloco8-telas-de-fechamento.md`
- Resultado da review: aprovado sem ressalvas, 26 de 26 critérios. Suíte com 504 passando e 1
  pulado, build sem erro, em Windows 11. Validado também no servidor real, com o WebSocket
  entregando log de uma materialização de verdade e a pasta abrindo no fim.
- Aprendido: A-09 e A-10 em `memory/learnings.md`; P-09 em `memory/patterns.md`.
- Commit: `85bf23f` na branch `fix/r08-runner-npm-windows`, empurrada para o origin sem pull request.
- Pendente de decisão: **ADR-009 proposto e não aplicado**, sobre abrir a pasta do projeto fora do
  runner. Se recusado, o botão sai e sobra o caminho copiável.
- Próximo item recomendado: **bloco 9, gaveta de ideias** — é o último bloco da Fase 1.

## Rodada 1 — R-08, runner executa npm no Windows — 2026-09-08

- Spec: `specs/r08-runner-npm-no-windows.md`
- Resultado da review: aprovado sem ressalvas, 12 de 12 critérios. Suíte com 450 passando e 1
  pulado, build sem erro, em Windows 11.
- Aprendido: R-08 e R-09 em `memory/bugs.md`; A-06, A-07 e A-08 em `memory/learnings.md`.
- Commit: `f35738b` na branch `fix/r08-runner-npm-windows`, empurrada para o origin sem pull request.
- Pendente de decisão: nenhuma nesta rodada. Continua aberto o R-07.
- Próximo item recomendado: **bloco 8, telas de fechamento**.
