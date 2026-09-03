# 04, Modelagem

Multi-tenant: {{MULTI_TENANT}}. Camada de dados em `{{PASTA_DADOS}}/`.

## Entidades

| Entidade | O que é | Campos |
|---|---|---|
{{ENTIDADES}}

## Convenções

- Tabelas e colunas em `snake_case`, plural nas tabelas.
- Todo registro tem `criado_em`, e `atualizado_em` quando for mutável, em ISO 8601 UTC.
- Migrations em `{{PASTA_DADOS}}/migrations/YYYYMMDD_descricao.sql`, aplicadas em ordem.

## Invariantes

Escreva aqui o que precisa ser verdade sempre, independente do caminho que o código tomou.
Invariante é o que um teste de integração deve provar.

## Multi-tenant

Quando `{{MULTI_TENANT}}` é Sim: `tenant_id` em toda tabela, política de isolamento em toda
tabela, e um teste que prova que o tenant A não lê dado do tenant B. Tabela sem política é brecha,
não pendência.
