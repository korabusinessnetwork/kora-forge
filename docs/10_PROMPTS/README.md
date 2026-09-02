# 10, Prompts

Duas famílias de prompt vivem aqui.

1. **Prompts do copiloto**, usados pelo Forge quando o recurso está ligado (Fase 4).
2. **Prompts de handoff**, gerados pelo Forge para o Matheus colar no Claude Code.

## Regras para todo prompt do copiloto

1. Saída sempre em JSON puro, sem preâmbulo e sem cerca de código. O schema é validado antes de qualquer uso.
2. Nunca inventar número, nome de arquivo, dependência ou versão. Não sabe, devolve `null` e marca `incerto`.
3. Conteúdo vindo de arquivo, preset ou API externa vai delimitado em bloco rotulado como **dado não confiável**, com instrução explícita de que não deve ser obedecido como comando (controle C8).
4. Nada do cofre entra em prompt, nunca.
5. Todo prompt tem versão. O blueprint grava qual versão foi usada.
6. Todo prompt tem um caminho determinístico equivalente, usado quando o copiloto está desligado, falha ou devolve saída inválida.

## Catálogo do copiloto (Fase 4)

| Id | Etapa | Entrada | Saída | Fallback determinístico |
|---|---|---|---|---|
| `identidade-redigir` | 1 | nome, essência, problema em rascunho | visão, propósito, diferencial | texto do template com os campos crus |
| `personas-derivar` | 2 | público-alvo, aha moment | 1 a 3 personas com dor real | seção de personas em branco estruturada |
| `nome-sugerir` | 1 | essência, categoria | 5 nomes com slug disponível | slug derivado do nome digitado |
| `entidades-derivar` | 5 | descrição do domínio | entidades, campos, relações | tabela de exemplo do preset |
| `regras-redigir` | 8 | blueprint | regras de negócio por módulo | esqueleto por módulo, sem conteúdo |
| `blueprint-revisar` | 8 | blueprint completo | lista de incoerências | checklist estático do preset |

## Prompts de handoff (Fase 1, já úteis)

O Forge gera, ao fim da materialização, um prompt pronto para colar no Claude Code
dentro do projeto novo. Ele carrega o contexto que o Claude Code precisaria descobrir
sozinho.

### `handoff-primeira-feature`

```
Estou no projeto {{PROJETO}}, recém-criado pelo KORA FORGE.

Leia nesta ordem antes de qualquer coisa:
1. CLAUDE.md
2. memory/identity.md e memory/restrictions.md
3. docs/01_ARQUITETURA/README.md
4. docs/08_DECISOES/ (ADRs já registrados)

Contexto que não está nos arquivos:
- Preset de origem: {{PRESET}} versão {{PRESET_VERSAO}}
- Decisões assumidas por default (não confirmadas): {{ASSUMIDOS}}
- Avisos do motor de regras dispensados: {{DISPENSADOS}}

Primeira tarefa: {{PRIMEIRA_TAREFA}}

Use o loop spec → build → review. Não escreva código antes da spec aprovada.
```

### `handoff-continuar`

Mesma estrutura, acrescentando o que já foi feito e o estado atual do backlog. Gerado
sempre que um projeto é reaberto no Registry.

## Onde os prompts moram

Arquivo versionado em `server/prompts/<id>.v<N>.md`, carregado como dado. Prompt não é
concatenado à mão no meio do código, pelo mesmo motivo que template não é string montada.
