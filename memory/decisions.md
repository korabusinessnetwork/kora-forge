# Decisões, KORA FORGE

## Objetivo
Registrar decisões de produto e de processo que outros precisam conhecer mas que não
carregam trade-off arquitetural profundo o bastante para virar ADR, e manter o índice
dos ADRs existentes.

## Contexto
Decisão não registrada é decisão que volta a ser discutida daqui a três semanas, em
geral com resultado diferente. Este arquivo é o registro leve. O pesado vive em
`docs/08_DECISOES/`.

## Regras Gerais
- Se a decisão tem alternativa relevante descartada e consequência de longo prazo, ela é ADR, não entrada aqui.
- Toda entrada leva data, decisão em uma frase e motivo em uma frase.
- Decisão revogada não é apagada, é marcada `[REVOGADA]` com a data e o motivo.

## Validações
- A entrada diz o que foi decidido e por quê, sem depender de contexto de conversa.

## Permissões
- Qualquer agente ou dev registra. Apenas o dono revoga.

## Exceções
- Decisão tomada sob urgência entra com a tag `[PROVISÓRIA]` e prazo de revisão.

## Auditoria
- Data e autor obrigatórios. Revisão ao fim de cada fase.

## Eventos
- `decisao.registrada`, `decisao.revogada`, `decisao.promovida_para_adr`

## Configurações Futuras
- Gerar changelog automático a partir dos eventos.

## Casos de Uso
- Onboarding, retomada de projeto após pausa, revisão de escopo.

## Critérios de Aceite
- [ ] Data presente
- [ ] Decisão em uma frase
- [ ] Motivo em uma frase

---

## Índice de ADRs

| ADR | Título | Status |
|---|---|---|
| [ADR-001](../docs/08_DECISOES/adr-001-stack-e-arquitetura.md) | Stack e modelo de arquitetura | Aceito |
| [ADR-002](../docs/08_DECISOES/adr-002-runner-de-comandos.md) | Runner de comandos com whitelist e dry-run | Aceito |
| [ADR-003](../docs/08_DECISOES/adr-003-single-tenant-local.md) | Single-tenant local, multi-tenant no output | Aceito |
| [ADR-004](../docs/08_DECISOES/adr-004-motor-deterministico.md) | Motor determinístico com copiloto opcional | Aceito |
| [ADR-005](../docs/08_DECISOES/adr-005-studio-editor-proprio.md) | Studio, editor visual próprio | Aceito |
| [ADR-006](../docs/08_DECISOES/adr-006-cofre-de-segredos.md) | Cofre local de segredos | Aceito |
| [ADR-007](../docs/08_DECISOES/adr-007-presets-declarativos.md) | Presets declarativos versionados | Aceito |
| [ADR-008](../docs/08_DECISOES/adr-008-harness-e-painel-de-relatorios.md) | Harness como sistema de operação de build e painel de relatórios | Proposto |

## Decisões leves

### 2026-09-02, nome do produto
KORA FORGE, com slug `kora-forge`. Motivo: segue o padrão de nomeação das ventures da
Kora e "forja" descreve a função (matéria-prima entra, peça pronta sai). Nome é
provisório até a Fase 1 fechar.

### 2026-09-02, os menus da Fase 1
Três presets nascem: Criar Site, Criar Aplicação Web e Criar Aplicação Local. Criar
API/Serviço e Criar Automação ficam no backlog. Motivo: foram os três citados no
intake, e três cobrem os casos reais atuais sem inflar a Fase 1.

### 2026-09-02, o Forge não se auto-gera
A fundação do próprio Forge foi escrita à mão. Motivo: escrever a fundação manualmente
uma última vez é o que revela quais partes são realmente automatizáveis. Depois da
Fase 1, todo projeto novo nasce pelo Forge, incluindo evoluções dele mesmo.

### 2026-09-02, português na UI
Interface inteiramente em português, sem i18n na Fase 1. Motivo: usuário único.
Extrair strings para arquivo de mensagens mesmo assim, para não pagar refatoração
depois.

### 2026-09-02, dependências do bloco 1 além do tech-stack
`concurrently` (um só `npm run forge` sobe API e front, como o ADR-001 pede), `@fastify/static`
(servir `dist/` na própria origem quando existir build), `jsdom`, `@testing-library/dom` e
`@testing-library/jest-dom` (exigidos pela Testing Library que o tech-stack já lista). Motivo:
todas pequenas, sem binário nativo, cobertas pela restrição T-03.

### 2026-09-02, versão mínima do Node
Node 20.19 ou superior, porque o Vite 8 exige. Motivo: manter o Vite atual vale mais que
suportar 20.x antigo em uma ferramenta de uso pessoal. `INSTALACAO.md` atualizado.

### 2026-09-02, token de sessão por fragmento de URL
O token vai em `#token=`, não em query string. Motivo: fragmento não chega ao servidor, logo
não entra em log de acesso nem em histórico de proxy. Registrado em `docs/07` e `docs/11` (C2).

### 2026-09-02, harness como sistema de operação e painel de relatórios
Pedido do dono: o Forge adota o harness (planejar → despachar por modelo → build → review →
aprender) como sistema de operação de build, e ganha um painel de relatórios com tudo que está
construindo, o que falta por aplicativo, estimativa de término, plano e ciclo de aprendizado por
modelo, e barra de progresso. Motivo: vários projetos ao mesmo tempo sem observação central é o
mesmo pedágio de memória que o produto existe para eliminar. Registrado como **ADR-008, Proposto**,
porque ajusta a leitura de dois não-objetivos da identidade; vira Aceito com a palavra do dono.
Fase 6 no backlog. Nada disso adianta a Fase 1.

### 2026-09-02, blocos 2 e 3 construídos juntos
Registry e presets builtin saíram em uma spec só. Motivo: `projects.preset_id` é obrigatório e o
fluxo começa por escolher o menu; um Registry sem presets não cria projeto. O bloco 3 se resumia a
schema Zod mais carga dos JSONs que já existiam.

### 2026-09-02, slug imutável
O slug nasce na criação e não muda ao renomear. Motivo: depois de materializado ele é o nome da
pasta em disco, e renomear pasta é ação do usuário, fora do Forge (E-01).

### 2026-09-02, restaurar projeto arquivado
Restaurar devolve `materializado` quando há pasta em disco e `rascunho` quando não há. Um
projeto que estava `pronto_para_materializar` volta como rascunho e o motor de regras (bloco 5)
recalcula a prontidão. Motivo: não guardar um "status anterior" que o motor já sabe derivar.

### 2026-09-03, resposta do wizard valida forma, nunca completude
Todo campo de resposta tem default e é opcional no schema, porque o wizard salva enquanto a
pessoa preenche. Se um campo obrigatório está em branco, a etapa simplesmente não conta como
concluída. Motivo: bloquear avanço por campo vazio é trabalho do motor de regras (RN-04), e
misturar as duas coisas deixaria o schema decidindo regra de negócio.

### 2026-09-03, concluída e assumida são exclusivas
Uma etapa ou foi respondida ou aceitou o default. Estar nas duas listas é erro de contrato e
responde 400. Motivo: a revisão da etapa Fundação lista "assumidas" e "pendentes", e uma etapa
nos dois estados tornaria essa lista mentirosa.

### 2026-09-03, o wizard só versiona quando muda
Navegar não é editar. O front compara o payload resultante com o blueprint ativo e só chama a API
quando há diferença. Motivo: sem isso, ir e voltar na trilha encheria o histórico de versões
idênticas e tornaria o log inútil. Como `etapaAtual` faz parte do blueprint, trocar de etapa
versiona, e é isso que garante a retomada exata (RN-03.4).

### 2026-09-03, pergunta de sim ou não vira Selecao
`CampoBooleano` monta uma `Selecao` de Sim e Não em vez de uma caixa de marcar. Motivo: caixa de
marcar não mostra qual é o padrão, e o princípio nº 1 exige default visível com o selo de padrão
Kora em primeiro.

### 2026-09-03, regra ganha o campo `resolucao`
Regra cujo efeito o gerador aplica sozinho é `automatica` e nasce resolvida; regra que exige
decisão humana nasce aberta. Motivo: sem isso, `seg-rls-obrigatorio` e `doc-fundacao-obrigatoria`
bloqueariam a materialização para sempre, porque não existe nada que o usuário possa clicar para
resolvê-las. A alternativa seria rebaixar a severidade delas e mentir sobre o quanto importam.

### 2026-09-03, a condição da regra descreve o problema, não o assunto
O catálogo documentado dizia coisas como "quando usa Supabase". A condição implementada diz
"quando o problema existe", por exemplo "aplicação com modelo A e multi-tenant desligado". Motivo:
é isso que faz o hit se resolver sozinho quando o blueprint muda, que é o ciclo de vida que a
própria documentação descreve. A tabela do catálogo foi corrigida para dizer o que as regras
avaliam de verdade.

### 2026-09-03, um hit por regra por projeto
Índice único em `rule_hits(project_id, rule_id)`, com migration espelhando o schema documentado.
Motivo: o motor reavalia a cada mudança de blueprint, e sem unicidade o histórico viraria ruído
em vez de auditoria. Decisão humana (dispensado, ignorado) sobrevive à reavaliação.

### 2026-09-03, quatro templates adiados viram pendência declarada
O bloco 6 implementou cinco templates (`fundacao-kora`, `config-base`, `vite-react`,
`design-tokens`, `camada-de-servicos`), que é o escopo do `mvp.md`. Os presets também pedem
`supabase-schema`, `sqlite-schema`, `servidor-local-fastify` e `seo-base`, e algumas regras pedem
templates que ainda não existem. Em vez de falhar ou sumir em silêncio, o plano lista cada um em
`pendencias`, com o motivo. Motivo: o plano tem que dizer a verdade sobre o que sabe e o que não
sabe gerar; esconder a lacuna seria pior que adiá-la.

### 2026-09-03, ordenação por código de caractere, não por locale
`shared/ordenar.js`. Motivo: `localeCompare` depende dos dados de ICU do sistema, e o mesmo plano
poderia sair em ordem diferente em duas máquinas. O princípio nº 2 exige que o mesmo blueprint gere
sempre o mesmo resultado, e isso vale para a ordem também. O avaliador de regras foi migrado junto.

### 2026-09-03, o conteúdo do arquivo vai dentro do plano
O plano carrega o conteúdo já resolvido de cada arquivo, não só o caminho. Motivo: o **ADR-002** diz
que o executor recebe o plano aprovado e nunca a intenção original. Se o runner re-renderizasse os
templates, o que foi aprovado e o que é executado poderiam divergir. O custo é um payload maior,
aceitável em uma ferramenta local de um usuário só.
