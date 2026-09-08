# Fase 1, relatório do critério de aceite

**Data**: 2026-09-08. **Plataforma**: Windows 11, Node 24.18.0, npm 11.16.0.
**Como reproduzir**: `npm run verificar:fase1`.

Os oito itens do critério, em `mvp.md`, passaram. A prova está em
`scripts/verificar-fase1.mjs` e roda isolada, com banco, workspace e porta próprios em pasta
temporária, apagando o que cria. O banco e o workspace do dono não são tocados.

## Resultado

| # | Item | Resultado | Evidência |
|---|---|---|---|
| 1 | Criar um projeto do começo ao fim sem tocar no terminal | passou | 3 presets listados, projeto criado, 9 etapas do wizard gravadas, motor de regras com 0 bloqueios, tudo pelas funções de `src/services/` |
| 2 | `CLAUDE.md`, `memory/` com 6 arquivos preenchidos e `docs/00` a `11` | passou | 6 arquivos em `memory/`, todos com corpo além do título; as 12 pastas de `docs/` presentes |
| 3 | Zero placeholder `{{...}}` sobrando | passou | varredura de todo arquivo de texto dos 34 gerados, nenhuma ocorrência |
| 4 | ADR-001 registra a stack escolhida | passou | `adr-001-stack-e-arquitetura.md` cita react, vite, react-router, context-api, supabase, zod e vitest |
| 5 | `npm run dev` do projeto gerado sobe sem erro | passou | o runner subiu, o log anunciou `http://localhost:5173/` e a URL respondeu HTTP 200 |
| 6 | Nenhuma escrita em disco sem dry-run aprovado | passou | pasta inexistente antes do plano, plano com 34 arquivos sem escrever nada, e hash divergente recusado com `FORGE_PLAN_STALE` |
| 7 | Tudo funciona com o copiloto desligado | passou | sem `ANTHROPIC_API_KEY` no ambiente e com o copiloto desligado, o fluxo completou |
| 8 | Do começo ao dev server: menos de 10 minutos | passou | 6,3 s a 7,2 s de ponta a ponta em três execuções, contra um teto de 600 s |

Duas execuções seguidas deram o mesmo resultado, sem contaminação entre elas.

## O tempo, em contexto

O item 8 tem folga enorme, e vale dizer por quê para o número não enganar. O `npm install` do
projeto gerado roda com o cache do npm quente nesta máquina. Numa máquina sem cache ele domina o
tempo. Mesmo assim a margem é de duas ordens de grandeza, e o resto do fluxo, wizard, plano e
escrita dos 34 arquivos, leva menos de um segundo.

## O que a prova não prova

**Ninguém clicou num browser.** A prova dirige as funções de `src/services/`, que são o único
ponto do front que fala com a API, contra um servidor Fastify real. É o mesmo código que o
componente executa no clique, uma camada abaixo dele, com os mesmos schemas Zod nas duas pontas.

A ligação entre o clique e a chamada de serviço está coberta pelos testes de componente, que usam
`fireEvent` sobre os componentes reais. O que não existe é um teste que abra um browser de
verdade. Fechar essa lacuna pede Playwright ou equivalente, com centenas de megabytes de binário e
uma dependência nova, e a decisão é do dono.

**A prova não passa pelo Vite.** Em uso normal o browser fala com o Vite, que faz proxy para o
Fastify. A prova fala com o Fastify direto. O proxy está configurado em `vite.config.js` e é
exercitado toda vez que o dono roda `npm run forge`.

## Defeitos que a prova encontrou

Nenhum deles impede os oito itens. Um foi corrigido nesta rodada; os outros dois ficaram
registrados porque a correção pede decisão.

- **R-11, log de comando de longa duração não chega ao banco.** O runner grava `command_logs` em
  lote de 50 linhas ou no fim do comando. Um `npm run dev`, que nunca termina, nunca esvazia a
  fila. O painel não sofre, porque recebe pelo WebSocket, mas o histórico se perde no reinício.
- **R-12, parar um comando deixa o processo real vivo no Windows.** `parar()` mata o `npm`, e o
  `vite` que ele criou sobrevive. Confirmado medindo os pids: filho morto, neto vivo. O botão
  Parar do bloco 7 não para o dev server, e o mesmo vale ao fechar o Forge.
- **Corrigido aqui: sequência ANSI crua no log.** O Vite escreve cor em ANSI, e o painel HTML
  mostrava os códigos como lixo, com o agravante de partir o número da porta ao meio, o que
  escondia a URL do projeto recém-nascido. A limpeza passou a acontecer onde pedaço de stream vira
  linha, então painel e banco recebem o mesmo texto.

## Observações que viraram item de backlog

- **A porta 5173 do projeto gerado é a mesma do Forge.** O template fixa `server: { port: 5173 }`,
  que é a porta do dev server do próprio Forge. Com o Forge aberto, o projeto gerado escorrega
  para 5174, 5175 e por aí. O Vite anuncia a porta no log, então o usuário consegue se virar, mas
  o padrão convida ao conflito.
- **A tela final não mostra a URL do dev server.** Ela mostra o caminho no disco e abre a pasta. A
  URL existe só no log ao vivo. Depois de tanto trabalho para não precisar de terminal, o último
  passo, abrir o projeto no browser, ainda depende de ler o log.
