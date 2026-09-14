# Perfis de intenção: o que cada tipo de aplicação pede

Fonte de verdade: `shared/eficiencia/perfis.json`. O motor recusa perfil incompleto ao carregar:
toda intenção precisa cobrir as seis etapas do copiloto (`docs/10_PROMPTS/README.md`).

## Como a intenção é inferida

`inferirIntencao({ categoriaPreset, descricao })`, nesta ordem:

| Origem | Confiança | Quando |
|---|---|---|
| `categoria` do preset do projeto | alta | sempre que existe projeto no Registry |
| Sinais no texto livre (palavra inteira, sem acento, sem caixa) | média | pedido em conversa, sem projeto |
| Nenhum sinal | baixa | devolve `intencao_padrao` (`aplicacao`) e diz que assumiu |

Empate de sinais favorece a intenção declarada primeiro no JSON (`site`, `aplicacao`, `local`,
`api`, `automacao`). "App com API" cai em `aplicacao`, porque aplicação costuma ter API e não o
contrário. Se a pessoa discordar, ela escolhe: a inferência é atalho, não decisão.

## As cinco intenções

| Intenção | Preset | O que muda no custo |
|---|---|---|
| `site` | `criar-site` | Texto é o produto, domínio raso. Sonnet nas etapas de texto, Haiku em entidade e nome, nada de Opus por padrão |
| `aplicacao` | `criar-aplicacao-web` | Multi-tenant, RLS, pagamento. Erro de coerência vai para migration e política. Opus 5 em `low` só na revisão do blueprint |
| `local` | `criar-aplicacao-local` | Disco, processo, segurança local. Sonnet com esforço médio e alto; Opus só como escalada |
| `api` | backlog (Modelo C) | Contrato é tudo. Entidade e regras com esforço médio e alto; Opus `low` na revisão |
| `automacao` | backlog | Eventos, filas, agendamento. Formatos conhecidos, esforço baixo e médio |

## Tabela etapa × intenção (modelo · esforço)

| Etapa | site | aplicacao | local | api | automacao |
|---|---|---|---|---|---|
| `identidade-redigir` | Sonnet 5 · medium | Sonnet 5 · medium | Sonnet 5 · medium | Sonnet 5 · low | Sonnet 5 · low |
| `personas-derivar` | Sonnet 5 · low | Sonnet 5 · low | Sonnet 5 · low | Haiku 4.5 | Haiku 4.5 |
| `nome-sugerir` | Haiku 4.5 | Haiku 4.5 | Haiku 4.5 | Haiku 4.5 | Haiku 4.5 |
| `entidades-derivar` | Haiku 4.5 | Sonnet 5 · medium | Sonnet 5 · medium | Sonnet 5 · medium | Sonnet 5 · low |
| `regras-redigir` | Sonnet 5 · low | Sonnet 5 · high | Sonnet 5 · medium | Sonnet 5 · high | Sonnet 5 · medium |
| `blueprint-revisar` | Sonnet 5 · medium | **Opus 5 · low** | Sonnet 5 · high | **Opus 5 · low** | Sonnet 5 · high |

Escalada: Haiku → Sonnet 5; Sonnet 5 → Opus 5; Opus 5 `low` → Opus 5 `medium`. Uma tentativa.

## Custo de um projeto completo (chamada típica, sem cache)

Somando as seis etapas na recomendação do perfil (números do catálogo v1):

| Intenção | Custo estimado | Observação |
|---|---|---|
| `site` | ≈ US$ 0,11 | tudo Sonnet e Haiku |
| `aplicacao` | ≈ US$ 0,18 | a revisão no Opus responde por quase metade |
| `local` | ≈ US$ 0,13 | |
| `api` | ≈ US$ 0,17 | |
| `automacao` | ≈ US$ 0,11 | |

Com cache no prefixo (60% a 70% lido), caia cerca de 20% a 30%. Com o teto de 5 USD, dá para
criar dezenas de projetos por mês pelo wizard sem chegar perto do limite. O que estoura teto é
escalada em loop e prompt com dump de arquivo, não a escolha do modelo.

## Como adicionar uma intenção nova

1. Crie o preset em `presets/` com a `categoria` nova (ADR-007).
2. Em `perfis.json`, adicione a intenção com `nome`, `categoria_preset`, `descricao`, `sinais` e as seis etapas.
3. Adicione o id em `INTENCOES` em `shared/schemas/eficiencia.js` e o rótulo em `src/mensagens.js` (`eficiencia.intencoes`).
4. `npm test`: o teste do motor confere que toda etapa existe e que o modelo suporta o esforço.
5. Registre a decisão em `memory/decisions.md` com a justificativa de custo.

Comece copiando a intenção mais parecida e mude só o que o domínio pede. Recomendação
diferente sem motivo escrito não entra: o campo `motivo` é obrigatório no schema.
