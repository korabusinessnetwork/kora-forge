# Regras

O catálogo do motor determinístico. Regra é dado, nunca código (**ADR-004**, padrão P-08).
Criar regra nova é criar um arquivo aqui, sem tocar no código do Forge.

Contrato completo em `docs/03_REGRAS_DE_NEGOCIO/motor-de-regras.md`. Toda regra é validada por
`shared/schemas/regra.js` no boot: regra fora do contrato derruba o Forge em vez de subir pela
metade.

| Campo | Papel |
|---|---|
| `severidade` | `info`, `aviso` ou `bloqueio`. Só bloqueio impede a materialização |
| `resolucao` | `automatica` quando o gerador cuida sozinho (o hit nasce resolvido), `humana` quando alguém precisa decidir |
| `dispensavel` | Se o usuário pode dispensar com justificativa. Regra de resolução automática nunca é dispensável |
| `quando` | Condição sobre o contexto, com os operadores documentados. Nenhuma expressão é avaliada em runtime |
| `efeitos` | O que a regra pede ao gerador e ao plano de segurança |
| `etapa` e `campo` | Onde o aviso aparece no wizard, junto do que o causou |

Regra sem teste não entra no catálogo: cada uma tem um contexto que dispara e um que não dispara
em `shared/regras.test.js`.
