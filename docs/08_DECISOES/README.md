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
| [009](adr-009-capacidades-proprias-do-forge.md) | Capacidades próprias do Forge, fora da whitelist de preset | Proposto | 2026-09-08 |
| [010](adr-010-serializacao-de-layout.md) | Serialização de layout do Studio | Proposto | 2026-09-09 |
| [011](adr-011-motor-de-design-externo.md) | Motor de design externo opcional, o caso do Open Design | Proposto | 2026-09-09 |

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
| Estratégia de migração do blueprint entre versões de preset | Fase 5 |
| Detectar o editor do dono sem perguntar, para o atalho da tela final abrir o editor e não a pasta | se a detecção se mostrar confiável; ver ADR-009 |

## Propostos, esperando ratificação

| ADR | O que trava enquanto não é decidido |
|---|---|
| [008](adr-008-harness-e-painel-de-relatorios.md) | a Fase 6 inteira |
| [009](adr-009-capacidades-proprias-do-forge.md) | duas capacidades já construídas e em uso seguem sem respaldo escrito: abrir a pasta do projeto e matar a árvore de processos |
| [010](adr-010-serializacao-de-layout.md) | os blocos 2 em diante do Studio: canvas, biblioteca de componentes e exportação de rotas e JSX não têm o que guardar nem o que gerar |
| [011](adr-011-motor-de-design-externo.md) | nada trava. A decisão é abrir ou fechar uma porta futura. Mesmo aprovado, a implementação segue bloqueada até o spike de `spikes/open-design/SPIKE.md` ser executado de verdade |
