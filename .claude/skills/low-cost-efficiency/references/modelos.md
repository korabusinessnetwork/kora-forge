# Modelos: ficha por modelo e como o preço se compõe

Fonte de verdade: `shared/eficiencia/catalogo-modelos.json` (versão, data e link de preços).
Esta página explica o catálogo; o número vale sempre o que está no JSON.

## Como uma chamada é cobrada

Quatro medidores, cada um com preço próprio por milhão de tokens:

| Medidor | Campo em `usage` | Multiplicador típico sobre a entrada |
|---|---|---|
| Entrada sem cache | `input_tokens` | 1x |
| Saída | `output_tokens` | 5x a entrada |
| Leitura de cache | `cache_read_input_tokens` | 0,1x (Fable 5.1: 0,025x) |
| Escrita de cache | `cache_creation_input_tokens` | 1,25x (TTL 5 min) ou 2x (TTL 1 h) |

Batch API: 50% em todos os medidores, inclusive cache. O desconto acumula.

`calcularCustoUsd` no motor aplica exatamente isso. Exemplo, Sonnet 5, 1.000 de entrada,
500 de saída, 2.000 lidos do cache, 1.000 escritos (5 min):
`(1000×2 + 500×10 + 2000×0,2 + 1000×2,5) / 1e6 = US$ 0,0099`.

## Fichas

### Claude Haiku 4.5 (`claude-haiku-4-5`), tier econômico
- **Preço**: 1 / 5 (entrada / saída). Contexto 200K, saída 64K.
- **Esforço**: não expõe. Não mande `output_config.effort`.
- **Use em**: nomeação, classificação, extração curta, alto volume com saída verificável por schema.
- **Evite em**: redação com nuance, revisão de blueprint, loop agentico. Na prática, responde perguntas de conhecimento a um décimo do custo do Opus com dois terços da acurácia: bom onde o erro é barato de pegar.
- **No Forge**: `nome-sugerir` em toda intenção; `personas-derivar` e `entidades-derivar` em site, API e automação.

### Claude Sonnet 5 (`claude-sonnet-5`), tier equilíbrio, **padrão Kora**
- **Preço**: 2 / 10. Contexto 1M, saída 128K. Esforço `low` a `max`.
- **Use em**: redação, derivação estruturada, código. É o melhor custo por tarefa concluída na maior parte das etapas do copiloto.
- **Evite em**: nada em especial. Quando falha, escale uma vez para o Opus 5 e volte.
- **No Forge**: `identidade-redigir`, `personas-derivar`, `entidades-derivar`, `regras-redigir` na maioria das intenções; `blueprint-revisar` em site, local e automação.

### Claude Sonnet 4.6 (`claude-sonnet-4-6`), tier equilíbrio
- **Preço**: 3 / 15. Custa 50% a mais que o Sonnet 5 sem entregar mais.
- **Use em**: só compatibilidade com prompt antigo, enquanto migra. Não é recomendado em nenhum perfil.

### Claude Opus 5 (`claude-opus-5`), tier frontier
- **Preço**: 5 / 25. Contexto 1M, saída 128K. Esforço `low` a `max`. Pensamento adaptativo ligado por padrão.
- **Use em**: revisão de coerência, regras de domínio complexo, e como escalada quando o Sonnet falha na validação.
- **Evite em**: texto curto e rotineiro, nomeação. Em esforço `low` custa perto do Sonnet em `high` e revisa melhor: é essa a jogada, não `high` no Opus.
- **No Forge**: `blueprint-revisar` em aplicação web e API. Escalada de todas as etapas de redação e derivação.

### Claude Opus 4.8 (`claude-opus-4-8`), tier frontier
- **Preço**: igual ao Opus 5. Existe como fallback de recusa do Opus 5. Uso novo: prefira o Opus 5.

### Claude Fable 5.1 (`claude-fable-5-1`), tier frontier
- **Preço**: 10 / 50. Leitura de cache muito barata (0,25), o que só compensa com prefixo enorme reaproveitado muitas vezes.
- **Use em**: raciocínio longo e agentico fora do Forge, quando o custo do erro é alto e o teto não é 5 USD.
- **Evite em**: qualquer etapa do copiloto. Cinco vezes o Sonnet para enriquecer texto de wizard. Diferenças de API: pensamento sempre ligado, sem `tool_choice` forçado, pode devolver `stop_reason: refusal`. Ver skill `claude-api`.

## Regra de escolha em uma linha

Comece no Sonnet 5 com o esforço do perfil. Desça para o Haiku onde a saída é curta e
verificável. Suba para o Opus 5 em `low` onde o erro vai para o disco. Nunca Fable no copiloto.

## Quando este arquivo fica velho

Modelo novo, preço novo ou mudança de esforço suportado: atualize `catalogo-modelos.json`
(subindo `versao` e `atualizado_em`), rode `npm test`, e reescreva a ficha aqui. Não deixe a
ficha dizer uma coisa e o JSON outra: o JSON prevalece e a ficha está errada.
