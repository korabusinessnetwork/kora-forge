# Operar com crédito: rotina, teto, escalada e o que fazer quando acaba

Crédito pré-pago tem uma característica que assinatura não tem: acaba no meio da tarefa. A
operação abaixo existe para que isso nunca seja surpresa e para que cada dólar gasto tenha uma
linha em `copilot_calls` explicando o que comprou.

## O contrato de toda chamada nova

Antes de escrever qualquer chamada à API Anthropic no Forge ou em projeto gerado:

- [ ] Intenção e etapa identificadas; recomendação tirada do `perfis.json`, não da memória.
- [ ] Modelo e esforço do perfil. Haiku sem `output_config.effort`.
- [ ] Prefixo estável primeiro, `cache_control` no último bloco estável, TTL do perfil.
- [ ] Entrada mínima: só o que a etapa usa, rotulado como dado não confiável (S-07). Nada do cofre (S-05).
- [ ] Saída em JSON validada por schema, `max_tokens` do perfil, streaming se a saída puder passar de alguns milhares de tokens.
- [ ] `timeout` explícito e fallback determinístico pronto (P-04). Nenhuma tela bloqueia esperando IA.
- [ ] Registro em `POST /api/eficiencia/chamadas` com os quatro medidores de `usage`, `estado`, `intencao`, `duracaoMs`. Sempre, inclusive em erro e timeout.
- [ ] Teto checado antes de chamar: com `percentualDoTeto` em 100, responde `FORGE_BUDGET_EXCEEDED` e usa o fallback.

## Política de escalada (uma tentativa, nunca loop)

```
chamada no modelo do perfil
  └─ saída válida no schema → usa, registra 'sucesso'
  └─ inválida → registra 'invalido', uma chamada no modelo de escalada (escalar_para)
        └─ válida → usa, registra 'sucesso'
        └─ inválida → registra 'invalido', fallback determinístico, aviso discreto na tela
  └─ erro de rede ou timeout → registra 'erro' ou 'timeout', fallback, sem retentativa automática
```

Custo máximo de uma etapa é então `custoTipico + custoEscalada`, os dois já no painel de
recomendação. Nada além disso é gasto sem a pessoa pedir de novo.

## Rotina mensal

| Quando | O quê | Onde |
|---|---|---|
| Dia 1 | Confirmar o teto em Configurações (default 5 USD) | `/config` |
| Toda semana | Olhar gasto contra teto e o ranking com filtro `mes` | `/eficiencia` |
| Gasto > 70% do teto antes do dia 20 | Baixar esforço das etapas de redação para `low` no `perfis.json`; conferir cache (`cache_read_input_tokens` > 0) | `perfis.json`, log |
| Taxa de sucesso < 80% em uma etapa | Revisar prompt e schema da etapa antes de mexer em modelo | `server/prompts/` |
| Frontier vence o Sonnet na mesma etapa por 20+ chamadas | Promover no perfil e registrar decisão | `perfis.json`, `memory/decisions.md` |
| Trimestre | Conferir `catalogo-modelos.json` contra a página de preços; subir `versao` se mudou | catálogo |

## Quando o crédito acaba (ou o teto bate)

1. O copiloto desliga sozinho e toda etapa segue com o texto determinístico (regra de ouro do ADR-004). Nada trava.
2. O painel mostra o gasto em 100% e o que consumiu, por etapa e por modelo.
3. Antes de repor crédito, leia `porEtapa`: se uma etapa carregou mais da metade, o problema é ela (prompt grande, escalada frequente), não o crédito.
4. Reponha só depois de ajustar. Repor sem ajustar compra o mesmo estouro no mês seguinte.

## Ler o painel sem se enganar

- **Pontuação** é relativa ao melhor do período. 100 não quer dizer "ótimo", quer dizer "o melhor entre esses". Com um modelo só, ele sempre marca 100.
- **Amostra pequena** (< 5 chamadas) é ruído. Não promova nem rebaixe com ela.
- **Custo por sucesso** é o número que decide entre modelos. Custo médio esconde a taxa de falha.
- **Latência média** não entra na pontuação, mas uma etapa que leva 10 s no Opus e 3 s no Sonnet com a mesma taxa de sucesso deve ficar no Sonnet: quem espera é a pessoa.
- **Sem dado**: use o simulador e a recomendação. Eles vêm do mesmo motor e não precisam de histórico.

## Fora do Forge (projetos gerados)

Projeto gerado pelo Forge que usa a API Anthropic herda as mesmas regras, com dois ajustes:

- O teto e o registro passam a ser do projeto (tabela própria, mesmo formato de `copilot_calls`), porque projeto gerado não depende do Forge em runtime (E-04).
- Em serviço sem humano esperando (worker, automação), a Batch API entra como alavanca padrão: metade do preço em tudo.

Para auditoria completa de código existente, use `/claude-api cost-optimize` da skill global:
ela mede perfil de tokens e propõe uma alavanca por diff.
