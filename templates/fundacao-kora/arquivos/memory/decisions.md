# Decisões, {{PROJETO}}

## Objetivo
Registrar decisões de produto e de processo que outros precisam conhecer mas que não carregam
trade-off arquitetural profundo o bastante para virar ADR, e manter o índice dos ADRs.

## Contexto
Decisão não registrada é decisão que volta a ser discutida daqui a três semanas, em geral com
resultado diferente.

## Regras Gerais
- Se a decisão tem alternativa relevante descartada e consequência de longo prazo, ela é ADR.
- Toda entrada leva data, decisão em uma frase e motivo em uma frase.
- Decisão revogada não é apagada, é marcada `[REVOGADA]` com data e motivo.

## Validações
- A entrada diz o que foi decidido e por quê, sem depender de contexto de conversa.

## Permissões
- Qualquer dev ou agente registra. Apenas o dono revoga.

## Exceções
- Decisão sob urgência entra com a tag `[PROVISÓRIA]` e prazo de revisão.

## Auditoria
- Data e autor obrigatórios.

## Eventos
- `decisao.registrada`, `decisao.revogada`, `decisao.promovida_para_adr`

## Configurações Futuras
- Gerar changelog automático a partir dos eventos.

## Casos de Uso
- Onboarding, retomada após pausa, revisão de escopo.

## Critérios de Aceite
- [ ] Data presente
- [ ] Decisão em uma frase
- [ ] Motivo em uma frase

---

## Índice de ADRs

| ADR | Título | Status |
|---|---|---|
| [ADR-001](../docs/08_DECISOES/adr-001-stack-e-arquitetura.md) | Stack e modelo de arquitetura | Aceito |

## Decisões leves

### {{DATA}}, fundação gerada pelo KORA FORGE
A estrutura deste projeto veio do menu {{PRESET_NOME}} (v{{PRESET_VERSAO}}). Motivo: partir do
padrão da casa em vez de recriar a estrutura à mão. Etapas assumidas com o default do menu:
{{ETAPAS_ASSUMIDAS}}.
