# Instalação, KORA FORGE

> Documento escrito antes do código, na convenção document-first. Serve como
> contrato do que a Fase 1 precisa entregar.

## Requisitos

| Item | Versão | Por quê |
|---|---|---|
| Node.js | 20.19 ou superior (22 LTS recomendado) | backend local, runner, build do front. O Vite 8 exige 20.19+ |
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
npm ci
npm run forge:init
```

Use `npm ci`, **não** `npm install`. Um `install` do zero falha em npm 10.9.7 com
`Cannot read properties of null (reading 'edgesOut')`, e o repositório só instala porque o
`package-lock.json` está versionado (R-07 em `memory/bugs.md`).

Se o `npm ci` parar em `Could not find any Visual Studio installation`, ele está tentando
compilar o `better-sqlite3` sem precisar. Rode `npm ci --ignore-scripts`: o pacote traz o binário
pré-compilado para Windows e funciona sem toolchain C++ (R-02).

O `forge:init` cria `~/.kora-forge/` (com `presets/` e `logs/`), gera o banco SQLite e aplica
as migrations. Pode rodar de novo sem efeito colateral. A senha mestre do cofre de segredos
chega na Fase 3; até lá o Forge roda sem cofre. A chave de sessão é recriada a cada boot, não
no init.

## Rodar

```powershell
npm run forge
```

Sobe dois processos: API local em `http://127.0.0.1:7337` e front em
`http://127.0.0.1:5173`. O terminal imprime a URL já com o token de sessão no fragmento
(`#token=`). Abra essa URL, e não `localhost:5173` seco: sem o token, a UI avisa que precisa do
link do terminal.

> O bind é sempre `127.0.0.1`, nunca `0.0.0.0`. Ver `docs/11_SEGURANCA/README.md`.

Para rodar o front compilado sem o Vite: `npm run build` e depois `npm start`, que serve `dist/`
na própria API em `http://127.0.0.1:7337`. O `npm run forge` ignora `dist/` de propósito.

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
| `FORGE_PORT` | `7337` | porta da API local. O host é sempre `127.0.0.1` e não é configurável |
| `FORGE_HOME` | `~/.kora-forge` | pasta de dados: banco, chave de sessão, presets custom e logs |
| `FORGE_WORKSPACE` | vazio | raiz permitida para materializar projetos |
| `FORGE_COPILOT` | `off` | liga o copiloto Claude |
| `FORGE_COPILOT_BUDGET_USD` | `5` | teto mensal do copiloto |

Chaves de API nunca vão para `.env`, vão para o cofre. Ver **ADR-006**.

## Desinstalar

Apagar a pasta do repositório e `~/.kora-forge/`. Os projetos já materializados
ficam no workspace, são independentes do Forge.
