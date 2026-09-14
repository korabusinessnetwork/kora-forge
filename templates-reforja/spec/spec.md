# Reforja, {{TITULO}}

> Spec gerada pela Auto-Reforja (ADR-014) a partir do item `{{ITEM_ID}}`, com o template
> `reforja-spec` v{{VERSAO_TEMPLATE}}. Origem: {{ORIGEM}}. Prioridade: {{PRIORIDADE}}. Sinal do
> diagnóstico: `{{SINAL}}`. Item criado em {{DATA}}.
>
> O que está como "_a definir_" é lacuna honesta: preencha antes do `/build`.

## 1. Escopo

{{DESCRICAO}}

## 2. Fora de escopo

{{A_DEFINIR}}

## 3. Arquivos afetados

{{A_DEFINIR}}

Se a melhoria veio do diagnóstico, rode o diagnóstico de novo na página Auto-Reforja para ver os
arquivos que o sinal aponta hoje.

## 4. Critérios de aceite

1. {{A_DEFINIR}}

## 5. Edge cases conhecidos

{{A_DEFINIR}}

## 6. Definição de "aprovado sem ressalvas"

Todos os critérios de aceite marcados como sim, sem marcador pendente, sem `console.log`
esquecido, sem regressão nos fluxos existentes, com `npm test` e `npm run build` verdes, e o
sinal `{{SINAL}}` sem a evidência que motivou esta spec.

A auditoria entra como seção 7 no `/review`. Até lá, o diagnóstico mostra esta spec como sem
auditoria, de propósito.
