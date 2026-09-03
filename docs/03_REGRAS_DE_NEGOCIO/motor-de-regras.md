# Motor de Regras, o "IA sem ser IA"

O que faz o Forge parecer inteligente não é modelo de linguagem, é um conjunto de regras
declarativas que reagem ao blueprint. É previsível, testável, funciona offline e nunca
alucina. Ver **ADR-004**.

## Anatomia de uma regra

Contrato validado por `shared/schemas/regra.js`. Objeto estrito: campo desconhecido é rejeitado,
nunca ignorado (controle C7). Os arquivos vivem em `regras/`, um por regra.

```json
{
  "id": "seg-pagamento-exige-edge-function",
  "versao": 1,
  "severidade": "bloqueio",
  "resolucao": "humana",
  "dispensavel": false,
  "titulo": "Dinheiro não é calculado no cliente",
  "explicacao": "Cálculo de valor e confirmação de pagamento vivem no servidor, em Edge Function.",
  "etapa": "seguranca",
  "campo": "seguranca.dadoFinanceiro",
  "quando": { "campo": "seguranca.dadoFinanceiro", "operador": "igual", "valor": true },
  "efeitos": [
    { "tipo": "bloquear" },
    { "tipo": "exigir_adr", "template": "adr-pagamento" },
    { "tipo": "adicionar_arquivo", "template": "functions/pagamento" },
    { "tipo": "adicionar_item_backlog", "texto": "Testar o fluxo de pagamento em sandbox" }
  ]
}
```

| Campo | Papel |
|---|---|
| `severidade` | `info`, `aviso` ou `bloqueio`. Só bloqueio aberto impede a materialização |
| `resolucao` | `automatica` quando o gerador cuida sozinho, `humana` quando alguém precisa decidir |
| `dispensavel` | Se dá para dispensar com justificativa. Regra de resolução automática nunca é dispensável |
| `etapa` e `campo` | Onde o aviso aparece no wizard. Com `campo`, ele nasce logo abaixo do campo que o causou; sem `campo`, no topo da etapa |
| `quando` | A condição. Ela descreve **o problema**, não o assunto: a regra para de disparar quando o problema deixa de existir, e é isso que resolve o hit sozinho |
| `efeitos` | O que a regra pede ao gerador e ao plano de segurança |

### Por que existe `resolucao`

Boa parte das regras não pede decisão nenhuma: quando o projeto usa Supabase, a política de RLS
simplesmente entra no plano. Se esse hit nascesse aberto, ele bloquearia a materialização para
sempre, porque não há nada que o usuário possa clicar para resolvê-lo.

Então: `resolucao: "automatica"` nasce **resolvido**, aparece na tela como "o plano já cuida
disso" e nunca bloqueia. `resolucao: "humana"` nasce **aberto** e, se for bloqueio, trava a etapa
Materializar até alguém agir. Sem essa separação, ou o catálogo mentiria sobre severidade, ou o
usuário ficaria preso.

## Operadores suportados

Folha: `igual`, `diferente`, `contem`, `nao_contem`, `maior_que`, `menor_que`, `existe`, `vazio`.
Grupo: `e` e `ou`, com aninhamento em qualquer profundidade.

Nada além disso, e nenhuma expressão avaliada em runtime: sem `eval`, sem `new Function`, sem
engine de template. Regra é dado, não código (mesmo princípio dos presets, P-01, **ADR-007**).

Detalhes que evitam surpresa:

- `contem` e `nao_contem` valem para lista e para texto.
- `maior_que` e `menor_que` só comparam número contra número. Texto contra número é falso, nunca coerção silenciosa.
- `existe` é falso para ausente e para `null`. `vazio` é verdadeiro para `''`, `[]`, `{}`, `null` e ausente.
- O caminho do campo é em ponto e aceita índice de lista (`ferramentasAusentes.0`). `__proto__`, `constructor` e `prototype` devolvem `undefined`: regra não passeia pelo protótipo.

## O contexto que as regras enxergam

`shared/contexto.js` monta, a partir do projeto, do preset e do blueprint, um objeto raso e
documentado. Etapa sem resposta entra com o default do schema, então regra nunca vê `undefined`
por blueprint pela metade.

| Caminho | O que é |
|---|---|
| `preset.id`, `preset.categoria`, `preset.etapas`, `preset.versao` | O menu de origem |
| `projeto.status`, `projeto.slug`, `projeto.materializado` | O projeto |
| `identidade.*`, `escopo.*`, `arquitetura.*`, `dados.*`, `seguranca.*`, `fundacao.*`, `materializar.*` | As respostas do wizard |
| `etapasConcluidas`, `assumidas` | Progresso do wizard |
| `temUi` | Vem de `defaults.tem_ui` do preset |
| `integracoes` | Vazio até a Fase 3 (API Hub) |
| `ferramentasAusentes` | Vazio até o bloco 7 (runner) |

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

Dezesseis regras, uma por arquivo em `regras/`. A coluna "quando" descreve a condição que a regra
avalia de verdade, não o assunto dela.

| Id | Quando (o problema) | Severidade | Resolução |
|---|---|---|---|
| `arq-multitenant-obrigatorio` | aplicação com modelo A e multi-tenant desligado | bloqueio | humana |
| `seg-rls-obrigatorio` | stack contém supabase | bloqueio | automática |
| `seg-service-role-no-front` | `service_role` aparece na stack ou nas integrações | bloqueio | humana |
| `seg-pagamento-exige-edge-function` | trata dinheiro, ou integra pagamento | bloqueio | humana |
| `seg-dado-pessoal-lgpd` | trata dado pessoal | aviso | automática |
| `arq-auth-exige-rota-protegida` | tem login | aviso | automática |
| `custo-servico-pago` | tier gratuito desmarcado | aviso | humana, dispensável |
| `ux-tem-ui-exige-design-system` | tem UI, o menu tem etapa de design, e ela não foi concluída nem assumida | bloqueio | humana |
| `qa-funcao-pura-com-teste` | sempre | info | automática |
| `doc-fundacao-obrigatoria` | sempre | bloqueio | automática |
| `arq-offline-first` | aplicação com modelo B (local) | aviso | humana, dispensável |
| `seg-runner-ferramenta-ausente` | há ferramenta ausente detectada pelo runner | bloqueio | humana |
| `seo-meta-obrigatorio` | site com essência ou proposta de valor em branco | aviso | humana, dispensável |
| `seg-bind-localhost` | aplicação com modelo B (local) | bloqueio | automática |
| `seg-token-sessao-local` | aplicação com modelo B (local) | bloqueio | automática |
| `seg-whitelist-comandos` | aplicação com modelo B (local) | bloqueio | automática |

Regra sem teste não entra no catálogo: cada uma tem, em `shared/regras.test.js`, um contexto que
a dispara e um que não a dispara, e o teste falha se o catálogo crescer sem esse par.

## Ciclo de vida de um disparo

```
blueprint muda → o motor reavalia TODAS as regras (é barato e síncrono)
              → regra que passou a disparar vira hit; com resolução humana, nasce aberto
              → hit aparece junto do campo que o causou, na etapa que a regra declara
              → usuário resolve mudando o blueprint, dispensa com justificativa, ou ignora
              → regra que parou de disparar tem o hit resolvido sozinho
              → bloqueio aberto impede chegar na etapa Materializar
```

Um hit por regra por projeto, garantido por índice único em `rule_hits(project_id, rule_id)`.
Reavaliar atualiza o registro, nunca duplica. Decisão humana sobrevive à reavaliação: dispensado
continua dispensado, ignorado continua ignorado, e só resolvido volta a aberto quando o problema
volta.

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
