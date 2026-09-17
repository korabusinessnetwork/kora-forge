# ADR-011, Motor de design externo, o caso do Open Design

**Status**: Aceito
**Data**: 2026-09-10
**Decisores**: Matheus Bonato
**Supersede**: nenhum. Convive com o **ADR-005**, que decidiu o Studio próprio, e com o **ADR-009**,
que decidiu como o design é serializado.

---

## Contexto

O Open Design (`nexu-io/open-design`, Apache-2.0) é um app local-first que gera artefatos visuais,
protótipos, landing pages, dashboards, slides, imagens e vídeo, e exporta HTML, PDF, PPTX, MP4, ZIP
e Markdown. Ele expõe uma CLI `od`, um servidor MCP e um daemon HTTP local em `127.0.0.1:7456`.

A pergunta era se o Forge deveria acionar esse motor para entregar, junto com o projeto
materializado, uma peça visual pronta, e com que grau de compromisso.

Três coisas do Forge cercavam a pergunta antes de qualquer avaliação técnica:

1. **ADR-004 e Princípio nº 2**: o motor do Forge é determinístico e nenhum comportamento essencial
   depende de LLM.
2. **ADR-005**: o editor visual do Forge é próprio, e `memory/restrictions.md` **E-02** diz que o
   Studio desenha o que o design system do projeto suporta, e só.
3. **T-01**: o Forge roda offline. Internet só para instalar dependência do projeto gerado e para o
   copiloto.

### O achado que definiu o enquadramento

O Open Design **não é um renderizador**. O próprio projeto se descreve como "your coding agent
becomes the design engine": a geração exige um coding agent CLI (Claude Code, Codex, Cursor,
DeepSeek Harness e mais de vinte outros) ou um endpoint compatível com OpenAI via BYOK. O daemon
resolve a configuração do projeto, **spawna o runtime do agente** com o workspace como diretório de
trabalho e transmite eventos por SSE.

Ou seja: é um **orquestrador de LLM com exportador**, não um motor determinístico. A mesma entrada
não produz a mesma saída.

O que ele tem de genuinamente valioso é o outro lado: **o exportador**. HTML com assets inlined, PDF
por print headless e MP4 por Chrome headless mais FFmpeg são um trabalho chato, pesado e resolvido.
Foi esse lado que manteve a avaliação de pé até o fim.

## Superfície de acionamento, e qual delas seria estável

| Via | O que dá | Estabilidade |
|---|---|---|
| **CLI `od`** | `od mcp install <agente>`, `od plugin {list,search,info,install,apply,upgrade,uninstall}`, `od project list`, `od files {list,read}`, `od skills list`, `od lint` | Baixa. Comandos entram e saem entre minors |
| **Servidor MCP** (stdio) | Leitura: `list_projects`, `get_active_context`, `get_artifact`, `get_file`, `extract_refs`, `resolve_project`. Escrita: `write_file`, `delete_file`, `delete_project`, `start_run` | Média. É **proxy sem estado** para o daemon, então herda a instabilidade do HTTP |
| **Daemon HTTP** `127.0.0.1:7456` | `POST /api/runs` dispara a geração, `/api/chat` por SSE, `/api/artifacts/{save,lint}`, `/api/projects/:id/files/*`, `/api/skills`, `/api/design-templates`, `/api/design-systems`, `/api/proxy/{anthropic,openai,azure,google,ollama,...}/stream` | Média-baixa, mas é a **fonte real**. MCP e CLI falam com ele |

Existe caminho headless: `start_run` no MCP é proxy de `POST /api/runs`, e `get_artifact` empacota o
arquivo de entrada com as dependências. Tecnicamente, integrar era viável.

### O que muda entre versões 0.x

Aqui estava o problema, e é documental, não de opinião.

- O ritmo é semanal. A série foi de 0.19.0 a **0.22.1** em cerca de três semanas.
- **A 0.19.2 introduziu um runtime estruturado de design system com CLI e API próprias. A 0.20.0
  reverteu tudo**, superfícies inclusive, voltando ao comportamento anterior de manifesto e prompt.
  É prova de que a superfície pública muda e volta atrás dentro da mesma minor.
- Nenhuma release declara garantia de estabilidade de CLI, MCP ou HTTP.
- A **0.21.1** se chama "Community First: No Login Required", o que implica que login **era** exigido
  antes. A **0.20.1** apresenta um plano pago com acesso a modelos. Existe um produto comercial ao
  lado do open source, e a fronteira entre os dois já se moveu uma vez.
- A documentação está atrás do código. O `docs/spec.md` declara sobre si mesmo que **antecede** os
  runtimes implementados. O `docs/install-guide.md` cobre Linux, macOS e Docker, e **não documenta
  Windows nem a instalação da CLI `od`**, sendo o Windows o ambiente primário do Forge (T-02). O
  `docs/architecture.md` diz explicitamente que não dá caminho de dados concreto.

## Decisão

**Opção (a): não integrar.** O Forge não aciona o Open Design, não ganha interface `MotorDeDesign`,
não ganha adapter e não ganha configuração para isso. O assunto está fechado.

O Studio próprio (ADR-005) continua sendo o único caminho de design do Forge, e o documento de
design (ADR-009) continua sendo a única serialização.

### Por que não a (b), adapter opcional

A avaliação inicial recomendava esta, com o argumento de que o custo de manter a porta aberta era
baixo: uma interface de quatro métodos. **O dono decidiu contra, e a decisão dele é a que vale.**

Registrando o mérito do contra-argumento, porque é o que importa daqui a três meses: "opcional" não
é grátis. Um adapter atrás de configuração ainda é código para manter, testar, documentar e
explicar, ainda é um segundo daemon privilegiado a auditar, e ainda é uma superfície 0.x que muda
toda semana batendo na porta do Forge. Some a isso que o Forge está na Fase 2 com o Studio em
construção, e a conta fica clara: a porta aberta cobra atenção justamente onde a atenção é escassa.

### Por que não a (c), dependência de primeira classe

Nunca esteve em aberto. Colide de frente com quatro coisas já decididas: o Princípio nº 2, porque a
geração é agente de LLM e não é determinística; T-01, porque exigiria rede no fluxo principal; C-01
e C-02, porque cada geração queima token BYOK; e E-04, porque o projeto gerado passaria a carregar
artefato que só o Forge sabe refazer.

## Consequências

### Positivas

- **Nada a construir, nada a manter.** Nenhuma interface, nenhum adapter, nenhuma chave de
  configuração, nenhum código de integração, nenhum teste de integração.
- **Nenhum segundo processo privilegiado** na máquina do dono. O risco que a avaliação classificou
  como o mais alto, um daemon Express com SQLite e proxy para provedores externos de LLM guardando
  chave de API, simplesmente não existe.
- **Nenhuma superfície 0.x** entra no caminho do Forge.
- O determinismo do produto continua inteiro, sem exceção nem asterisco.

### Negativas, e são reais

- **O Forge não exporta HTML, PDF nem MP4**, e não vai ganhar isso de graça. Se um dia essa
  necessidade aparecer de verdade, será trabalho próprio ou uma nova avaliação.
- **O handoff `DESIGN.md` não foi adotado.** Ele existia para alimentar o motor externo, e sem motor
  perde o consumidor imediato. A ideia de o projeto gerado sair com um contrato de design legível
  pelo Claude Code continua boa e continua possível, mas **não entra por este ADR**: se voltar, volta
  pelo próprio mérito, com spec própria.

## O que faria reabrir o assunto

Escrito agora para não virar discussão de memória depois. Nenhum destes é motivo isolado suficiente;
os três juntos seriam:

1. O Open Design declarar estabilidade de superfície e chegar a 1.0.
2. Aparecer necessidade real e recorrente de exportar apresentação ou vídeo a partir do Forge, e não
   apenas a percepção de que seria bonito ter.
3. Existir caminho de geração **determinístico**, sem agente de LLM no meio, o que hoje não existe e
   é contrário à proposta do projeto.

## Referências

- [nexu-io/open-design](https://github.com/nexu-io/open-design), README e releases, consultados em 2026-09-09
- [Releases](https://github.com/nexu-io/open-design/releases), evidência do rollback de superfície da 0.20.0
- [MCP Server & External Integration](https://deepwiki.com/nexu-io/open-design/12.5-mcp-server-and-external-integration)
- **ADR-004**, motor determinístico com copiloto opcional, é o limite de cima deste ADR
- **ADR-005**, Studio, editor visual próprio, é o limite lateral
- **ADR-009**, serialização do documento de design, é o que de fato resolve design no Forge
- `memory/restrictions.md`, T-01, T-02, T-03, C-01, C-02, E-02 e E-04

> **Sobre o material de apoio.** Enquanto a decisão esteve em aberto existiram um desenho de contrato
> (`specs/adr-motor-de-design-externo.md`) e um roteiro de spike (`spikes/open-design/`). Com a
> decisão de não integrar, os dois foram removidos: eram plano de execução para trabalho que não vai
> acontecer, e deixá-los no repositório convidaria alguém a segui-los. O histórico do git guarda os
> dois, e este ADR guarda o que interessa, que é a avaliação e o porquê.
