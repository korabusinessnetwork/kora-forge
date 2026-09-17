# 08, Decisões (ADRs)

Decisão de arquitetura sem ADR é decisão perdida. Toda escolha com alternativa relevante
descartada e consequência de longo prazo mora aqui.

## Índice

| ADR | Título | Status | Data |
|---|---|---|---|
| [001](adr-001-stack-e-arquitetura.md) | Stack e modelo de arquitetura | Aceito | 2026-09-02 |
| [002](adr-002-runner-de-comandos.md) | Runner de comandos com whitelist e dry-run | Aceito | 2026-09-02 |
| [003](adr-003-single-tenant-local.md) | Single-tenant local, multi-tenant no output | Aceito | 2026-09-02 |
| [004](adr-004-motor-deterministico.md) | Motor determinístico com copiloto opcional | Aceito | 2026-09-02 |
| [005](adr-005-studio-editor-proprio.md) | Studio, editor visual próprio | Aceito | 2026-09-02 |
| [006](adr-006-cofre-de-segredos.md) | Cofre local de segredos | Aceito | 2026-09-02 |
| [007](adr-007-presets-declarativos.md) | Presets declarativos versionados | Aceito | 2026-09-02 |
| [008](adr-008-harness-e-painel-de-relatorios.md) | Harness como sistema de operação de build e painel de relatórios | Proposto | 2026-09-02 |
| [009](adr-009-serializacao-do-design.md) | Serialização do documento de design | Proposto | 2026-09-05 |
| [010](adr-010-capacidades-proprias-do-forge.md) | Capacidades próprias do Forge, fora da whitelist de preset | Proposto | 2026-09-08 |
| [011](adr-011-motor-de-design-externo.md) | Motor de design externo, o caso do Open Design, **não integrar** | Aceito | 2026-09-10 |
| [012](adr-012-serializacao-de-layout.md) | Serialização de layout do Studio | Supersedido por ADR-009 | 2026-09-09 |

> **Sobre a numeração do 010 ao 012.** O projeto seguiu por um tempo em duas linhas de trabalho
> paralelas, e as duas escreveram ADR ao mesmo tempo. Na reconciliação, o ADR-009 desta linha,
> serialização do documento de design, ficou com o número porque já estava implementado nos blocos
> 3 e 4 da Fase 2. Os ADRs da outra linha desceram para 010 e 011, e a proposta de serialização de
> layout virou o 012, marcada como supersedida pelo 009, que decide a mesma questão. Nenhum ADR foi
> apagado. Specs antigas e o ledger em `specs/_loop.md` guardam a numeração da época, de propósito:
> são registro histórico, e reescrevê-los seria apagar o caminho percorrido.

## Como escrever um ADR

1. `cp adr-000-template.md adr-NNN-titulo-curto.md`
2. Preencher Status, Data, Decisores
3. Contexto, Decisão, Alternativas Consideradas, Consequências
4. Status vira Aceito quando a decisão passa a valer
5. ADR antigo nunca é apagado. Quando revogado, marca-se `Supersedido por` e cria-se o novo

## Decisões que ainda vão exigir ADR

| Tema | Quando |
|---|---|
| Empacotar como app desktop (Tauri) | se e quando a Fase 5 justificar |
| Isolar o runner em container | se surgir necessidade de rodar preset de terceiro |
| Formato de exportação do Studio para JSX | resolvido na **ADR-009** |
| Estratégia de migração do blueprint entre versões de preset | Fase 5 |
| Detectar o editor do dono sem perguntar, para o atalho da tela final abrir o editor e não a pasta | se a detecção se mostrar confiável; ver **ADR-010** |

## Propostos, esperando ratificação

| ADR | O que trava enquanto não é decidido |
|---|---|
| [008](adr-008-harness-e-painel-de-relatorios.md) | a Fase 6 inteira |
| [009](adr-009-serializacao-do-design.md) | nada mais. Já está implementado nos blocos 3 e 4 da Fase 2, e a ratificação é formalidade atrasada |
| [010](adr-010-capacidades-proprias-do-forge.md) | três capacidades já construídas e em uso seguem sem respaldo escrito: abrir a pasta do projeto, matar a árvore de processos e abrir o browser no fim do boot |
