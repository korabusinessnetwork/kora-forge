---
description: Recomenda modelo, esforço e cache pelo menor custo por tarefa concluída, usando a skill low-cost-efficiency
---

Pedido: $ARGUMENTS

Carregue a skill `low-cost-efficiency` (`.claude/skills/low-cost-efficiency/SKILL.md`) e siga o fluxo dela:

1. Identifique a intenção da aplicação (preset do projeto, senão a descrição em $ARGUMENTS, senão o padrão `aplicacao` dizendo que assumiu).
2. Rode o estimador em vez de calcular de cabeça:
   - etapa específica: `node .claude/skills/low-cost-efficiency/scripts/estimar.mjs --intencao <intencao> --etapa <etapa>`
   - visão completa: `node .claude/skills/low-cost-efficiency/scripts/estimar.mjs --intencao <intencao> --todas`
   - volume hipotético: `node .claude/skills/low-cost-efficiency/scripts/estimar.mjs --simular entrada=<n> saida=<n> chamadas=<n>`
3. Responda no formato da seção 4 da skill: intenção com confiança, recomendação com modelo, esforço, `max_tokens` e cache, custo típico com e sem cache, custo da escalada, motivo, e a alternativa mais barata com o que ela perde.
4. Se o pedido for para mudar a recomendação ou o preço, edite `shared/eficiencia/perfis.json` ou `catalogo-modelos.json`, rode `npm test`, e registre a decisão em `memory/decisions.md`.

Nunca recomende o Fable 5.1 para o copiloto do Forge e nunca invente preço: sem o modelo no catálogo, ofereça atualizar o catálogo primeiro.
