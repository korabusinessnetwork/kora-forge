# 01, Arquitetura

## Modelo escolhido

Desvio consciente do Modelo A (SPA + BaaS) do padrão Kora, porque o produto precisa
escrever em disco e executar processos, coisas que um BaaS não faz. Adotamos um
**Modelo B enxuto**: SPA React falando com uma API local em Node, que é a única camada
com acesso a filesystem, processos e segredos. Ver **ADR-001**.

```
┌─────────────────────────────────────────────────────────────┐
│  BROWSER  http://127.0.0.1:5173                             │
│                                                             │
│  React 18 + Vite + React Router                             │
│  ┌──────────┬──────────┬──────────┬──────────┬───────────┐  │
│  │ Registry │  Wizard  │  Studio  │ API Hub  │ Config    │  │
│  └──────────┴──────────┴──────────┴──────────┴───────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ CAMADA DE SERVIÇOS  src/services/                     │  │
│  │ único ponto que fala com a API local                  │  │
│  └───────────────────────────────────────────────────────┘  │
└───────────────┬──────────────────────────┬──────────────────┘
                │ HTTP  X-Forge-Token      │ WebSocket (log ao vivo)
┌───────────────▼──────────────────────────▼──────────────────┐
│  API LOCAL  Fastify, bind 127.0.0.1:7337                    │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Guarda: token de sessão, Origin, Zod em toda entrada  │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌──────────┬──────────┬──────────┬──────────┬───────────┐  │
│  │ Motor de │ Gerador  │  Runner  │  Cofre   │ Copiloto  │  │
│  │  regras  │ (templates)│(spawn) │ (AES-GCM)│ (opcional)│  │
│  └──────────┴──────────┴──────────┴──────────┴───────────┘  │
└──────┬─────────────┬──────────────┬──────────────┬──────────┘
       │             │              │              │
  ┌────▼────┐  ┌─────▼──────┐  ┌────▼─────┐  ┌─────▼──────┐
  │ SQLite  │  │ workspace  │  │ processos│  │ API        │
  │forge.db │  │  no disco  │  │  do SO   │  │ Anthropic  │
  └─────────┘  └────────────┘  └──────────┘  └────────────┘
   projetos,    projeto sendo    npm, git,     só se ligado
   blueprints,  materializado    supabase      pelo usuário
   eventos
```

## Os nove módulos

| Módulo | Responsabilidade | Nunca faz |
|---|---|---|
| **Registry** | Lista, abre e arquiva projetos. Guarda o histórico de blueprints | Não edita conteúdo de projeto |
| **Presets** | Carrega, valida e versiona os menus. Um preset define etapas, stack, árvore, skills, comandos e definition of done | Não contém lógica em código |
| **Wizard** | Conduz as etapas e preenche o blueprint. Cada etapa é pulável e tem default | Não escreve em disco |
| **Motor de regras** | Lê o blueprint, dispara validações, avisos e exigências (ADR obrigatório, RLS, cofre) | Não chama LLM, nunca |
| **Gerador** | Transforma blueprint mais templates versionados em um **plano de arquivos** | Não escreve, só planeja |
| **Runner** | Aplica o plano aprovado no disco e executa comandos da whitelist | Não executa sem dry-run aprovado |
| **Studio** | Editor visual do design system do projeto. Exporta tokens e layout para o blueprint | Não desenha fora do design system |
| **API Hub e Cofre** | Catálogo de modelos de integração e armazenamento criptografado de chaves | Nunca devolve segredo ao front |
| **Copiloto** | Enriquece texto quando ligado, com saída validada por schema | Nunca decide, nunca executa |

## Separação que sustenta tudo: planejar ≠ executar

O Gerador produz um **plano** (lista de arquivos, ação, conteúdo, conflito) e o
Runner aplica esse plano. Quem executa nunca recebe a intenção original, só o plano
aprovado. Isso dá dry-run de graça, torna a geração testável sem tocar em disco e
impede que um campo do wizard vire comando. Ver **ADR-002** e `memory/patterns.md` P-02.

## Fluxo de dados de uma materialização

```
blueprint (SQLite)
   → motor de regras         valida, bloqueia se houver pendência crítica
   → gerador                 resolve templates, produz PLANO
   → UI                      mostra o plano, usuário aprova
   → runner (arquivos)       escreve dentro do workspace, nunca fora
   → runner (comandos)       whitelist, spawn sem shell, log por WebSocket
   → eventos                 projeto.materializado, comando.executado
   → registry                projeto marcado como materializado, com caminho
```

## Estado

- Servidor: SQLite é a fonte de verdade. O front nunca guarda estado de projeto em duplicata.
- Cliente: cache de data-fetching para dado de servidor, Context apenas para sessão, tema e projeto ativo, estado local no componente por padrão.
- Estado só sobe de nível quando tem mais de um consumidor real.

## Preparado para depois

- O front fala com a API local por uma camada de serviços isolada. Se um dia o Forge virar hospedado, muda a camada de serviços e a autenticação, não a UI.
- O motor de regras e o gerador não dependem de Fastify. Podem virar CLI ou rodar dentro do Claude Code sem reescrita.
- Blueprint e preset são JSON versionado, portanto portáveis.
