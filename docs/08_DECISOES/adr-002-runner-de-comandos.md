# ADR-002, Runner de comandos com whitelist e dry-run

**Status**: Aceito
**Data**: 2026-09-02
**Decisores**: Matheus Bonato

---

## Contexto

O intake definiu que o Forge **cria a pasta do projeto e executa os comandos** (git,
instalação de dependências, dev server). Isso significa executar processo arbitrário na
máquina do dono, a partir de dados que vieram de um formulário e de um arquivo de preset.
É a parte mais perigosa do produto inteiro. Um erro aqui não gera bug, gera estrago.

## Decisão

O runner segue quatro regras inegociáveis:

1. **Planejar é separado de executar.** O gerador produz um plano (arquivos e comandos), a UI mostra, o usuário aprova, e só então o runner recebe o plano aprovado. Quem executa nunca vê a intenção original.
2. **Whitelist.** Só executa comando declarado no preset e presente no conjunto permitido pelo Forge. Preset não amplia a whitelist global.
3. **Sem shell.** `spawn(cmd, argsArray, { shell: false })`, com argumentos validados. Nunca `exec`, nunca interpolação de string.
4. **Confinamento.** `cwd` sempre dentro do workspace, caminho normalizado e verificado imediatamente antes de executar.

Somado a isso: detecção de ferramenta ausente antes de começar, timeout por comando,
processo de longa duração destacado e parável, log por WebSocket, e cada execução
registrada em `command_runs` com exit code.

## Alternativas Consideradas

### 1. Executar comando livre digitado pelo usuário
- **Prós**: flexibilidade total
- **Contras**: injeção de comando, sem auditoria, sem previsibilidade
- **Descartado porque**: transforma o Forge em um shell com interface bonita

### 2. Rodar tudo dentro de container Docker
- **Prós**: isolamento muito melhor, dano contido
- **Contras**: exige Docker instalado, quebra o uso das ferramentas do host, complica o mapeamento de volume no Windows
- **Descartado porque**: custo alto demais para a Fase 1. Reavaliar quando o Forge aceitar preset de terceiro

### 3. Não executar nada, só gerar arquivos e mostrar os comandos para copiar
- **Prós**: risco quase zero
- **Contras**: contraria diretamente a resposta do intake e o north star de não digitar comando
- **Descartado porque**: é justamente o pedágio que o produto existe para eliminar

## Consequências

### Positivas
- Dry-run sai de graça da separação entre planejar e executar
- O gerador vira testável sem tocar em disco
- Campo de formulário nunca consegue virar comando
- Log e exit code registrados dão auditoria completa do que rodou

### Negativas e trade-offs
- Comando novo exige entrar na whitelist, o que é atrito deliberado
- Sem shell, recursos como pipe e redirecionamento não existem. Se algo precisar disso, vira script versionado no template, não comando montado em runtime
- Falha no meio da execução deixa estado parcial. Optamos por não reverter automaticamente e mostrar exatamente onde parou, porque rollback automático de filesystem é mais perigoso que o próprio problema

## Notas de Implementação

- Whitelist inicial: `git`, `npm`, `npx`, `node`, `supabase`
- Argumento de campo do usuário passa por allowlist de caractere (`[a-zA-Z0-9._@/-]`)
- Ferramentas checadas antes: `node`, `git`, mais o que o preset declarar em `requisitos`
- Timeout default de 10 minutos, configurável por comando no preset
- Nenhum valor do cofre entra no ambiente do processo, exceto declaração explícita no preset com confirmação do usuário
