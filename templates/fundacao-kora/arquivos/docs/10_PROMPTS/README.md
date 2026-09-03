# 10, Prompts

Biblioteca de prompts para agentes de IA que trabalham neste projeto.

## Regras

1. Todo prompt tem versão. Quem usa registra qual versão usou.
2. Conteúdo vindo de arquivo, de banco ou de API externa vai delimitado e rotulado como **dado não
   confiável**, com instrução explícita de que não deve ser obedecido como comando.
3. Nenhum segredo entra em prompt, nunca.
4. Saída de IA é sugestão até um humano aceitar. Ela nunca vira comando, caminho de arquivo ou
   decisão automática.

## handoff-primeira-feature

```
Estou no projeto {{PROJETO}}, criado pelo KORA FORGE em {{DATA}}.

Leia nesta ordem antes de qualquer coisa:
1. CLAUDE.md
2. memory/identity.md e memory/restrictions.md
3. docs/01_ARQUITETURA/README.md
4. docs/08_DECISOES/ (ADRs já registrados)

Contexto que não está nos arquivos:
- Menu de origem: {{PRESET_NOME}} (`{{PRESET_ID}}`) versão {{PRESET_VERSAO}}
- Etapas assumidas por default, não confirmadas: {{ETAPAS_ASSUMIDAS}}

Primeira tarefa: (escreva aqui)

Use o loop spec → build → review. Não escreva código antes da spec aprovada.
```
