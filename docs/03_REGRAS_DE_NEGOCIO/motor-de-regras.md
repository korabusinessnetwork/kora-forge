# Motor de Regras, o "IA sem ser IA"

O que faz o Forge parecer inteligente não é modelo de linguagem, é um conjunto de regras
declarativas que reagem ao blueprint. É previsível, testável, funciona offline e nunca
alucina. Ver **ADR-004**.

## Anatomia de uma regra

```json
{
  "id": "seg-pagamento-exige-edge-function",
  "versao": 1,
  "quando": { "campo": "integracoes", "operador": "contem", "valor": "pagamento" },
  "severidade": "bloqueio",
  "titulo": "Pagamento exige lógica no servidor",
  "explicacao": "Cálculo de valor e confirmação de pagamento não podem viver no front. No padrão Kora isso vai para Edge Function.",
  "efeitos": [
    { "tipo": "exigir_adr", "template": "adr-pagamento" },
    { "tipo": "adicionar_arquivo", "template": "supabase/functions/pagamento" },
    { "tipo": "adicionar_item_backlog", "texto": "Testar fluxo de pagamento em sandbox" },
    { "tipo": "marcar_seguranca", "controle": "S-PAGAMENTO" }
  ],
  "dispensavel": false
}
```

## Operadores suportados

`igual`, `diferente`, `contem`, `nao_contem`, `maior_que`, `menor_que`, `existe`,
`vazio`, `e`, `ou`. Nada além disso, e nunca expressão avaliada em runtime. Regra é dado,
não código (mesmo princípio dos presets, P-01, **ADR-007**).

## Tipos de efeito

| Efeito | O que faz |
|---|---|
| `avisar` | Mostra mensagem junto ao campo que causou |
| `exigir_adr` | Adiciona um ADR obrigatório ao plano de geração |
| `adicionar_arquivo` | Inclui um template no plano |
| `remover_arquivo` | Tira um template do plano |
| `sugerir_valor` | Propõe um valor para outro campo, que o usuário aceita ou não |
| `adicionar_dependencia` | Inclui pacote no `package.json` gerado |
| `adicionar_comando` | Inclui comando na whitelist da materialização |
| `adicionar_item_backlog` | Escreve item em `docs/09_BACKLOG/` do projeto gerado |
| `marcar_seguranca` | Liga um controle no `docs/11_SEGURANCA/` do projeto gerado |
| `bloquear` | Impede a materialização enquanto não resolvido |

## Catálogo inicial de regras (Fase 1)

| Id | Quando | Severidade | Efeito principal |
|---|---|---|---|
| `arq-multitenant-obrigatorio` | preset é aplicação web | bloqueio | exige `tenant_id` em toda entidade e ADR de multi-tenant |
| `seg-rls-obrigatorio` | usa Supabase | bloqueio | gera política RLS por tabela e checklist em `11_SEGURANCA` |
| `seg-service-role-no-front` | chave `service_role` aparece no blueprint | bloqueio | recusa e explica o risco |
| `seg-pagamento-exige-edge-function` | integra pagamento | bloqueio | Edge Function mais ADR |
| `seg-dado-pessoal-lgpd` | marca "trata dado pessoal" | aviso | seção de LGPD em `11_SEGURANCA`, base legal e retenção |
| `arq-auth-exige-rota-protegida` | tem login | aviso | gera guarda de rota e estado de sessão |
| `custo-servico-pago` | escolhe serviço fora do tier gratuito | aviso | mostra custo, alternativa gratuita e pede decisão registrada |
| `ux-tem-ui-exige-design-system` | projeto tem UI | bloqueio | exige passar pelo Studio ou aceitar o tema default |
| `qa-funcao-pura-com-teste` | sempre | info | inclui setup de testes e exemplo |
| `doc-fundacao-obrigatoria` | sempre | bloqueio | `CLAUDE.md`, `memory/` e `docs/00` a `11` no plano |
| `arq-offline-first` | preset é aplicação local | aviso | sugere fila de sincronização e estado offline nas telas |
| `seg-runner-ferramenta-ausente` | comando exige ferramenta não instalada | bloqueio | detecta antes de executar e ensina a instalar |
| `seo-meta-obrigatorio` | preset é site | aviso | gera meta tags e Open Graph a partir da identidade, avisa se título ou descrição faltam |
| `seg-bind-localhost` | preset é aplicação local | bloqueio | servidor gerado liga só em `127.0.0.1`, recusa `0.0.0.0` na configuração |
| `seg-token-sessao-local` | preset é aplicação local | bloqueio | gera token de sessão e checagem de `Origin` em toda rota do servidor local |
| `seg-whitelist-comandos` | aplicação local que executa processos do sistema | bloqueio | exige runner com whitelist e `spawn` sem shell, mais o controle em `11_SEGURANCA` |

## Ciclo de vida de um disparo

```
blueprint muda → motor reavalia TODAS as regras (é barato, é síncrono)
              → hits novos aparecem junto ao campo
              → usuário resolve, dispensa (com justificativa) ou ignora info
              → hit registrado em rule_hits com estado final
              → bloqueio pendente impede a etapa Materializar
```

## Onde entra o copiloto (e onde não entra)

O copiloto **nunca** avalia regra. Ele pode, quando ligado:

- transformar a explicação de um hit em texto mais específico ao projeto,
- redigir a visão, personas e regras de negócio a partir das respostas,
- sugerir nome de projeto e de entidades,
- revisar o blueprint e apontar incoerência em linguagem natural.

Tudo isso é sugestão, é rotulado como IA e não altera nada sem aceite. Com o copiloto
desligado, cada um desses pontos tem um caminho determinístico equivalente (texto
padrão do template, nome derivado do slug, checklist estático).

## Testes

Cada regra tem teste unitário com um blueprint mínimo que a dispara e um que não a
dispara. Regra sem teste não entra no catálogo.
