# .claude

Skills e configurações que o Claude Code deve carregar ao trabalhar neste projeto.

## Skills relevantes

| Skill | Quando |
|---|---|
| `fundacao-de-projeto` | já aplicada, gerou esta fundação. Consultar ao evoluir a estrutura |
| `loop-spec-build-review` | toda feature nova entra por aqui, spec antes de código. Comandos `/spec`, `/build` e `/review` já instalados em `.claude/commands/`, specs em `specs/` |
| `oop-refactor` | revisão de arquitetura de módulos do backend local e do motor |
| `multi-model-orchestrator` | blocos paralelos da Fase 1 (motor de regras e gerador não compartilham arquivo) |
| `low-cost-efficiency` | **skill de projeto** em `.claude/skills/low-cost-efficiency/`. Qualquer decisão sobre modelo, esforço, cache, teto ou custo de API: consulta o catálogo versionado, recomenda por intenção e etapa, e lê o painel Eficiência. Comando `/custo` |

## MCPs sugeridos

Playwright e Chrome DevTools para validar a UI do wizard e o Studio.

## Ordem de leitura para um agente novo

1. `CLAUDE.md`
2. `memory/identity.md`, `memory/restrictions.md`, `memory/patterns.md`
3. `docs/00_VISAO/README.md`
4. `docs/01_ARQUITETURA/README.md`
5. `docs/08_DECISOES/` (os sete ADRs)
6. `docs/09_BACKLOG/mvp.md` para saber onde entrar
