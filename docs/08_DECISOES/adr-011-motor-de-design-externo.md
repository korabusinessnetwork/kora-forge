# ADR-011, Motor de design externo opcional, o caso do Open Design

**Status**: Proposto
**Data**: 2026-09-09
**Decisores**: Matheus Bonato
**Supersede**: nenhum. Convive com o **ADR-005**, que decidiu o Studio próprio, e é limitado por
ele: este ADR não abre exceção nenhuma naquela decisão.

---

## Contexto

O Open Design (`nexu-io/open-design`, Apache-2.0) é um app local-first que gera artefatos visuais,
protótipos, landing pages, dashboards, slides, imagens e vídeo, e exporta HTML, PDF, PPTX, MP4, ZIP
e Markdown. Ele expõe uma CLI `od`, um servidor MCP e um daemon HTTP local em `127.0.0.1:7456`.

A pergunta é se o Forge deve acionar esse motor para entregar, junto com o projeto materializado,
uma peça visual pronta, e com que grau de compromisso.

Três coisas do Forge cercam a pergunta antes de qualquer avaliação técnica:

1. **ADR-004 e Princípio nº 2**: o motor do Forge é determinístico e nenhum comportamento essencial
   depende de LLM.
2. **ADR-005**: o editor visual do Forge é próprio, e `memory/restrictions.md` **E-02** diz que o
   Studio desenha o que o design system do projeto suporta, e só.
3. **T-01**: o Forge roda offline. Internet só para instalar dependência do projeto gerado e para o
   copiloto.

### O achado que muda o enquadramento

O Open Design **não é um renderizador**. O próprio projeto se descreve como "your coding agent
becomes the design engine": a geração exige um coding agent CLI (Claude Code, Codex, Cursor,
DeepSeek Harness e mais de vinte outros) ou um endpoint compatível com OpenAI via BYOK. O daemon
resolve a configuração do projeto, **spawna o runtime do agente** com o workspace como diretório de
trabalho e transmite eventos por SSE.

Ou seja: o Open Design é um **orquestrador de LLM com exportador**, não um motor determinístico.
Isso não o desqualifica, mas define para sempre o lugar dele no Forge. Ele nunca pode ficar no
caminho crítico de nada, porque a mesma entrada não produz a mesma saída.

O que ele tem de genuinamente valioso para o Forge é o outro lado: **o exportador**. HTML com
assets inlined, PDF por print headless e MP4 por Chrome headless mais FFmpeg são um trabalho chato,
pesado e resolvido, que o Forge não tem interesse nenhum em construir.

## Superfície de acionamento, e qual delas é estável

| Via | O que dá | Estabilidade |
|---|---|---|
| **CLI `od`** | `od mcp install <agente>`, `od plugin {list,search,info,install,apply,upgrade,uninstall}`, `od project list`, `od files {list,read}`, `od skills list`, `od lint` | Baixa. Comandos entram e saem entre minors |
| **Servidor MCP** (stdio) | Leitura: `list_projects`, `get_active_context`, `get_artifact`, `get_file`, `extract_refs`, `resolve_project`. Escrita: `write_file`, `delete_file`, `delete_project`, `start_run` | Média. É **proxy sem estado** para o daemon, então herda a instabilidade do HTTP |
| **Daemon HTTP** `127.0.0.1:7456` | `POST /api/runs` dispara a geração, `/api/chat` por SSE, `/api/artifacts/{save,lint}`, `/api/projects/:id/files/*`, `/api/skills`, `/api/design-templates`, `/api/design-systems`, `/api/proxy/{anthropic,openai,azure,google,ollama,...}/stream` | Média-baixa, mas é a **fonte real**. MCP e CLI falam com ele |

A conclusão prática: **existe caminho headless**. `start_run` no MCP é um proxy de `POST /api/runs`,
e `get_artifact` empacota o arquivo de entrada com as dependências. Dá para encadear descoberta,
geração e retirada do artefato sem abrir a interface. Tecnicamente viável, portanto.

### O que muda entre versões 0.x

Aqui está o problema, e ele é documental, não de opinião.

- O ritmo é semanal. A série foi de 0.19.0 a **0.22.1** em cerca de três semanas.
- **A 0.19.2 introduziu um runtime estruturado de design system com CLI e API próprias. A 0.20.0
  reverteu tudo**, superfícies inclusive, voltando ao comportamento anterior de manifesto e prompt.
  Isso é prova de que a superfície pública muda e volta atrás dentro da mesma minor.
- Nenhuma release declara garantia de estabilidade de CLI, MCP ou HTTP.
- A **0.21.1** se chama "Community First: No Login Required", o que implica que login **era** exigido
  antes. A **0.20.1** apresenta um plano pago com acesso a modelos. Existe um produto comercial ao
  lado do open source, e a fronteira entre os dois já se moveu uma vez.
- A documentação está atrás do código. O `docs/spec.md` declara sobre si mesmo que **antecede** os
  runtimes implementados e manda consultar o README. O `docs/install-guide.md` cobre Linux, macOS e
  Docker, e **não documenta Windows nem a instalação da CLI `od`**. O `docs/architecture.md` diz
  explicitamente que não dá caminho de dados concreto e delega para o `AGENTS.md`. A versão corrente
  aparece de formas diferentes conforme a fonte lida.

Em uma frase: a coisa funciona e é interessante, mas **não há contrato**. Amarrar o Forge nela hoje
é amarrar em algo que muda toda semana e cuja documentação não descreve o próprio Windows.

## Decisão

**Opção (b), adapter opcional.** O Open Design entra no Forge como implementação de uma interface
`MotorDeDesign`, atrás de uma configuração que **nasce desligada**, e **nunca** como editor.

Cinco condições, todas inegociáveis:

1. **Nada do Forge depende disso.** Todo preset materializa, roda o `definition_of_done` e fecha o
   fluxo de ponta a ponta com o adapter desligado. Existe um `MotorDeDesignNenhum` e ele é o padrão.
2. **O handoff é determinístico, a saída não.** O Forge gera `design/DESIGN.md` e
   `design/design.tokens.json` a partir do `design_documents`, por template versionado, com ou sem
   motor externo. Esse handoff é entrega do Forge. O que o Open Design devolve é **referência
   visual**, cai em `design/gerado/` e nunca é entrada de build.
3. **O Studio continua próprio.** ADR-005 e E-02 valem inteiros. O Open Design gera e exporta,
   jamais edita, e nada volta dele para dentro do documento de design do Forge.
4. **Fica na Fase 4 ou depois, e a implementação está bloqueada** até um spike executado de verdade
   provar viabilidade no Windows. O spike desta rodada é documental, então **ainda não prova nada**.
5. **É um segundo processo privilegiado.** Só entra com restrições de segurança próprias escritas em
   `memory/restrictions.md` antes da primeira linha de código.

### Por que não as outras duas

**(a) Não integrar.** Defensável, e foi a segunda colocada. Mas joga fora um exportador de HTML, PDF
e MP4 que já está pronto, e o custo de manter a porta fechada é uma interface de quatro métodos.
Descartada porque o custo de deixar a opção viva é baixo demais para justificar fechá-la.

**(c) Dependência de primeira classe.** Descartada, e não por preferência. Ela colide de frente com
quatro coisas já decididas: o Princípio nº 2, porque a geração é agente de LLM e não é
determinística; T-01, porque exigiria rede no fluxo principal; C-01 e C-02, porque cada geração
queima token BYOK; e E-04, porque o projeto gerado passaria a carregar artefato que só o Forge sabe
refazer. Some a isso uma superfície 0.x que já reverteu API dentro de uma minor. Não é uma escolha em
aberto.

## Consequências

### Positivas

- O Forge ganha exportação para HTML, PDF e MP4 sem escrever nem manter esse código.
- O `DESIGN.md` vira um contrato de handoff útil por si só, mesmo com o motor desligado. Ele é o que
  o Claude Code lê depois, dentro do projeto gerado, e resolve um problema que já existe.
- A interface `MotorDeDesign` deixa a porta aberta para outros motores, ou para um do próprio Forge,
  sem nova decisão de arquitetura.

### Negativas e mitigações

- **Um segundo daemon privilegiado na máquina.** Express, SQLite, com proxy para provedores externos
  de LLM e chave de API dentro. Nada disso é coberto por S-01 a S-08. Mitigação: restrições próprias
  antes do código, incluindo proibir `OD_BIND_HOST` diferente de `127.0.0.1` e nunca reaproveitar o
  cofre do Forge para alimentar o Open Design.
- **Saída não reprodutível dentro de um produto que promete reprodutibilidade.** Mitigação: a saída
  vive isolada em `design/gerado/`, sempre com `MANIFESTO.json` de proveniência, e é declarada
  referência, não fonte.
- **Custo de token por geração.** Mitigação: o mesmo teto e o mesmo livro-caixa do copiloto, C-02.
- **Superfície 0.x instável.** Mitigação: faixa de versão suportada, verificada em toda chamada, e
  recusa explícita fora da faixa em vez de tentar e quebrar.
- **Node ~24 e pnpm 10.33.x para rodar da fonte**, contra o Node 20 do Forge, mais Chrome headless e
  FFmpeg para MP4. Mitigação: só o app empacotado de Windows ou o Docker, nunca build da fonte dentro
  do fluxo do Forge.

## Plano de reversão

Desenhado para ser barato, e essa é metade da justificativa da decisão.

1. **Desligar**: uma chave em Configurações. O `MotorDeDesignNenhum` assume, e todo preset segue
   idêntico. Reversão em um clique, sem migration e sem tocar em projeto já gerado.
2. **Remover**: apagar o adapter, um arquivo de serviço, e a chave de settings. A interface
   `MotorDeDesign` e o `DESIGN.md` **ficam**, porque são do Forge e não do Open Design.
3. **O que sobra no disco do usuário**: `design/gerado/` dos projetos antigos, que é conteúdo estático
   dele. O Forge não apaga nada, coerente com S-08.
4. **Gatilhos de reversão automática**, escritos agora para não virar discussão depois: o projeto
   passar a exigir conta ou login para gerar localmente, a licença mudar, ou duas quebras de contrato
   em minors consecutivas.

## Referências

- [nexu-io/open-design](https://github.com/nexu-io/open-design), README e releases, consultados em 2026-09-09
- [Releases](https://github.com/nexu-io/open-design/releases), evidência do rollback de superfície da 0.20.0
- [MCP Server & External Integration](https://deepwiki.com/nexu-io/open-design/12.5-mcp-server-and-external-integration)
- **ADR-004**, motor determinístico com copiloto opcional, é o limite de cima deste ADR
- **ADR-005**, Studio, editor visual próprio, é o limite lateral
- **ADR-010**, capacidades próprias do Forge, define o que é capacidade do Forge e não de preset
- `specs/adr-motor-de-design-externo.md`, contrato `MotorDeDesign`, mapa por preset e riscos
- `spikes/open-design/SPIKE.md`, roteiro de validação, **ainda não executado**
- `memory/restrictions.md`, T-01, T-03, C-01, C-02, E-02, E-04 e S-01 a S-08

## Notas de implementação

- A interface vive em `server/services/motor-de-design/`, com `nenhum.js` e, se aprovado,
  `open-design.js`. Componente nunca fala com o motor, só a camada de serviços.
- Códigos de erro novos entram em `shared/erros.js` com prefixo `FORGE_DESIGN_`.
- Nenhuma alteração de schema. A configuração é uma chave em `settings`.
- Artefato lido de `design/gerado/` que chegue ao copiloto é **dado, nunca instrução**, S-07.
