# ADR-014, Auto-Reforja, o Forge aplicando o harness em si mesmo

**Status**: Proposto
**Data**: 2026-09-14
**Decisores**: Matheus Bonato
**Supersede**: nenhum. Aplica o ADR-008 ao próprio Forge e usa o contrato de modelos da D08

---

## Contexto

Pedido do dono em 2026-09-14, com prioridade: "uma page onde a gente vai fazer auto-reforge no
próprio aplicativo, um lugar onde vamos melhorar a nossa própria forja".

O ADR-008 diz que o Forge adota o harness (spec, build, review, aprender) para si e para todo
projeto que gera, e que na Fase 6 o harness vira software. Até agora, as melhorias do próprio
Forge vivem espalhadas: `memory/bugs.md`, `docs/09_BACKLOG/`, auditorias de spec e marcadores no
código. O dono precisa lembrar onde procurar, e isso é o pedágio de memória que o princípio nº 1
proíbe.

Restrições:

- Princípio nº 2: nada essencial pode depender de LLM. Diagnóstico, backlog e geração de spec
  precisam funcionar com o modelo desligado.
- O Forge escreve em disco. A spec gerada vai para `specs/` do próprio repositório, e isso é
  escrita privilegiada (C4 e C9 do plano de segurança).
- A onda paralela da D08 fixa dono exclusivo por arquivo. Esta frente não toca `server/app.js`,
  `src/mensagens.js`, migrations nem o registro de códigos de erro.
- A tabela `reforge_items` já existe (migração `20260914_reforja.sql`).

## Decisão

A página `/reforja` junta três partes, em ordem de dependência.

1. **Diagnóstico determinístico, só leitura.** Um varredor lê o repositório do Forge (raiz
   resolvida pelo próprio módulo, injetável para teste) e uma função pura calcula sinais com id
   estável, severidade, evidência e sugestão. Mesma árvore, mesmo resultado.
2. **Backlog com o ciclo do harness.** Cada melhoria é um item em `reforge_items` que anda por uma
   máquina de estados pura: `proposta → especificada → em_construcao → em_revisao → concluida`,
   com volta de um passo, descarte a partir de qualquer estado aberto e restauração do descarte.
   Item nunca é apagado.
3. **Spec por template versionado, com prévia.** O item vira `specs/reforja-<slug>.md` pelo
   template `templates-reforja/spec/`, renderizado com `renderizar()`. Prévia primeiro, gravação só
   depois de confirmar, nunca sobrescreve sem confirmação explícita.
4. **Sugestão por modelo gratuito, como enfeite.** Quando o serviço de modelos (T08) está ligado e
   conectado, o dono pode pedir sugestões. O modelo recebe só títulos e contagens dos sinais, a
   resposta é dado validado e limitado, e cada proposta só entra no backlog pelo clique do dono.

### Sinais e limites

| Id | Severidade | O que mede |
|---|---|---|
| `specs-com-criterio-pendente` | alta | auditoria com critério que não está em sim |
| `console-log-em-produto` | media | `console.log` fora de comentário em código de produto |
| `marcadores-pendentes` | media | TODO, FIXME ou XXX abrindo comentário em código de produto |
| `specs-sem-auditoria` | media | spec sem seção Auditoria, Review ou Revisão |
| `arquivos-grandes` | baixa | código de produto com mais de 400 linhas |
| `backlog-nao-entregue` | baixa | bloco do backlog que não está entregue |
| `sem-teste-colocalizado` | baixa | `.js` de `server/` ou `shared/` sem teste na mesma pasta |

- **Código de produto**: `.js` e `.jsx` de `src/`, `server/` e `shared/`, fora de `*.test.*`,
  `testes/` e `fixtures/`.
- **`LIMITE_LINHAS = 400`**: acima disso o arquivo costuma misturar responsabilidades. É sinal de
  severidade baixa, não bloqueio.
- **`LIMITE_BYTES_ARQUIVO = 1 MiB`**: arquivo maior não é lido; aparece só como arquivo grande.
- **`LIMITE_ARQUIVOS = 5000`**: teto de segurança da varredura.
- **Pastas ignoradas em qualquer nível**: `node_modules`, `dist`, `.git`, `.claude`, `worktrees`,
  `coverage`. Symlink de pasta nunca é seguido; symlink de arquivo com destino fora da raiz é
  ignorado.
- **Evidência**: até 20 arquivos por sinal, e o total que ficou de fora é dito.

"Texto de UI fora de `mensagens`" ficou fora: sem parser de JSX a detecção erra, e sinal que acusa
errado ensina o dono a ignorar o painel.

### Controles da escrita

- Caminho montado só a partir do slug, resolvido com `resolverNoWorkspace` contra a raiz do Forge;
  a pasta `specs` passa por `inspecionar`, que recusa symlink para fora.
- Gravação com flag `wx` quando não há confirmação de sobrescrita, para o arquivo criado entre a
  prévia e a gravação também virar `FORGE_CONFLICT`.
- Conteúdo determinístico: a data da spec é a de criação do item, e não a do relógio. Prévia e
  gravação produzem o mesmo texto.

### Controles da sugestão (C8)

- O prompt é template versionado em `templates-reforja/sugestao/`, com o resumo delimitado e
  rotulado como dado.
- Nenhum conteúdo nem caminho de arquivo sai da máquina, só título, severidade e contagens.
- Resposta com no máximo 20 mil caracteres considerados, até 5 propostas, título até 120,
  descrição até 600, caracteres de controle removidos, campos extras ignorados.
- A resposta nunca é logada nem vai para evento. O evento guarda só modelo e contagens.
- O servidor não grava proposta. Aceitar é um `POST` comum de criação, com origem `modelo`.

### Códigos de erro

Os códigos `FORGE_MODELOS_DESLIGADO` e `FORGE_MODELOS_INDISPONIVEL` são da frente de modelos
(T08). Enquanto não estiverem em `shared/erros.js`, a Auto-Reforja responde com
`FORGE_COPILOT_DISABLED` e `FORGE_TOOL_MISSING`, com mensagem própria e o código pretendido no
detalhe. Quando o registro chegar, o serviço passa a usar o código pretendido sem mudar de código.

## Alternativas Consideradas

### 1. Diagnóstico redigido pelo modelo
- **Prós**: sinais mais ricos, em linguagem natural
- **Contras**: resultado muda a cada chamada, custa e some quando o gateway cai
- **Descartado porque**: fere o princípio nº 2; o modelo fica só na sugestão opcional

### 2. Backlog em arquivo Markdown em vez de tabela
- **Prós**: legível no editor, versionado junto do código
- **Contras**: estado e prioridade viram texto parseado, e transição inválida não tem onde ser barrada
- **Descartado porque**: a tabela já existe e a máquina de estados precisa de fonte única

### 3. Spec montada por string no serviço
- **Prós**: menos arquivos
- **Contras**: fere "toda geração passa por template versionado"
- **Descartado porque**: é regra da constituição

### 4. Template da spec dentro de `templates/`
- **Prós**: uma pasta só de templates
- **Contras**: o carregador do gerador varre `templates/` e trataria o template como template de projeto
- **Descartado porque**: misturaria o que o Forge gera para projetos com o que gera para si

## Consequências

### Positivas
- As pendências do Forge aparecem num lugar, sem o dono lembrar onde procurar
- O ciclo spec, build, review ganha registro para o próprio Forge, antecipando o que a Fase 6 fará
  para todo projeto
- Spec nova de melhoria nasce na estrutura do `/spec`, e o `/build` pode partir dela direto

### Negativas e trade-offs
- Os sinais são heurísticos. Tabela de auditoria sem coluna de aprovação não é lida, e uma spec
  assim não aparece como pendente
- `sem-teste-colocalizado` acusa arquivo coberto por teste de outra pasta, como rotas testadas por
  teste de integração. Por isso é severidade baixa
- A página escreve em `specs/` do repositório do Forge. Rodando de uma instalação empacotada, sem
  repositório, a escrita cai na pasta do pacote; vale revisitar quando houver empacotamento
- Dois códigos de erro provisórios até o registro da T08 chegar

## Notas de Implementação

- Funções puras em `shared/reforja/` (`estados`, `sinais`, `propostas`, `spec`, `resumo`)
- Leitura de disco em `server/modules/reforja/varredura.js` e `templates.js`
- Serviço `criarServicoReforja({ db, registrarEvento, modelos, raizForge })` e rotas com prefixo
  `/reforja`, todas com `schemaSaida`
- Contratos em `shared/schemas/reforja.js`
- Fluxo F-11 em `docs/05_FLUXOS/f-11-auto-reforja.md`
- Spec e auditoria em `specs/auto-reforja.md`

## Referências

- `CLAUDE.md`, princípios nº 1 e nº 2, processo de trabalho e segurança
- ADR-004 (motor determinístico e copiloto), ADR-008 (harness)
- `docs/11_SEGURANCA/README.md`, C4, C7, C8 e C9
- `.full-auto/DECISOES.md`, D06 e D08
