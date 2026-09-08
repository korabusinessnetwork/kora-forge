# Ledger do loop, KORA FORGE

Uma seção por rodada, mais recente no topo. O ciclo é `spec → build → review → aprender`, descrito
no CLAUDE.md e no ADR-008.

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
