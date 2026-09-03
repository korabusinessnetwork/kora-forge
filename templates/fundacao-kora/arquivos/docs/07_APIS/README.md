# 07, APIs

Contrato entre o front e o backend. Escrito antes da implementação.

## Envelope

```json
{ "data": {}, "error": null, "meta": {} }
```

Erro:

```json
{ "data": null, "error": { "codigo": "CODIGO_ESTAVEL", "mensagem": "Legível por humano.", "detalhe": {} }, "meta": {} }
```

Toda entrada e toda saída validadas por schema. Dado fora do contrato é rejeitado explicitamente,
nunca silenciosamente ajustado.

## Rotas

| Método | Rota | O que faz |
|---|---|---|

## Códigos de erro estáveis

| Código | Significado |
|---|---|

Código de erro é contrato: uma vez publicado, não muda de significado. Se o significado mudar,
crie um código novo.

## Integrações externas

Toda chave vive em variável de ambiente, nunca no repositório. O projeto recebe `.env.example` com
os nomes das variáveis, jamais com valores.
