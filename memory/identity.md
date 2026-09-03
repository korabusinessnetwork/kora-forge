# Identidade do Produto, KORA FORGE

## Objetivo
Documentar o que o KORA FORGE é, para quem existe e o que ele nunca será, para que
qualquer decisão de produto, design ou escopo possa ser validada contra este arquivo.

## Contexto
- Mercado/vertical: ferramenta interna de desenvolvimento, uso pessoal.
- Estágio: fundação (Fase 0), sem código.
- Alternativas atuais: começar do zero a cada projeto, copiar pasta de projeto anterior, rodar a skill `fundacao-de-projeto` manualmente no Claude Code, usar Yeoman ou `create-*` genéricos.

## Regras Gerais
- Identidade é fonte de verdade para escopo. Feature que não serve ao propósito central é recusada, mesmo sendo boa.
- O Forge é uma bancada, não um framework. Ele não roda junto do projeto gerado e não vira dependência dele.
- Projeto gerado é independente: apagar o Forge não quebra nada que ele criou.

## Validações
- Toda feature nova responde: ela reduz o tempo entre a ideia e o projeto rodando?
- Toda feature nova responde: ela funciona com o copiloto desligado?

## Permissões
- Dono do produto: Matheus Bonato. Ajusta propósito, escopo e roadmap.
- Mudança de propósito central exige ADR.

## Exceções
- Produtizar o Forge para terceiros muda o público-alvo e exige revisão completa deste arquivo mais um ADR que supersede o ADR-003.

## Auditoria
- Revisar ao fim de cada fase do roadmap.

## Eventos
- `identity.definida`, `identity.revisada`, `posicionamento.atualizado`

## Configurações Futuras
- Medir o tempo real entre abrir o Forge e o dev server subir, para validar o aha moment com número.

## Casos de Uso
- Decidir se uma ideia entra ou sai do backlog.
- Revisar um preset novo antes de aceitá-lo.

## Critérios de Aceite
- [x] Propósito central claro
- [x] Persona documentada com dor real
- [x] Não-objetivos explícitos
- [x] Roadmap até a Fase 5

---

## Propósito Central

### Visão
Que criar um programa novo deixe de ser um ato de memória e vire um trilho. O método
da Kora (fundação documentada, ADRs, stack default, skills, presets, segurança como
definition of done) deixa de morar na cabeça do Matheus e passa a morar em software
que executa sozinho.

### Propósito
- Problema que resolve: todo projeto novo paga um pedágio de partida (relembrar a estrutura, repetir decisões já tomadas, recriar pastas, reescrever prompts, reconectar as mesmas APIs). Esse pedágio mata ideia boa e produz projetos inconsistentes entre si.
- Como resolvemos: presets declarativos que ligam etapas, stack, skills, comandos e critérios de pronto; um wizard que preenche um blueprint; um motor determinístico que valida; e um runner que materializa tudo em disco.

### Diferencial
1. Não é um gerador de boilerplate, é um gerador de **fundação governada**: sai com `memory/`, ADRs e plano de segurança preenchidos, não só com `src/`.
2. Determinístico. Reproduz. Não depende de LLM para funcionar.
3. Codifica um método específico e opinativo, o da Kora, em vez de tentar servir a todo mundo.
4. Tem um editor visual próprio acoplado ao design system do projeto que está sendo criado.

## Público-alvo

### Persona 1, Matheus (única persona da Fase 1)
Desenvolvedor e co-fundador, toca várias frentes ao mesmo tempo, tem o método bem
definido mas paga caro para reaplicá-lo. Perde tração quando o custo de partida é alto
e ideia nova compete com tarefa em andamento. Precisa que o começo seja barato e que
o sistema mostre progresso visível cedo.

### Persona 2, dev da Kora (Fase 4 ou depois)
Entra em um projeto e precisa entender o padrão sem treinamento. Consome o Forge para
gerar módulo novo dentro do padrão, não para inventar um caminho paralelo.

## Não-objetivos (o que o KORA FORGE nunca será)

- Não é IDE nem editor de código. Depois de materializar, o trabalho segue no VS Code e no Claude Code.
- Não é substituto do Claude Code. Ele prepara o terreno e os prompts, quem constrói feature é o Claude Code. Na Fase 6 ele orquestra e observa o Claude Code pelo harness, e continua sem construir feature por conta própria (ADR-008).
- Não é low-code nem no-code. Não gera aplicativo pronto por arrastar caixa. Gera fundação e esqueleto.
- Não é SaaS. Não tem conta, não tem nuvem, não tem cobrança.
- Não é clone do Figma. O Studio serve ao projeto que está nascendo, não é ferramenta de design geral.
- Não é agente autônomo. Nada é executado sem dry-run e confirmação humana. O harness só despacha plano aprovado pelo dono (ADR-008).

## Tom de voz (na UI)

Direto, de colega técnico, sem infantilizar e sem jargão desnecessário.

- ✅ "Vou criar 34 arquivos em `D:\dev\kora\meu-app`. Nada é sobrescrito. Revisa a lista antes."
- ❌ "Ops! Parece que algo deu errado. 😅 Tente novamente mais tarde!"
- ✅ "Você marcou pagamento. Isso exige Edge Function e um ADR de segurança. Já preparei os dois."
- ❌ "Configuração de pagamento detectada. Prosseguindo."

## Roadmap

| Fase | Entrega | Estado |
|---|---|---|
| 0 | Fundação documentada | ✅ concluída |
| 1 | Registry, preset Criar Aplicação Web, wizard, geração da fundação em disco, runner com dry-run | próxima |
| 2 | Studio (editor visual próprio) e exportação de tokens e layout | |
| 3 | API Hub, cofre de segredos, modelos de API | |
| 4 | Copiloto Claude opcional | |
| 5 | Presets restantes e editor de presets | |
| 6 | Harness como sistema de operação de build e painel de relatórios | proposta, ADR-008 |

Detalhamento em `docs/09_BACKLOG/mvp.md`.
