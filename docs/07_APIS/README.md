# 07, APIs

Duas coisas diferentes vivem aqui:

1. **A API local do Forge**, contrato entre o front e o backend local.
2. **O catálogo de modelos de API externa**, que o Forge sabe conectar em projetos.

---

# Parte 1, API local

Base: `http://127.0.0.1:7337/api`. Bind exclusivo em `127.0.0.1` (restrição S-01).

## Autenticação local

Toda rota exige `X-Forge-Token`, gerado a cada boot em `~/.kora-forge/session.key` e
entregue ao front pelo servidor que serve o app. O header `Origin` é checado contra a
origem esperada. Sem token válido ou com Origin estranha: `401 FORGE_UNAUTHORIZED`.
Isso existe para impedir que um site aberto no browser converse com o Forge (S-02).

## Envelope

```json
{ "data": {}, "error": null, "meta": { "requestId": "…", "duracaoMs": 12 } }
```

Erro:

```json
{ "data": null,
  "error": { "codigo": "FORGE_PATH_FORBIDDEN", "mensagem": "Caminho fora do workspace.", "detalhe": {} },
  "meta": {} }
```

Toda entrada e toda saída validadas por Zod. Dado fora do contrato é rejeitado
explicitamente, nunca silenciosamente ajustado.

## Rotas

| Método | Rota | O que faz |
|---|---|---|
| GET | `/health` | versão, workspace configurado, estado do cofre, copiloto ligado |
| GET | `/presets` | lista presets builtin e custom |
| GET | `/presets/:id` | preset completo |
| POST | `/presets` | cria ou importa preset custom, validado por schema |
| GET | `/projects` | lista, com filtro por status |
| POST | `/projects` | cria projeto a partir de um preset |
| GET | `/projects/:id` | projeto mais blueprint ativo |
| PATCH | `/projects/:id` | renomear, arquivar |
| POST | `/projects/:id/blueprint` | salva nova versão do blueprint |
| GET | `/projects/:id/blueprint/versoes` | histórico |
| POST | `/projects/:id/regras/avaliar` | roda o motor de regras, devolve os hits |
| PATCH | `/projects/:id/regras/:hitId` | resolver, dispensar (exige justificativa) ou ignorar |
| POST | `/projects/:id/design` | salva o design_document do Studio |
| POST | `/projects/:id/plano` | **dry-run**, devolve o plano de arquivos e comandos. Não escreve nada |
| POST | `/projects/:id/materializar` | aplica um plano aprovado, devolve `runId` |
| WS | `/ws/runs/:runId` | log ao vivo do runner |
| POST | `/runs/:runId/parar` | encerra processo em execução |
| GET | `/api-templates` | catálogo de modelos de integração |
| GET | `/connections` | conexões, **sem segredo** |
| POST | `/connections` | cria conexão, o segredo vai direto para o cofre |
| POST | `/connections/:id/testar` | testa e atualiza o status |
| DELETE | `/connections/:id` | remove conexão e o segredo |
| POST | `/vault/destrancar` | destranca o cofre com a senha mestre |
| POST | `/copilot/sugerir` | sugestão do copiloto. `403 FORGE_COPILOT_DISABLED` se desligado |
| GET | `/ideas` / POST `/ideas` | gaveta de ideias |
| GET | `/events` | log de eventos, com filtro |
| GET/PATCH | `/settings` | workspace, tema, teto do copiloto |

## Códigos de erro estáveis

| Código | Significado |
|---|---|
| `FORGE_UNAUTHORIZED` | token ausente, inválido, ou Origin não permitida |
| `FORGE_VALIDATION` | entrada fora do schema |
| `FORGE_PATH_FORBIDDEN` | caminho fora do workspace ou com traversal |
| `FORGE_CMD_NOT_ALLOWED` | comando fora da whitelist |
| `FORGE_TOOL_MISSING` | ferramenta exigida não está instalada |
| `FORGE_PLAN_STALE` | o blueprint mudou depois do dry-run, refazer o plano |
| `FORGE_CONFLICT` | arquivo existente e conflito não resolvido |
| `FORGE_VAULT_LOCKED` | cofre trancado |
| `FORGE_COPILOT_DISABLED` | copiloto desligado ou sem chave |
| `FORGE_BUDGET_EXCEEDED` | teto de custo do copiloto atingido |
| `FORGE_RUN_FAILED` | comando terminou com exit code diferente de zero |

`FORGE_PLAN_STALE` existe para garantir que o que foi aprovado no dry-run é exatamente o
que será executado. O plano carrega um hash do blueprint, e a materialização recusa hash
diferente.

---

# Parte 2, modelos de API externa

Cada modelo é um dado que ensina o Forge a integrar um serviço em um projeto gerado.

```json
{
  "id": "supabase",
  "provider": "Supabase",
  "versao": 1,
  "variaveis": [
    { "nome": "VITE_SUPABASE_URL", "publica": true },
    { "nome": "VITE_SUPABASE_ANON_KEY", "publica": true },
    { "nome": "SUPABASE_SERVICE_ROLE_KEY", "publica": false, "proibida_no_front": true }
  ],
  "template_cliente": "servicos/supabase-client",
  "teste_conexao": { "tipo": "http", "metodo": "GET", "caminho": "/rest/v1/", "espera": [200, 401] },
  "docs": "docs/07_APIS/supabase.md",
  "regras": ["seg-rls-obrigatorio", "seg-service-role-no-front"]
}
```

## Catálogo inicial

| Modelo | Fase | Observação |
|---|---|---|
| Supabase | 1 | dispara as regras de RLS e de `service_role` |
| Anthropic | 3 | também é o modelo usado pelo próprio copiloto |
| Stripe | 3 | dispara a regra de pagamento, exige Edge Function |
| Mercado Pago | 3 | mesma regra de pagamento |
| WhatsApp Cloud API | 3 | webhook exige endpoint público, gera aviso |
| Resend ou SMTP | 3 | envio de e-mail |
| Google Drive | 5 | |
| Notion | 5 | |

## Regras do catálogo

1. Variável marcada `proibida_no_front` nunca entra em arquivo com prefixo `VITE_`, e a tentativa vira bloqueio.
2. Todo modelo tem teste de conexão. Sem teste, não entra no catálogo.
3. O projeto gerado recebe `.env.example` com nomes e instruções, jamais valores.
4. O cliente do serviço nasce na camada de serviços do projeto, nunca dentro de componente.
