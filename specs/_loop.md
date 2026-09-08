# Ledger do loop, KORA FORGE

Uma seção por rodada, mais recente no topo. O ciclo é `spec → build → review → aprender`, descrito
no CLAUDE.md e no ADR-008.

## Rodada 1 — R-08, runner executa npm no Windows — 2026-09-08

- Spec: `specs/r08-runner-npm-no-windows.md`
- Resultado da review: aprovado sem ressalvas, 12 de 12 critérios. Suíte com 450 passando e 1
  pulado, build sem erro, em Windows 11.
- Aprendido: R-08 e R-09 em `memory/bugs.md`; A-06, A-07 e A-08 em `memory/learnings.md`.
- Commit: `f35738b` na branch `fix/r08-runner-npm-windows`, empurrada para o origin sem pull request.
- Pendente de decisão: nenhuma nesta rodada. Continua aberto de rodadas anteriores o R-07, se o
  preset passa a declarar `--legacy-peer-deps` ou se o runner tenta fallback, e os itens marcados
  `[ASSUMIDO]` em `respostas-intake.md`.
- Próximo item recomendado: **bloco 8, telas de fechamento** — é o próximo escrito em
  `docs/09_BACKLOG/mvp.md`, e agora ele fecha a Fase 1 em cima de um runner que roda de verdade
  nesta máquina.
