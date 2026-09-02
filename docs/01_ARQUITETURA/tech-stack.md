# Tech Stack, KORA FORGE

Justificativa completa em **ADR-001**. Toda dependência nova exige justificativa,
conforme restrição T-03 em `memory/restrictions.md`.

## Front

| Item | Escolha | Por quê |
|---|---|---|
| Framework | React 18 | padrão da Kora, reaproveita tudo que já existe |
| Build | Vite | padrão da Kora, dev server rápido |
| Rotas | React Router v6 | padrão da Kora |
| Estado global | Context API | escopo pequeno, sem Redux |
| Data fetching | TanStack Query | cache e revalidação sem estado duplicado |
| Estilo | CSS Modules + tokens em CSS vars | separa CSS do JSX, permite os dois design systems (P-06) |
| Validação | Zod | mesmo schema compartilhado com o backend |
| Canvas do Studio | DOM absoluto com zoom e pan, sem canvas 2D | o que é DOM exporta para JSX quase 1 para 1. Ver **ADR-005** |
| Testes | Vitest + Testing Library | integra com Vite |

## Backend local

| Item | Escolha | Por quê |
|---|---|---|
| Runtime | Node 20 LTS | já instalado, mesmo ecossistema do front |
| HTTP | Fastify | leve, schema-first, integra com Zod |
| Tempo real | `@fastify/websocket` | stream de log do runner |
| Banco | SQLite via `better-sqlite3` | zero configuração, síncrono, um arquivo, sem servidor |
| Migrations | SQL versionado `YYYYMMDD_descricao.sql` | padrão Kora, mesmo sem Supabase |
| Cripto | `node:crypto`, AES-256-GCM + scrypt | nativo, sem dependência nativa extra. Ver **ADR-006** |
| Processos | `node:child_process` `spawn` | `shell: false` obrigatório |
| Templates | motor próprio de placeholder, sem `eval` | template é dado, não código executável |

## Externo

| Item | Escolha | Condição |
|---|---|---|
| Copiloto | API Anthropic | opt-in, teto de custo, saída validada. Ver **ADR-004** |
| Git | binário do sistema | usado pelo runner no projeto gerado |

## Descartado

| Alternativa | Por quê não |
|---|---|
| Electron ou Tauri | Peso e complexidade de empacotamento sem ganho real. O browser resolve. Restrição T-04 |
| Next.js | Não há servidor de produção nem SEO. Vite é mais direto |
| Postgres local | Exigiria instalação e serviço rodando. SQLite basta para um usuário |
| Supabase | Produto é offline-first e local. BaaS seria dependência sem função |
| Docker para o runner | Isolamento melhor, mas exige Docker instalado e quebra o uso de ferramentas do host. Reavaliar na Fase 5. Ver **ADR-002** |
| Yeoman | Gera boilerplate, não gera governança, e o modelo de generator é código, não dado |

## Convenções

- Módulo por feature, tanto no front (`src/features/wizard/`) quanto no backend (`server/modules/runner/`).
- Nomes de domínio em português, técnicos em inglês.
- Um componente por arquivo, PascalCase.
- Nada de barrel file gigante que esconda dependência.
