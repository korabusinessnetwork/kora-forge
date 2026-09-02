# ADR-001, Stack e modelo de arquitetura

**Status**: Aceito
**Data**: 2026-09-02
**Decisores**: Matheus Bonato
**Supersede**: nenhum

---

## Contexto

O padrão Kora default é o Modelo A (SPA React + Vite falando direto com Supabase). Ele
não serve aqui por um motivo simples: o KORA FORGE precisa **escrever arquivos no disco
do usuário e executar processos do sistema operacional**. Nenhum BaaS faz isso, e nenhum
código rodando só no browser faz isso.

Restrições que pesam: rodar offline, custo zero, ambiente primário Windows com
PowerShell, usuário único, e sem vontade de manter empacotamento de app desktop na
Fase 1.

## Decisão

Adotar um **Modelo B enxuto**: SPA React + Vite no browser, falando com uma **API local
em Node + Fastify** ligada exclusivamente em `127.0.0.1`, com **SQLite** como
persistência. O backend local é a única camada com acesso a filesystem, processos e
segredos.

## Alternativas Consideradas

### 1. Modelo A puro (SPA + Supabase)
- **Prós**: é o default da casa, zero backend para manter, multi-tenant de graça
- **Contras**: impossível escrever no disco local ou rodar comando, exigiria nuvem para um produto que é local por natureza
- **Descartado porque**: não atende ao requisito central, que é materializar projeto no disco

### 2. Electron ou Tauri (app desktop)
- **Prós**: acesso nativo a disco e processo, instalador, experiência de app
- **Contras**: empacotamento, assinatura, atualização, build por plataforma, dependência pesada
- **Descartado porque**: o browser mais servidor local entrega o mesmo resultado hoje com uma fração do custo. Reavaliar na Fase 5 se houver ganho real

### 3. CLI pura (sem interface)
- **Prós**: mais simples, mais rápida de escrever, encaixa no fluxo do terminal
- **Contras**: mata o princípio nº 1 (intuitividade), inviabiliza o Studio e o dry-run visual
- **Descartado porque**: a interface visual é parte do valor. O motor, porém, será desacoplado o bastante para virar CLI depois sem reescrita

### 4. Next.js com rotas de API
- **Prós**: um projeto só, front e back juntos
- **Contras**: sem SEO, sem servidor de produção, e o modelo de servidor persistente com WebSocket para log fica menos direto
- **Descartado porque**: complexidade sem benefício para um app que só roda local

### 5. Postgres local em vez de SQLite
- **Prós**: mesmo banco dos projetos gerados, mais recursos
- **Contras**: exige instalação e serviço rodando, contra a restrição de custo zero de setup
- **Descartado porque**: um usuário, um arquivo, SQLite basta e sobra

## Consequências

### Positivas
- Escrever em disco e executar comando fica natural e concentrado em um lugar só
- Roda offline de verdade, sem nuvem e sem custo
- Front continua no padrão Kora (React, Vite, Router, Context, Zod, camada de serviços)
- SQLite dá zero configuração, backup por cópia de arquivo e leitura síncrona simples
- Um servidor persistente torna o WebSocket de log natural

### Negativas e trade-offs
- Existe um backend para manter, coisa que o Modelo A evitava
- Um servidor local é superfície de ataque real, mitigada pelos controles C1 a C4 do plano de segurança
- Dois processos para subir, mitigado por um script `npm run forge` único
- `better-sqlite3` traz binário nativo, com risco de build no Windows (risco R-02 em `memory/bugs.md`)

## Referências

- `docs/01_ARQUITETURA/README.md` e `tech-stack.md`
- `docs/11_SEGURANCA/README.md`, controles C1 a C4
- `memory/restrictions.md`, restrições T-01, T-02, T-04
- ADR-002, que trata do runner
