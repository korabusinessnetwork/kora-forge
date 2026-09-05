# 04, Modelagem

Banco local SQLite em `~/.kora-forge/forge.db`. Schema completo em `schema.sql`.

## Nota sobre multi-tenant

Não há `tenant_id` neste schema. O Forge é single-user local, decisão registrada em
**ADR-003**. O multi-tenant vive nos projetos que ele gera, onde continua obrigatório.
Se um dia o Forge virar hospedado, `tenant_id` entra em todas as tabelas e o custo dessa
migração está aceito no ADR.

## Entidades

```
presets ──┐
          ├──< projects ──< blueprints
          │        │
          │        ├──< design_documents
          │        ├──< command_runs ──< command_logs
          │        ├──< rule_hits >── rules
          │        ├──< copilot_calls
          │        └──< project_connections >── api_connections ──< vault_entries
          │                                            │
          └── api_templates ───────────────────────────┘

events (log append-only, referencia projeto quando aplicável)
ideas  (independente de projeto)
settings (chave-valor)
```

| Entidade | Papel |
|---|---|
| `presets` | Os menus. Builtin (versionado no repo) ou custom (do usuário) |
| `projects` | Um projeto criado pelo Forge, com caminho em disco e status |
| `blueprints` | Estado completo do projeto, versionado. Um projeto tem N versões, uma ativa |
| `design_documents` | Saída do Studio: tokens, páginas e hierarquia, versionado. Projeto **sem** documento é estado normal, e quer dizer "usei o padrão Kora" |
| `api_templates` | Modelos de integração (Supabase, Stripe, WhatsApp, Anthropic, etc.) |
| `api_connections` | Uma conexão configurada pelo usuário. **Nunca guarda o segredo** |
| `vault_entries` | O segredo criptografado, ligado à conexão. AES-256-GCM |
| `project_connections` | Quais conexões um projeto usa |
| `rules` | Catálogo de regras determinísticas, versionado |
| `rule_hits` | Cada disparo de regra em um projeto, com o estado final |
| `command_runs` | Execução de comando pelo runner, com exit code e duração |
| `command_logs` | Linhas de stdout e stderr, separadas por stream |
| `copilot_calls` | Auditoria de consumo do copiloto, para controle de custo |
| `events` | Log append-only de eventos `dot.case` |
| `ideas` | Gaveta de ideias capturadas sem sair do fluxo (RN-10) |
| `settings` | Workspace, tema, teto do copiloto, flags |

## Invariantes

1. Um projeto tem exatamente um blueprint ativo. Salvar cria versão nova, não sobrescreve.
1.1. `design_documents` **não tem coluna `ativo`**, e não precisa: a versão ativa é sempre a de
   maior número. Um estado a menos é um estado a menos para dessincronizar.
2. `api_connections.status` só vira `ativa` depois de um teste de conexão bem-sucedido.
3. `vault_entries` nunca é lido por rota que responda ao front. Só o módulo Cofre acessa.
4. `command_runs.cwd` é sempre validado contra o workspace antes de gravar.
5. `events` é append-only. Nunca é atualizado nem apagado.
6. Um `rule_hit` por par projeto e regra, garantido por índice único. Reavaliar atualiza o registro, nunca duplica.
6. Apagar projeto no Forge não apaga a pasta em disco. São coisas separadas de propósito.

## Ciclo de vida do documento de design (ADR-009)

O documento é a saída do Studio e a segunda entrada do gerador, ao lado do blueprint. São **dois
ciclos de vida diferentes**, e é por isso que são duas tabelas:

| | `blueprints` | `design_documents` |
|---|---|---|
| Quem escreve | o wizard | o Studio |
| Quando versiona | a cada avanço de etapa | a cada sessão de desenho |
| Existe sempre? | sim, desde o `POST /projects` | não. Ausência quer dizer "padrão Kora" |
| Versão ativa | coluna `ativo` | a de maior número |

**Como o documento ocupa as colunas.** `tokens_json` guarda o grupo `tokens`. `paginas_json`
guarda a parte estrutural inteira, `{ catalogo, paginas }`, e não só o array de páginas: é o que
permite gravar a versão do catálogo sem abrir migration numa tabela que já existe.

**Salvar.** `POST /projects/:id/design` grava a versão n+1 e emite `design.salvo`. Corpo idêntico
ao documento ativo **não** cria versão nova, porque o Studio salva sozinho enquanto a pessoa
desenha e o histórico encheria de versão igual. Projeto arquivado recusa, e manda restaurar antes.

**Relação com o plano.** O documento entra no hash do plano, então redesenhar invalida plano já
aprovado. A chave só entra no insumo do hash quando existe documento: projeto que nunca abriu o
Studio gera exatamente o mesmo plano de antes da Fase 2, byte a byte.

**Compatibilidade.** `catalogo.versao` maior que a deste Forge é recusa com as duas versões na
mensagem, nunca abertura pela metade. Componente que sai do catálogo não reescreve nem apaga
documento antigo: vira pendência declarada no plano, como template ausente já vira hoje.

## Extensão prevista, Fase 6 (ADR-008, proposto)

Entra em `schema.sql` só quando o ADR-008 for aceito. Registrada aqui para o painel de relatórios
nascer document-first.

| Entidade | Papel |
|---|---|
| `modelos` | Catálogo: id, provedor, nome, papel padrão (planejar, construir, revisar), custo estimado por 1k tokens |
| `builds` | Uma execução do harness em um projeto: spec de origem, modelo por papel, estado (planejado, aprovado, rodando, em_review, aprovado_sem_ressalvas, falhou, parado), iniciado_em, terminado_em |
| `build_itens` | Itens do plano (critérios da spec): estado (pendente, em_andamento, feito, bloqueado), dono (arquivo ou pasta), iniciado_em, terminado_em. Base do progresso e da estimativa |
| `build_ciclos` | Cada rodada spec → build → review: número, modelo, achados, correções feitas, o que virou learning. É o ciclo de aprendizado do modelo |

Invariantes previstas: progresso = itens feitos / itens totais; estimativa = mediana da duração dos
itens feitos vezes itens restantes, como faixa; build sem plano aprovado não sai de `planejado`.

## Convenções

- Tabelas e colunas em `snake_case`, plural nas tabelas.
- Todo registro tem `criado_em`, e `atualizado_em` quando for mutável, em ISO 8601 UTC.
- JSON grande vai em coluna `TEXT` com sufixo `_json`, sempre validado por Zod antes de gravar.
- Migrations em `server/db/migrations/YYYYMMDD_descricao.sql`, aplicadas em ordem, registradas em `schema_migrations`.
