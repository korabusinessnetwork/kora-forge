# MVP, Fase 1

## Objetivo da fase

Sair do zero e chegar a: **escolher um menu, responder o wizard e ver uma pasta real
nascer no disco, com a fundação preenchida, e o dev server subindo.** Nada além disso.

Sem Studio, sem API Hub, sem cofre, sem copiloto. Cada um tem sua fase.

## Estado

| Bloco | Estado | Spec |
|---|---|---|
| 1, fundação do próprio Forge | entregue | `specs/fase1-bloco1-fundacao-do-forge.md` |
| 2 e 3, presets builtin e Registry | entregue | `specs/fase1-blocos2-3-presets-e-registry.md` |
| 4, wizard | entregue | `specs/fase1-bloco4-wizard.md` |
| 5, motor de regras | entregue | `specs/fase1-bloco5-motor-de-regras.md` |
| 6, gerador | entregue | `specs/fase1-bloco6-gerador.md` |
| 7, runner | entregue | `specs/fase1-bloco7-runner.md` |
| 8, telas de fechamento | entregue | `specs/fase1-bloco8-telas-de-fechamento.md` |

## Critério de aceite da fase inteira

Verificado em 2026-09-03, no produto rodando (`npm run forge`), gerando o projeto **Gama Clínica**
em `.../Área de Testes/gama-clinica`, pasta com espaço e acento de propósito (R-01).

- [x] Criar um projeto de verdade do começo ao fim, sem tocar no terminal
- [x] O projeto gerado tem `CLAUDE.md`, `memory/` (6 arquivos preenchidos com conteúdo real) e `docs/00` a `11`
- [x] Zero placeholder `{{...}}` sobrando em qualquer arquivo gerado
- [x] ADR-001 do projeto gerado registra a stack escolhida no wizard
- [x] `npm run dev` do projeto gerado sobe sem erro
- [x] Nenhuma escrita em disco aconteceu sem dry-run aprovado
- [x] Tudo funciona com o copiloto desligado, porque ele nem existe ainda
- [x] Do clique inicial ao dev server: menos de 10 minutos

Evidência resumida: 34 arquivos escritos, fila `git init` → `npm install` → `npm run build` →
`npm run dev` toda em `sucesso`, `iniciadaEm 20:14:10.991` e `terminadaEm 20:14:31.937`, **21
segundos** da aprovação ao dev server. O dev server do projeto gerado respondeu `HTTP 200` em
`localhost:5174`. ADR-001 registrou Modelo B, `React 18 + Vite`, `Node 20 + Fastify`, `PostgreSQL`,
multi-tenant e white-label em Sim, deploy Railway. Nenhum `{{` e nenhum `_a definir_` sobrou.

**Ressalva honesta**: a validação foi conduzida contra o servidor real e o proxy do Vite, não com
cliques num browser. As telas em si estão cobertas por teste de componente e de integração da
`PaginaWizard`. Uma passada com o olho humano na tela continua valendo antes da Fase 2.

Um defeito bloqueante apareceu **só** nessa passada e foi corrigido antes do aceite: R-08, o `npm`
não nascia no Windows. Está em `memory/bugs.md`.

## Escopo, em ordem de construção

### 1. Fundação do próprio Forge
- Repositório, Vite, Fastify, SQLite, migrations
- Camada de serviços no front, envelope `{ data, error, meta }`, Zod nas duas pontas
- Token de sessão local, checagem de Origin, bind em `127.0.0.1`
- Tokens `--forge-*` e os atoms básicos

### 2. Registry
- Listar, criar e arquivar projeto
- Persistência de rascunho e retomada na etapa correta
- Estados vazio, carregando, erro

### 3. Presets
- Schema do preset em Zod
- Carregar builtin do repositório
- Preset `criar-aplicacao-web` completo
- Presets `criar-site` e `criar-aplicacao-local` no mesmo formato

### 4. Wizard
- Casca `PassoWizard` com título, microtexto, campos, avisos, navegação e pular
- Etapas 1, 2, 3, 5, 7, 8 e 9 (Design e APIs ficam desligadas nesta fase)
- Salvar blueprint versionado a cada avanço

### 5. Motor de regras
- Avaliador com os operadores definidos
- Catálogo inicial de 16 regras
- Renderização do hit junto do campo que o causou
- Bloqueio impedindo a etapa Materializar
- Teste por regra: um blueprint que dispara, um que não dispara

### 6. Gerador
- Motor de template com placeholder, sem avaliação de expressão
- Templates: fundação Kora completa, Vite + React, camada de serviços, tokens, `.gitignore`, `.env.example`
- Saída é **plano**, não escrita
- Hash do blueprint no plano

### 7. Runner
- Whitelist, `spawn` sem shell, `cwd` confinado
- Checagem de requisitos antes de iniciar
- Escrita de arquivos na ordem fixa
- Log por WebSocket, com parar
- Registro em `command_runs` e `command_logs`

### 8. Telas de fechamento
- Painel do plano, agrupado por pasta, com conflitos no topo
- Painel de log ao vivo
- Tela final com caminho, resumo e atalho para abrir no editor

### 9. Gaveta de ideias
- Atalho global, campo com título e próximo passo, volta para onde estava

## Fora do escopo da Fase 1

Studio, API Hub, cofre, copiloto, tema claro, editor de presets, importar projeto
existente, i18n, empacotamento desktop.

## Ordem sugerida de trabalho

Cada bloco acima é uma spec no loop `spec → build → review`. Blocos 1 a 4 são sequenciais.
Blocos 5 e 6 podem ser paralelos, porque não compartilham arquivo. O bloco 7 depende do 6.

## Riscos da fase

| Risco | Sinal de alerta | Resposta |
|---|---|---|
| O gerador crescer demais | template com condicional dentro de condicional | mover a decisão para regra do motor |
| O wizard virar formulário longo | etapa com mais de 6 campos | quebrar em duas ou mover para default |
| `better-sqlite3` falhar no Windows | erro de build no `npm install` | fixar versão com binário pré-compilado, documentar |
| Escopo escorregar para o Studio | vontade de "só um preview rapidinho" | é Fase 2. Registrar em Ideias e voltar |
