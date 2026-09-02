# Presets e Etapas do Wizard

Preset é dado, nunca código (P-01, **ADR-007**). Criar um menu novo é criar um JSON.

## Catálogo de etapas

As nove etapas existem no motor. Cada preset escolhe quais liga e em que ordem.

| # | Etapa | O que coleta | Preenche no projeto gerado |
|---|---|---|---|
| 1 | **Identidade** | nome, essência em uma frase, problema, proposta de valor | `memory/identity.md`, `docs/00_VISAO`, `README.md` |
| 2 | **Escopo e público** | público-alvo, personas, aha moment, não-objetivos | `memory/identity.md`, `docs/00_VISAO` |
| 3 | **Arquitetura e stack** | modelo (A, B ou C), stack, multi-tenant, deploy | `CLAUDE.md`, `docs/01_ARQUITETURA`, ADR-001 |
| 4 | **Design (Studio)** | tokens, páginas, layout | `docs/02_DESIGN_SYSTEM`, `docs/06_COMPONENTES`, `src/styles/tokens.css` |
| 5 | **Dados e entidades** | entidades, campos, relações | `docs/04_MODELAGEM`, `schema.sql`, migrations |
| 6 | **APIs e integrações** | quais APIs, quais chaves, quais modelos | `docs/07_APIS`, camada de serviços, `.env.example` |
| 7 | **Segurança e custo** | dado sensível, compliance, tier gratuito | `docs/11_SEGURANCA`, `memory/restrictions.md` |
| 8 | **Fundação** | revisão do que será gerado, ADRs pendentes | `memory/`, `docs/08_DECISOES`, `docs/09_BACKLOG` |
| 9 | **Materializar** | confirmação do plano e dos comandos | o disco |

Identidade e Materializar são obrigatórias em todo preset. As outras são puláveis, e
pular usa o default do preset, marcado como "assumido" na revisão.

## Contrato do preset

```json
{
  "id": "criar-aplicacao-web",
  "nome": "Criar Aplicação Web",
  "descricao": "SaaS multi-tenant no padrão Kora.",
  "versao": 1,
  "categoria": "aplicacao",
  "icone": "layers",
  "etapas": ["identidade", "escopo", "arquitetura", "design", "dados", "apis", "seguranca", "fundacao", "materializar"],
  "defaults": {
    "modelo_arquitetura": "A",
    "stack": ["react", "vite", "react-router", "supabase", "vercel"],
    "multi_tenant": true,
    "white_label": true,
    "auth": true
  },
  "arvore": ["fundacao-kora", "vite-react", "supabase", "camada-de-servicos", "design-tokens"],
  "regras_extras": ["arq-multitenant-obrigatorio", "seg-rls-obrigatorio"],
  "skills": ["fundacao-de-projeto", "loop-spec-build-review", "oop-refactor"],
  "mcps": ["playwright", "chrome-devtools", "supabase"],
  "comandos": [
    { "id": "git-init", "cmd": "git", "args": ["init"], "obrigatorio": true },
    { "id": "install", "cmd": "npm", "args": ["install"], "obrigatorio": true },
    { "id": "dev", "cmd": "npm", "args": ["run", "dev"], "longa_duracao": true, "obrigatorio": false }
  ],
  "requisitos": [{ "bin": "node", "min": "20" }, { "bin": "git" }],
  "definition_of_done": [
    "memory/ preenchido com conteúdo real, sem placeholder",
    "ADR-001 registra a stack",
    "RLS previsto em toda tabela",
    "tudo em tier gratuito",
    "build passa"
  ]
}
```

## Os três presets da Fase 1

### Criar Site
Institucional ou landing page. Sem auth, sem banco por padrão. Peso na etapa de Design,
etapa de Dados desligada. Foco em performance e SEO. Deploy na Vercel.

### Criar Aplicação Web
O padrão Kora completo. React, Vite, Supabase, multi-tenant com RLS, auth, white-label.
Todas as etapas ligadas. É o preset de referência, os outros são variações dele.

### Criar Aplicação Local
Aplicação que roda na máquina, sem nuvem. Node mais SQLite, front local, sem auth
remota. Liga as regras de offline-first, bind em localhost, token de sessão local e whitelist de comandos. É o preset que o próprio
Forge usaria para se gerar.

## No backlog

Criar API/Serviço (Modelo C, sem UI, contrato-first) e Criar Automação/Bot (worker mais
agendamento). Ver `docs/09_BACKLOG/README.md`.

## Preset customizado

O usuário pode duplicar um preset, editar o JSON e salvar em `~/.kora-forge/presets/`.
Preset importado passa pelo mesmo schema e pelos mesmos limites de whitelist de comando,
sem exceção (restrição S-06).
