# 08, Decisões (ADRs)

Decisão de arquitetura sem ADR é decisão perdida. Toda escolha com alternativa relevante
descartada e consequência de longo prazo mora aqui.

## Índice

| ADR | Título | Status | Data |
|---|---|---|---|
| [001](adr-001-stack-e-arquitetura.md) | Stack e modelo de arquitetura | Aceito | {{DATA}} |

## Como escrever um ADR

1. `cp adr-000-template.md adr-NNN-titulo-curto.md`
2. Preencher Status, Data, Decisores
3. Contexto, Decisão, Alternativas Consideradas, Consequências
4. Status vira Aceito quando a decisão passa a valer
5. ADR antigo nunca é apagado. Quando revogado, marca-se `Supersedido por` e cria-se o novo

## Quando uma decisão merece ADR

Se qualquer item for verdadeiro, escreva um ADR:

- Muda a arquitetura geral, a stack ou o modelo de dados de forma estrutural
- Envolve trade-off que alguém vai questionar depois
- Contradiz ou substitui uma decisão anterior já registrada
- Tem custo recorrente ou cria dependência difícil de reverter
- Afeta múltiplos módulos e não se reverte com um `git revert`
