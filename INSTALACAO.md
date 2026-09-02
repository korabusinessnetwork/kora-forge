# Instalação, KORA FORGE

> Documento escrito antes do código, na convenção document-first. Serve como
> contrato do que a Fase 1 precisa entregar.

## Requisitos

| Item | Versão | Por quê |
|---|---|---|
| Node.js | 20 LTS ou superior | backend local, runner, build do front |
| npm | 10+ | gerenciador padrão |
| Git | 2.40+ | `git init` no projeto materializado |
| Sistema | Windows 10/11 com PowerShell 7 | ambiente primário do Matheus |

Opcionais, exigidos só por alguns presets: Supabase CLI, Docker, GitHub CLI.
O Forge detecta o que falta na etapa de materialização e avisa antes de executar,
nunca no meio da execução.

## Instalar

```powershell
git clone <repo> kora-forge
cd kora-forge
npm install
npm run forge:init
```

O `forge:init` cria `~/.kora-forge/`, gera o banco SQLite, gera a chave de sessão
local e pede a senha mestre do cofre de segredos (pode ser pulada, o cofre nasce
trancado e o Forge funciona sem ele).

## Rodar

```powershell
npm run forge
```

Sobe dois processos: API local em `http://127.0.0.1:7337` e front em
`http://127.0.0.1:5173`. O terminal imprime a URL já com o token de sessão.

> O bind é sempre `127.0.0.1`, nunca `0.0.0.0`. Ver `docs/11_SEGURANCA/README.md`.

## Estrutura em disco

```
~/.kora-forge/
├── forge.db            # SQLite: projetos, blueprints, presets, eventos, logs
├── vault.bin           # cofre de segredos, AES-256-GCM
├── session.key         # token de sessão local, recriado a cada boot
├── presets/            # presets customizados do usuário
└── logs/               # log dos comandos executados pelo runner
```

O workspace onde os projetos nascem é configurável e vem vazio de propósito.
Definir em Configurações antes do primeiro projeto, por exemplo `D:\dev\kora`.
Qualquer escrita fora do workspace é bloqueada pelo erro `FORGE_PATH_FORBIDDEN`.

## Variáveis de ambiente

Nenhuma é obrigatória. As reconhecidas ficam em `.env.local`:

| Variável | Default | Uso |
|---|---|---|
| `FORGE_PORT` | `7337` | porta da API local |
| `FORGE_WORKSPACE` | vazio | raiz permitida para materializar projetos |
| `FORGE_COPILOT` | `off` | liga o copiloto Claude |
| `FORGE_COPILOT_BUDGET_USD` | `5` | teto mensal do copiloto |

Chaves de API nunca vão para `.env`, vão para o cofre. Ver **ADR-006**.

## Desinstalar

Apagar a pasta do repositório e `~/.kora-forge/`. Os projetos já materializados
ficam no workspace, são independentes do Forge.
