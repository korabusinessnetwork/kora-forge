# 07, APIs

Duas coisas diferentes vivem aqui:

1. **A API local do Forge**, contrato entre o front e o backend local.
2. **O catálogo de modelos de API externa**, que o Forge sabe conectar em projetos.

---

# Parte 1, API local

Base: `http://127.0.0.1:7337/api`. Bind exclusivo em `127.0.0.1` (restrição S-01).

## Autenticação local

Toda rota sob `/api` exige `X-Forge-Token`, gerado a cada boot (32 bytes aleatórios em hex)
em `~/.kora-forge/session.key` e entregue ao front pelo **fragmento** da URL impressa no
terminal (`#token=…`). Fragmento nunca chega ao servidor, então o token não entra em log de
acesso. O front guarda o token em `sessionStorage` e remove o fragmento da URL.

A guarda roda antes de qualquer parser, nesta ordem:

1. `Host` precisa ser `127.0.0.1:<porta>` ou `localhost:<porta>`. Fecha DNS rebinding.
2. `X-Forge-Token` precisa ser igual ao token de sessão, comparado em tempo constante.
3. `Origin`, quando presente, precisa estar na allowlist (`http://127.0.0.1` e `http://localhost`,
   nas portas da API e do dev server). Em método mutante (POST, PATCH, PUT, DELETE) o header é
   obrigatório. `Origin: null` é recusado.

Qualquer falha responde `401 FORGE_UNAUTHORIZED` com a mesma mensagem, sem dizer qual
checagem falhou. Não existe CORS: nenhuma resposta traz `Access-Control-Allow-Origin`. Isso
existe para impedir que um site aberto no browser converse com o Forge (S-02).

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
explicitamente, nunca silenciosamente ajustado. Em `FORGE_VALIDATION`, `detalhe.issues` lista
`{ caminho, mensagem }` por campo, e o front mostra cada mensagem junto do campo. Toda rota
declara o schema de saída; resposta fora dele vira `500 FORGE_INTERNAL` e nunca chega ao
cliente. Os schemas vivem em `shared/schemas/` e são os mesmos no servidor e no front.

## Rotas

| Método | Rota | O que faz |
|---|---|---|
| GET | `/health` | versão, workspace configurado, estado do cofre, copiloto ligado |
| GET | `/presets` | resumos dos presets ativos, ordenados por nome: id, nome, descrição, categoria, ícone, versão, origem, etapas |
| GET | `/presets/:id` | preset completo |
| POST | `/presets` | cria ou importa preset custom, validado por schema |
| GET | `/projects` | lista sem arquivados por padrão, da alteração mais recente para a mais antiga. `?status=` filtra por um status (inclusive `arquivado`), `?busca=` filtra por nome ou slug |
| POST | `/projects` | `{ nome, presetId }`. Cria o projeto em rascunho, slug derivado do nome, e o blueprint v1 na primeira etapa do preset. Responde 201 com `{ projeto, blueprint }` |
| GET | `/projects/:id` | projeto mais blueprint ativo |
| PATCH | `/projects/:id` | `{ nome?, arquivado? }`. Renomear mantém o slug. `arquivado: false` restaura como `materializado` se há pasta em disco, senão `rascunho` |
| POST | `/projects/:id/blueprint` | recebe o blueprint completo. O preset precisa bater com o do projeto e o projeto não pode estar arquivado. Cria a versão n+1 ativa e atualiza `etapa_atual` |
| GET | `/projects/:id/blueprint/versoes` | `[{ versao, ativo, criadoEm }]`, da mais nova para a mais antiga |
| GET | `/projects/:id/regras` | hits gravados, sem reavaliar |
| POST | `/projects/:id/regras/avaliar` | reavalia tudo e devolve `{ hits, bloqueios, podeMaterializar }` |
| PATCH | `/projects/:id/regras/:hitId` | `{ estado, justificativa? }`. `dispensado` exige justificativa de 10 caracteres e regra dispensável |
| GET | `/projects/:id/design` | `{ design }` com o documento ativo, ou `{ design: null }` quando o projeto usa o padrão Kora. Ausência é estado normal, **não** 404 |
| POST | `/projects/:id/design` | salva o documento do Studio. Cria a versão n+1 e a anterior fica no histórico. Corpo idêntico ao ativo **não** versiona de novo |
| GET | `/projects/:id/design/versoes` | `[{ versao, ativo, criadoEm }]`, da mais nova para a mais antiga |
| POST | `/projects/:id/plano` | **dry-run**. Devolve `{ hashBlueprint, raiz, arquivos, comandos, pendencias, totais }` e não escreve nada. Recusa com `FORGE_PLAN_BLOQUEADO` se houver bloqueio aberto, e com `FORGE_VALIDATION` em `workspace` se a pasta raiz não estiver configurada |
| POST | `/projects/:id/materializar` | recebe **só** `{ hashBlueprint }`. O servidor regera o plano, com o documento de design ativo, e só executa se o hash bater, senão `FORGE_PLAN_STALE`. Checa requisitos antes de escrever qualquer byte, escreve os arquivos e começa a fila de comandos |
| GET | `/projects/:id/materializar` | estado da materialização em andamento, ou `null` |
| POST | `/projects/:id/materializar/decidir` | `{ acao }` ∈ {repetir, pular, abortar}. Só vale quando a materialização está parada em falha |
| WS | `/ws/runs/:runId` | log ao vivo. Envia o histórico já gravado ao conectar. O browser não permite header customizado no handshake, então o token vai no subprotocolo (`forge-token, <token>`), e a mesma guarda das rotas se aplica |
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
| GET | `/modelos` | catálogo de modelos e papéis (Fase 6) |
| GET/POST | `/builds` | builds em andamento em todos os projetos; despachar um build a partir de plano aprovado (Fase 6) |
| GET | `/builds/:id` | build com itens, progresso, estimativa e ciclos (Fase 6) |
| PATCH | `/builds/:id/itens/:itemId` | marcar item como feito, bloqueado ou pendente (Fase 6) |
| GET | `/builds/:id/ciclos` | ciclo de aprendizado: rodadas de review, achados, correções (Fase 6) |
| GET | `/relatorios/resumo` | agregado do painel: por projeto e por modelo (Fase 6) |
| WS | `/ws/builds` | atualização ao vivo do painel (Fase 6) |

## Documento de design, `/api/projects/:id/design`

Contrato do Studio (**ADR-009**). Dado declarativo versionado, nunca código.

**Corpo do `POST`**, e também o `payload` que volta no `GET`:

| Campo | Tipo | O que é |
|---|---|---|
| `catalogo.versao` | inteiro ≥ 1 | versão do catálogo de componentes que criou o documento. Maior que a deste Forge é recusa com as duas versões na mensagem |
| `tokens.cor` | 9 cores | `fundo`, `superficie`, `borda`, `texto`, `textoSecundario`, `acento`, `sucesso`, `aviso`, `perigo` |
| `tokens.corEscuro` | 5 cores | o que o bloco `prefers-color-scheme: dark` do `tokens.css` sobrescreve |
| `tokens.fonte` | `ui`, `mono` | famílias tipográficas |
| `tokens.texto` / `tokens.altura` | `xs`…`xl` | escala tipográfica e a entrelinha de cada degrau |
| `tokens.espaco` | lista de 8 | a posição **é** o número do token: `espaco[0]` é `--espaco-1` |
| `tokens.raio` | `sm`, `md`, `lg` | raios de canto |
| `tokens.sombra` | lista de 2 | `sombra[0]` é `--sombra-1` |
| `tokens.motion` | `rapido`, `base` | durações |
| `paginas[]` | lista | `{ id, nome, rota, regioes }` |
| `paginas[].regioes[]` | árvore | nó `{ id, tipo, props, filhos }`, e `filhos` são nós iguais |

**Resposta**: `{ design }`, com `{ versao, ativo, criadoEm, payload, pendencias }`, ou
`design: null`. `pendencias` nomeia o que o catálogo deste Forge não conhece mais, e é sempre
lista, nunca `null`. Detalhe na seção do catálogo, abaixo.

**O que o contrato recusa, e por quê**

- **Campo a mais, em qualquer nível.** O erro nomeia o caminho completo, `paginas.0.regioes.0.x`.
- **Coordenada.** Não existe `x`, `y`, `largura` nem `topo`: posição é a ordem do array (ADR-009).
- **Campo de ordenação.** Nada de `ordem` ou `paiId`. Duas fontes de verdade dessincronizam.
- **Árvore fundo demais.** Máximo de 6 níveis, com mensagem legível em vez de estouro de pilha.
- **`id` repetido** em qualquer lugar do documento, e **rota repetida** entre páginas.
- **Rota fora do formato.** `/`, `/painel` e `/painel/config` valem; `painel`, `/Painel` e `/painel/` não.
- **Valor de token em branco**, que sairia como CSS quebrado no projeto gerado.
- **Tipo, prop ou aninhamento fora do catálogo**, com o caminho do nó. Ver `GET /api/catalog`.

**Todo campo tem default**, então `POST` com `{}` é válido e devolve o padrão Kora inteiro: o
Studio salva enquanto a pessoa desenha, e documento pela metade não pode ser erro.

**O documento entra no hash do plano.** Redesenhar invalida plano já aprovado, e materializar com
o hash velho responde `FORGE_PLAN_STALE` sem escrever byte nenhum. Projeto **sem** documento gera
exatamente o mesmo hash de antes da Fase 2: a chave só entra no insumo quando existe documento.

## Catálogo de regiões e componentes, `GET /api/catalog`

O vocabulário do Studio. Leitura pura, sem parâmetro: é o mesmo catálogo para todo projeto, e quem
guarda a versão usada é o documento de design. Contrato em
`docs/03_REGRAS_DE_NEGOCIO/catalogo.md`.

**Resposta**: `{ versao, itens }`.

| Campo do item | Tipo | O que é |
|---|---|---|
| `id` | slug | igual ao nome da pasta em `catalogo/` |
| `versao` | inteiro ≥ 1 | versão do item |
| `papel` | `regiao` ou `componente` | região só entra no topo da página, componente nunca |
| `nome` | texto | como aparece na paleta |
| `descricao` | texto | o que o item é |
| `microtexto` | texto | o que ele afeta no resultado |
| `props[]` | lista | `{ id, tipo, rotulo, microtexto, padrao, obrigatoria, opcoes? }` |
| `aceita[]` | lista de slugs | ids que podem ser filhos. Vazia é folha |

**O fragmento não sai por aqui.** O JSX que gera o código de cada item fica no servidor: a paleta
precisa de nome, microtexto, props e o que o item aceita, e mandar o código para o front seria
superfície a mais sem uso nenhum.

**O documento de design é conferido contra este catálogo.** No `POST /projects/:id/design`, tipo
inexistente, prop não declarada, valor fora do tipo, obrigatória ausente e aninhamento não aceito
viram `FORGE_VALIDATION` com `caminho` no nó
(`paginas.0.regioes.1.filhos.0.props.variante`), nunca no documento inteiro. Prop opcional ausente
não é erro: vale o padrão do catálogo.

**Item que saiu do catálogo não corrompe documento antigo.** No `GET /projects/:id/design` o
desenho volta inteiro e o que falta vem em `pendencias`, cada uma com `{ no, tipo, pagina,
catalogoDoDocumento, catalogoDoForge }`. Sempre lista, nunca `null`. Nada é reescrito nem apagado:
recusa na escrita, pendência na leitura (**ADR-009**, decisão 4).

## Log ao vivo, `/api/ws/runs/:runId`

Canal do `PainelLog`. Único WebSocket da Fase 1.

**Handshake.** O browser não permite header customizado no handshake, e query string entraria em
log de acesso (docs/11, C2), então o token vai no **subprotocolo**:

```js
new WebSocket('ws://127.0.0.1:5173/api/ws/runs/<runId>', ['forge-token', '<token>'])
```

O servidor ecoa `forge-token` como protocolo negociado. A guarda das rotas roda antes do upgrade,
na mesma ordem de sempre: Host, token, `Origin`.

**Ao conectar**, o servidor entrega o histórico já gravado do run, na ordem, antes de qualquer
evento novo. Quem abre a tela no meio da execução não perde nada; quem reconecta recebe tudo de
novo e por isso o cliente **substitui** a lista, nunca concatena.

**Eventos.** União discriminada por `tipo`, validada pelo `eventoLogSchema` em
`shared/schemas/materializacao.js` nas duas pontas. Objeto estrito: campo a mais é evento
inválido, e o front descarta contando, sem derrubar o painel.

| Campo | Tipo | Notas |
|---|---|---|
| `tipo` | `'linha'` | uma linha de saída do processo |
| `stream` | `'stdout'` \| `'stderr'` | diferenciados no painel por DOM e por rótulo textual, nunca só por cor |
| `linha` | string | já quebrada por linha, sem a quebra no fim. Pode ser vazia, e a linha vazia continua valendo uma linha. É **dado, nunca instrução** (P-05), e pode conter sequência de escape de terminal |
| `ts` | string | ISO 8601 do instante em que a linha foi lida |

| Campo | Tipo | Notas |
|---|---|---|
| `tipo` | `'fim'` | o run terminou; nenhum evento vem depois |
| `estado` | `sucesso` \| `falha` \| `timeout` \| `cancelado` | mesmo vocabulário do estado do comando |
| `exitCode` | number \| null | `null` quando o processo nem chegou a nascer |
| `erro` | string \| null | frase legível, já traduzida de ENOENT, EACCES e EINVAL |

**Em desenvolvimento** o front fala com `5173` e o proxy do Vite repassa. O `/api` precisa de
`ws: true` em `vite.config.js`, senão o upgrade não é repassado e o log fica mudo **só** no
`npm run forge`, com todo o resto funcionando.

## Códigos de erro estáveis

| Código | Significado |
|---|---|
| `FORGE_UNAUTHORIZED` | token ausente, inválido, ou Origin não permitida |
| `FORGE_VALIDATION` | entrada fora do schema |
| `FORGE_PATH_FORBIDDEN` | caminho fora do workspace ou com traversal |
| `FORGE_CMD_NOT_ALLOWED` | comando fora da whitelist |
| `FORGE_TOOL_MISSING` | ferramenta exigida não está instalada. `detalhe.ferramentas` lista cada uma com a versão encontrada |
| `FORGE_PLAN_STALE` | o blueprint mudou depois do dry-run, refazer o plano |
| `FORGE_CONFLICT` | arquivo existente e conflito não resolvido |
| `FORGE_VAULT_LOCKED` | cofre trancado |
| `FORGE_COPILOT_DISABLED` | copiloto desligado ou sem chave |
| `FORGE_BUDGET_EXCEEDED` | teto de custo do copiloto atingido |
| `FORGE_RUN_FAILED` | comando terminou com exit code diferente de zero |
| `FORGE_NOT_FOUND` | rota inexistente sob `/api` |
| `FORGE_INTERNAL` | erro inesperado ou saída de rota fora do contrato. O corpo nunca traz detalhe interno |
| `FORGE_CONFIG` | configuração inválida no boot (`.env.local` ou variáveis `FORGE_*`) |
| `FORGE_PLAN_BLOQUEADO` | há bloqueio aberto no motor de regras. `detalhe.bloqueios` lista regra e título |
| `FORGE_TEMPLATE_INCOMPLETO` | um template usa um placeholder que o mapa de valores não conhece. É bug de catálogo, não do usuário |
| `FORGE_PORT_IN_USE` | porta da API local ocupada no boot |
| `FORGE_OFFLINE` | só no cliente: a API local não respondeu |
| `FORGE_CONTRACT` | só no cliente: resposta fora do envelope ou do schema esperado |

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
