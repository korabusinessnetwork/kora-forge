# 01, Arquitetura

## Modelo escolhido

{{MODELO_DESCRICAO}}

Registrado em **ADR-001**.

## Stack

{{STACK}}

| Decisão | Valor |
|---|---|
| Modelo | {{MODELO}} |
| Stack | {{STACK_LINHA}} |
| Multi-tenant | {{MULTI_TENANT}} |
| White-label | {{WHITE_LABEL}} |
| Autenticação | {{AUTH}} |
| Deploy | {{DEPLOY}} |
| Camada de dados | `{{PASTA_DADOS}}/` |

## Camadas

```
UI (src/pages, src/components)
   ↓ nunca chama backend direto
CAMADA DE SERVIÇOS (src/services)
   ↓ único ponto que fala com o backend
{{PASTA_DADOS}}/
```

A camada de serviços é o que permite trocar de provedor sem reescrever a UI. Componente que chama
`fetch` direto quebra isso, e é recusado em review.

## Estado

- Servidor é a fonte de verdade. O front não guarda estado de servidor em duplicata.
- Estado global só para sessão, tema e contexto do tenant. O resto é local ao componente.
- Estado só sobe de nível quando tem mais de um consumidor real.

## Preparado para depois

Escreva aqui o que já está previsto e ainda não foi construído, para que a próxima pessoa não
descubra por acidente.
