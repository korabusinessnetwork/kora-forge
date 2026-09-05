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
