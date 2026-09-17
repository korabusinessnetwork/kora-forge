# Reforja, console.log esquecido em código de produto

> Spec gerada pela Auto-Reforja (ADR-014) a partir do item `2cb1b007-d5bd-427f-8059-633bb9980e4c`, com o template
> `reforja-spec` v1.0.0. Origem: diagnóstico do Forge. Prioridade: média. Sinal do
> diagnóstico: `console-log-em-produto`. Item criado em 2026-09-17.
>
> O que está como "_a definir_" é lacuna honesta: preencha antes do `/build`.

## 1. Escopo

Troque por log estruturado do servidor, ou remova. A constituição proíbe console.log esquecido.

## 2. Fora de escopo

_a definir_

## 3. Arquivos afetados

_a definir_

Se a melhoria veio do diagnóstico, rode o diagnóstico de novo na página Auto-Reforja para ver os
arquivos que o sinal aponta hoje.

## 4. Critérios de aceite

1. _a definir_

## 5. Edge cases conhecidos

_a definir_

## 6. Definição de "aprovado sem ressalvas"

Todos os critérios de aceite marcados como sim, sem marcador pendente, sem `console.log`
esquecido, sem regressão nos fluxos existentes, com `npm test` e `npm run build` verdes, e o
sinal `console-log-em-produto` sem a evidência que motivou esta spec.

A auditoria entra como seção 7 no `/review`. Até lá, o diagnóstico mostra esta spec como sem
auditoria, de propósito.
