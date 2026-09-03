---
name: low-cost-efficiency
description: Low cost, more efficiency. Decide qual modelo Claude usar, com que esforço, cache e limite, para gastar o mínimo de crédito por tarefa concluída no KORA FORGE e nos projetos que ele gera. Use SEMPRE que a conversa tocar em custo de API, crédito, tokens, orçamento, teto mensal, "qual modelo usar", Haiku vs Sonnet vs Opus, cache de prompt, batch, esforço (effort), ou eficiência do copiloto, mesmo que a pessoa não diga "skill", "custo" ou "modelo" explicitamente (ex. "isso vai ficar caro?", "dá para economizar aqui?", "o copiloto está gastando muito", "monta o painel de gasto"). Também dispara ao adicionar ou alterar qualquer chamada à API Anthropic no código, ao atualizar o catálogo de preços, e ao ler o painel Eficiência do Forge.
---

# Low cost, more efficiency

Operar modelos de API com crédito é uma questão de **custo por tarefa concluída**, não de
preço por token. Um modelo barato que falha na validação de schema custa a chamada, a
retentativa e o tempo de quem espera. Um modelo caro em texto rotineiro custa cinco vezes
mais pelo mesmo resultado. Esta skill existe para que a decisão seja feita com número, uma
vez, e vire dado versionado que o Forge aplica sozinho.

## O que já existe no repositório (use, não reinvente)

| Peça | Onde | O que faz |
|---|---|---|
| Catálogo de modelos e preços | `shared/eficiencia/catalogo-modelos.json` | Preço por milhão nos quatro medidores (entrada, saída, leitura e escrita de cache), contexto, esforços, forças e o que evitar. Versionado, com data e fonte |
| Perfis de intenção | `shared/eficiencia/perfis.json` | Para cada intenção (`site`, `aplicacao`, `local`, `api`, `automacao`) e cada etapa do copiloto: modelo, escalada, esforço, `max_tokens`, cache e motivo |
| Motor determinístico | `shared/eficiencia/motor.js` | `calcularCustoUsd`, `inferirIntencao`, `recomendar`, `ranquear`, `simularMensal`. Puro, testado, sem rede |
| API local | `GET /api/eficiencia/{catalogo,recomendacao,painel}`, `POST /api/eficiencia/chamadas` | Contrato em `shared/schemas/eficiencia.js` e `docs/07_APIS/README.md` |
| Dashboard | página **Eficiência** no Forge (`src/features/eficiencia/`) | Gasto contra o teto, ranking por sucesso por dólar, recomendação por etapa, simulador |
| Estimador de terminal | `scripts/estimar.mjs` (nesta skill) | Mesma resposta do dashboard, sem subir o Forge |

Nada aqui depende de LLM. O copiloto é enfeite, o motor é engrenagem (ADR-004).

## Fluxo

### 1. Identifique a intenção da aplicação

A intenção muda a recomendação: revisar o blueprint de um SaaS multi-tenant merece Opus em
esforço baixo; revisar o de um site fica no Sonnet. Fontes, nesta ordem:

1. **Preset do projeto** (`presets/*.json`, campo `categoria`): confiança alta.
2. **Descrição livre** da pessoa: `inferirIntencao({ descricao })` casa sinais por palavra inteira, sem acento.
3. Sem sinal: `aplicacao` com confiança baixa. Diga isso e pergunte só se a resposta mudar a recomendação.

```bash
node .claude/skills/low-cost-efficiency/scripts/estimar.mjs --descricao "landing page com SEO para a cafeteria"
```

### 2. Consulte o catálogo e o perfil, nunca a memória

Preço de modelo muda e a memória do agente fica velha. Toda recomendação sai de
`catalogo-modelos.json` e `perfis.json`. Se o pedido envolve um modelo que não está no
catálogo, ou uma data de preço com mais de 90 dias, avise e ofereça atualizar o catálogo
(seção 6) antes de recomendar.

```bash
node .claude/skills/low-cost-efficiency/scripts/estimar.mjs --intencao aplicacao --etapa blueprint-revisar
node .claude/skills/low-cost-efficiency/scripts/estimar.mjs --intencao site --todas
```

### 3. Aplique as alavancas na ordem certa

As gratuitas vêm antes das que trocam capacidade por custo. Detalhe e números esperados em
`references/alavancas.md`.

1. **Cache de prompt** no prefixo estável (sistema, preset, blueprint), TTL de 1 h quando as chamadas esperam humano entre si. Leitura custa 10% da entrada.
2. **Higiene de entrada**: só o trecho do blueprint que a etapa usa; nada de dump do projeto.
3. **Higiene de saída**: JSON estrito com `output_config.format`, `max_tokens` do perfil, sem preâmbulo.
4. **Batch** (50% em tudo) só quando ninguém espera. O wizard espera, então não.
5. **Esforço** (`output_config.effort`): `low` em derivação e nomeação, `medium` em redação, `high` só onde a nuance importa.
6. **Modelo** por último: desça um degrau de cada vez e meça. Suba pela escalada do perfil, não por palpite.

### 4. Recomende com número

Formato de resposta quando alguém pergunta "qual modelo uso para X":

```
Intenção: aplicacao (preset criar-aplicacao-web, confiança alta)
Etapa: blueprint-revisar
Recomendação: claude-opus-5, esforço low, max_tokens 2500, cache sistema_e_preset_e_blueprint por 1h
Custo típico: US$ 0,0775 por chamada (US$ 0,0523 com cache). Escalada: o mesmo modelo em medium.
Motivo: é a única etapa em que o erro custa mais que a chamada: incoerência vai para o disco.
Alternativas (chamada típica): haiku 0,0155 · sonnet 0,0310 · opus 0,0775 · fable 0,1550
```

Sempre mostre a alternativa mais barata e o que ela perde. A decisão é do dono; o número é seu.

### 5. Meça no painel, não no achismo

Toda chamada do copiloto vai para `copilot_calls` via `POST /api/eficiencia/chamadas`, com
tokens dos quatro medidores, estado (`sucesso`, `invalido`, `erro`, `timeout`), intenção e
duração. O custo é calculado no servidor pelo catálogo. O painel Eficiência ranqueia por
**sucessos por dólar**: o modelo com pontuação 100 é o que mais entregou por crédito gasto.

Regras de leitura do ranking:

- **Amostra pequena** (menos de 5 chamadas) não muda decisão. Espere.
- Taxa de sucesso abaixo de 80% em uma etapa: o problema é prompt ou schema antes de ser modelo.
- Gasto acima de 70% do teto antes do dia 20: reduza esforço nas etapas de redação antes de trocar modelo.
- Modelo frontier com pontuação maior que o Sonnet na mesma etapa por 20 ou mais chamadas: promova no `perfis.json` e registre em `memory/decisions.md`.

### 6. Registre o que mudou

Mudança de recomendação é mudança de dado, não de código: edite `perfis.json`, rode
`npm test` (o motor valida perfil e catálogo ao carregar), registre uma decisão leve em
`memory/decisions.md` com data, o que mudou e o número que motivou. Preço novo: edite
`catalogo-modelos.json`, suba `versao`, ajuste `atualizado_em`, e cite a página de preços
como fonte. Nunca busque preço em runtime (restrição T-01).

## Regras que não se negociam

- **Copiloto do Forge nunca usa Fable 5.1.** Custa 5x o Sonnet 5 para enriquecer texto curto. O teto é 5 USD por mês.
- **Modelo sem esforço configurável (Haiku 4.5) entra com `esforco: null`.** Não mande `output_config.effort` para ele.
- **Escalada é uma tentativa, não um loop.** Falhou no schema uma vez: repara com o modelo de escalada uma vez; falhou de novo: fallback determinístico (bug R-06, ADR-004).
- **Custo é calculado no servidor.** Cliente e copiloto mandam tokens, nunca dólares.
- **Toda chamada passa pelo registro.** Chamada sem linha em `copilot_calls` é bug, não economia.
- **Nada do cofre vai para prompt, nada de conteúdo de arquivo vai como instrução** (S-05, S-07).

## Onde ler mais

- `references/modelos.md`: ficha por modelo, quando usar, quando evitar, e como o preço se compõe.
- `references/perfis-de-intencao.md`: as cinco intenções, a tabela etapa × modelo, e como adicionar uma intenção nova.
- `references/alavancas.md`: as seis alavancas com o efeito esperado e o que quebra cada uma.
- `references/operacao-com-credito.md`: rotina mensal, teto, escalada, o que fazer quando o crédito acaba, e o checklist para qualquer chamada nova.
- Skill `claude-api` (global): parâmetros exatos da API, `cost-optimize` para código fora do Forge.
