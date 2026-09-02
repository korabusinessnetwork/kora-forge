# Spec, Fase 1, Bloco 1: Fundação do próprio Forge

> Origem: `docs/09_BACKLOG/mvp.md`, bloco 1. Loop `spec → build → review`.
> Data: 2026-09-02. Status: **aprovado sem ressalvas** (review em 2026-09-02, seção 7).

## 1. Escopo

Fazer o repositório sair do zero e virar um app que sobe: front React + Vite em
`127.0.0.1:5173`, API local Fastify em `127.0.0.1:7337`, SQLite em `~/.kora-forge/forge.db`
com migrations aplicadas, guarda de sessão (token + `Origin` + `Host`) em toda rota da API,
envelope `{ data, error, meta }` validado por Zod nas duas pontas, camada de serviços no
front, tokens `--forge-*` e os atoms básicos, com uma tela de Início e uma de Configurações
que provam o caminho inteiro (browser → serviço → API → SQLite → resposta validada → UI).

## 2. Fora de escopo

- Registry, projetos e blueprints (bloco 2). Presets carregados no banco (bloco 3). Wizard (4).
  Motor de regras (5). Gerador (6). Runner, WebSocket e log ao vivo (7). Painéis (8). Ideias (9).
- Cofre, API Hub, copiloto, tema claro, editor de presets, i18n, empacotamento desktop.
- Atoms `CampoSegredo`, `SeloIA` e `Icone` (dependem de cofre, copiloto e de escolher um
  conjunto de ícones, decisão que vira dependência nova).
- Log em arquivo em `~/.kora-forge/logs/` (é o log do runner, bloco 7). Neste bloco o log vai
  para stdout, com redação do token.
- Qualquer alteração em `presets/*.json` ou nos ADRs.

## 3. Arquivos afetados

Raiz: `package.json`, `package-lock.json`, `vite.config.js`, `vitest.config.js`, `index.html`,
`README.md` (seção Estado), `memory/decisions.md` (dependências fora do tech-stack),
`docs/07_APIS/README.md` e `docs/11_SEGURANCA/README.md` (detalhe da guarda: `Host`,
entrega do token por fragmento, regra de `Origin` em método mutante).

`shared/` (importado pelo servidor e pelo front, sem cópia):
`erros.js`, `schemas/envelope.js`, `schemas/health.js`, `schemas/settings.js`.

`server/`: `index.js` (boot, bind, URL com token), `app.js` (`construirApp`, testável sem
listen), `config.js` (env + `.env.local`, validado por Zod), `lib/envelope.js`,
`lib/guarda.js`, `lib/validar.js`, `lib/erro.js`, `db/conexao.js`, `db/migrar.js`,
`db/migrations/20260902_schema_inicial.sql`, `modules/health/rotas.js`,
`modules/settings/rotas.js`, `modules/settings/servico.js`, `modules/eventos/servico.js`,
`cli/init.js`, `cli/migrate.js`, testes `*.test.js` co-localizados.

`src/`: `main.jsx`, `App.jsx`, `mensagens.js`, `styles/tokens.css`, `styles/global.css`,
`services/api.js`, `services/sessao.js`, `services/health.js`, `services/settings.js`,
`components/shared/{Botao,Campo,Selecao,Selo,Chave}/<Nome>.jsx` + `<Nome>.module.css`,
`components/layout/LayoutApp.jsx` + `.module.css`, `features/inicio/PaginaInicio.jsx` +
`.module.css`, `features/config/PaginaConfig.jsx` + `.module.css`, testes co-localizados.

## 4. Critérios de aceite

### Ferramental
1. Do zero, `npm install`, `npm test` e `npm run build` passam (Node 20.19+ ou 22.12+, exigido pelo Vite 8; `engines` declara isso).
2. `package.json` tem os scripts `forge`, `forge:init`, `dev`, `dev:server`, `build`, `test` e `db:migrate`; toda dependência com versão exata, sem `^`, `~` ou `latest` (controle C10).
3. O bind é `127.0.0.1` fixo no código. Nenhuma env, setting ou argumento muda o host; `FORGE_HOST=0.0.0.0` é ignorado (teste).
4. `FORGE_PORT` inválida (não numérica, fora de 1024–65535) aborta o boot com código `FORGE_CONFIG` e mensagem legível, sem stack trace. Porta ocupada aborta com `FORGE_PORT_IN_USE`.

### Guarda (C1, C2, S-01, S-02)
5. Toda rota `/api/*` sem `X-Forge-Token` responde `401 FORGE_UNAUTHORIZED`.
6. Token diferente do de sessão responde 401; a comparação é em tempo constante (`timingSafeEqual`).
7. `Origin` presente e fora da allowlist responde 401 mesmo com token válido. Allowlist: `http://127.0.0.1` e `http://localhost` nas portas da API e do dev server. `Origin: null` é recusado.
8. Método mutante (POST, PATCH, PUT, DELETE) sem `Origin` responde 401. GET sem `Origin` passa se o token e o `Host` estiverem certos.
9. `Host` fora de `127.0.0.1:<porta>` e `localhost:<porta>` responde 401 (fecha DNS rebinding).
10. Toda recusa da guarda tem a mesma mensagem, sem dizer qual checagem falhou.
11. Nenhuma resposta traz `Access-Control-Allow-Origin`. Não existe plugin de CORS.
12. Token de sessão: 32 bytes aleatórios em hex, gravado em `<home>/session.key` com modo `0600`, recriado a cada boot.
13. O token nunca vai para log nem para query string: o logger redige `x-forge-token`, e a URL impressa no terminal entrega o token por fragmento (`#token=`).

### Envelope e erros (P, padrões Kora)
14. Toda resposta de `/api/*`, sucesso ou erro, tem exatamente as chaves `data`, `error`, `meta`, com `meta.requestId` string e `meta.duracaoMs` número.
15. `error` tem `{ codigo, mensagem, detalhe }` e `codigo` pertence à lista de `shared/erros.js`.
16. Rota inexistente sob `/api` responde `404 FORGE_NOT_FOUND` no envelope.
17. Entrada fora do schema (corpo, query, chave desconhecida, JSON malformado) responde `400 FORGE_VALIDATION` com `detalhe.issues` (caminho + mensagem). Nada é ajustado silenciosamente.
18. Erro inesperado responde `500 FORGE_INTERNAL` sem stack nem mensagem interna no corpo.
19. Toda rota declara `schemaSaida`; a saída é validada antes de serializar, e saída inválida vira `500 FORGE_INTERNAL` (o contrato nunca vaza quebrado).

### Banco e migrations
20. `npm run forge:init` cria `<home>/`, `<home>/presets/`, `<home>/logs/` e `forge.db`, aplica migrations e é idempotente.
21. Migrations em `server/db/migrations/YYYYMMDD_descricao.sql`, aplicadas em ordem lexicográfica, cada uma em transação, registradas em `schema_migrations(versao, aplicada_em)`; rodar de novo não reaplica nada.
22. Depois de migrar, tabelas e índices são exatamente os de `docs/04_MODELAGEM/schema.sql` (teste compara `sqlite_master` das duas fontes).
23. Toda conexão liga `PRAGMA foreign_keys = ON` e `journal_mode = WAL`.
24. `<home>` vem de `FORGE_HOME` (default `~/.kora-forge`), o que permite testar com pasta temporária.

### Rotas do bloco
25. `GET /api/health` devolve `{ versao, workspace: { configurado, caminho }, cofre, copiloto: { ligado } }`. `versao` é a de `package.json`; `cofre` é `ausente` sem `vault.bin` e `trancado` com ele; `copiloto.ligado` é sempre `false` neste bloco.
26. `GET /api/settings` devolve `{ workspace, tema, copilotoTetoUsd }` com defaults `null`, `escuro`, `5` quando nada foi salvo.
27. `PATCH /api/settings` aceita subconjunto (schema estrito). `workspace` precisa ser caminho absoluto de uma pasta existente, senão `FORGE_VALIDATION` com mensagem humana; `null` limpa. `copilotoTetoUsd` ≥ 0. `tema` ∈ {`escuro`, `claro`}. Persistência em `settings(chave, valor, atualizado_em)` com valor em JSON e data ISO 8601 UTC.
28. PATCH que muda algo emite `settings.atualizadas` em `events` com as chaves alteradas; PATCH vazio não emite. O registro é fire-and-forget: falha ao gravar o evento não altera a resposta (teste com registrador que lança).
29. `.env.local` é lido sem dependência externa; `FORGE_PORT`, `FORGE_WORKSPACE`, `FORGE_COPILOT` (on|off) e `FORGE_COPILOT_BUDGET_USD` (≥ 0) validados por Zod, com os defaults de `INSTALACAO.md`.

### Contrato compartilhado
30. Os schemas Zod de envelope, health e settings vivem em `shared/schemas/` e são importados pelo servidor e pelo front a partir do mesmo arquivo.

### Front
31. `src/services/api.js` é o único arquivo de `src/` que chama `fetch`.
32. O cliente envia `X-Forge-Token`, valida a resposta com o schema de envelope, lança `ErroApi { codigo, mensagem, detalhe }` quando `error` não é `null`, e converte falha de rede em `FORGE_OFFLINE`. Cada serviço valida `data` com o schema específico antes de devolver.
33. Na carga, `#token=` é capturado, guardado em `sessionStorage` e removido da URL via `history.replaceState`. Sem token, a UI mostra um estado que orienta a abrir pelo link do terminal. Nunca tela em branco.
34. `tokens.css` define todos os tokens `--forge-*` de `docs/02_DESIGN_SYSTEM` (cor, tipografia, espaçamento 1 a 8, raio, sombra, motion) e zera motion sob `prefers-reduced-motion`.
35. Nenhum `.module.css` nem `global.css` contém cor literal (hex, rgb, hsl) ou família de fonte literal; só `tokens.css` tem valores.
36. Atoms `Botao`, `Campo`, `Selecao`, `Selo` e `Chave` em `src/components/shared/<Nome>/`, um componente por arquivo, CSS Module co-localizado. `Botao` tem as variantes primario, secundario, fantasma e destrutivo e estado `carregando`. `Campo` exige `microtexto` e mostra `erro`. `Selecao` põe a opção marcada como padrão Kora em primeiro, com selo. `Chave` mostra em mono e copia. Alvo de clique com altura mínima de 32px.
37. `LayoutApp` tem barra lateral (Início, Configurações), topo com nome e versão, foco de teclado visível e navegação por teclado.
38. `PaginaInicio` mostra versão, workspace (caminho em `Chave` ou ação "Configurar"), cofre e copiloto, com estados carregando, erro e sucesso.
39. `PaginaConfig` edita workspace, tema e teto; erro de validação do servidor aparece junto do campo; sucesso dá feedback textual; estados carregando, erro e sucesso.
40. Textos de página, estados e mensagens de erro vêm de `src/mensagens.js`.
41. Nenhum `style=` inline em `src/`.
42. Vitest com dois projetos (`server` em node, `web` em jsdom). Cobertura mínima: guarda (5 a 10), envelope (14 a 19), migrations (21, 22), settings (26 a 28), `api.js` (32), `sessao.js` (33), `Botao`, `Campo` e `Selecao` (36).
43. Nenhum `console.log` fora de `server/index.js` e `server/cli/`. Nenhum `TODO`.

### Documentação
44. `README.md` diz que a Fase 1 está em andamento e o que o bloco 1 entregou; `memory/decisions.md` registra as dependências adicionadas além do tech-stack, com justificativa.
45. `docs/07_APIS/README.md` e `docs/11_SEGURANCA/README.md` descrevem a guarda como implementada: `Host` checado, `Origin` obrigatória em método mutante, token por fragmento.

## 5. Edge cases conhecidos

- `#token=` junto de outro conteúdo no hash; hash ausente; `sessionStorage` indisponível (lança) vira "sem token".
- `PATCH /api/settings` com `{}`: 200, sem evento. Chave desconhecida: 400. Corpo não-JSON: 400.
- `workspace` relativo, com `..`, apontando para arquivo, ou inexistente: 400 com mensagem dizendo o que fazer. Barra final é normalizada.
- `Host` IPv6 (`[::1]`) é recusado, o bind é IPv4.
- `<home>` não gravável, `session.key` não gravável: boot aborta com mensagem clara.
- `npm run forge` (flag `--dev`): nunca serve `dist/`, imprime a URL do Vite. `npm start`: serve `dist/`
  quando existe e imprime a própria URL; sem `dist/`, imprime a URL do Vite e avisa para rodar o build.
- Vite em dev faz proxy de `/api` para `127.0.0.1:7337` com `changeOrigin`, então `Host` chega como `127.0.0.1:7337` e `Origin` como a do browser (`http://127.0.0.1:5173`), ambos na allowlist.

## 6. Definição de "aprovado sem ressalvas"

Os 45 critérios respondidos com sim e evidência, `npm test` e `npm run build` verdes do zero,
sem `TODO`, sem `console.log` fora do CLI, sem `fetch` fora da camada de serviços, e
`docs/07` e `docs/11` batendo com o código.

## 7. Review (2026-09-02)

Auditoria do build contra os 45 critérios. Evidência é o nome do teste, o arquivo ou a checagem
rodada. Suíte: `npm test`, 15 arquivos, 110 testes, tudo verde. `npm run build` verde.

| # | Sim? | Evidência |
|---|---|---|
| 1 | sim | `npm install` do zero, `npm test` e `npm run build` neste ambiente (Node 22.22); `engines` em `package.json` |
| 2 | sim | scripts em `package.json`; grep de `^` e `~` só acha `engines` |
| 3 | sim | `HOST_API` fixo em `server/config.js`; `config.test.js` "ignora FORGE_HOST"; smoke com `FORGE_HOST=0.0.0.0`: `/proc/net/tcp` mostra `0100007F` e conexão pelo IP externo recusada |
| 4 | sim | `config.test.js` "configuração inválida"; smoke `FORGE_PORT=abc` → `FORGE_CONFIG`; segunda instância → `FORGE_PORT_IN_USE` |
| 5 | sim | `app.test.js` "sem token responde 401 FORGE_UNAUTHORIZED" |
| 6 | sim | `guarda.js` `tokensIguais` com `timingSafeEqual`; `app.test.js` "token errado responde 401" |
| 7 | sim | `guarda.test.js` "recusa Origin fora da allowlist, inclusive null"; `app.test.js` "Origin fora da allowlist" |
| 8 | sim | `guarda.test.js` "exige Origin em método mutante"; `app.test.js` "PATCH sem Origin responde 401, GET sem Origin passa" |
| 9 | sim | `guarda.test.js` "recusa Host fora da lista, inclusive IPv6"; `app.test.js` "Host fora da lista" |
| 10 | sim | `app.test.js` "todas as recusas usam a mesma mensagem" |
| 11 | sim | `app.test.js` "não existe CORS"; nenhum plugin de CORS em `package.json` |
| 12 | sim | `boot.test.js` "gera 32 bytes em hex, grava com modo 0600 e recria"; smoke: 64 chars, modo 600 |
| 13 | sim | `CAMINHOS_REDIGIDOS` em `server/app.js`; URL com `#token=` em `server/index.js`; smoke: zero linhas do pino com o token |
| 14 | sim | `app.test.js` "sucesso tem exatamente data, error e meta" |
| 15 | sim | `shared/erros.js` mais `erroApiSchema` com enum; `app.test.js` "todo código de erro devolvido pertence à lista" |
| 16 | sim | `app.test.js` "rota inexistente sob /api responde 404 FORGE_NOT_FOUND" |
| 17 | sim | `app.test.js` "chave desconhecida", "JSON malformado"; `settings.test.js` "tipo errado" |
| 18 | sim | `app.test.js` "erro inesperado responde 500 sem vazar mensagem nem stack" |
| 19 | sim | `app.test.js` "saída fora do schemaSaida vira 500", "rota sem schemaSaida vira 500" |
| 20 | sim | smoke `forge:init` duas vezes (segunda: "banco já estava em dia"); `boot.test.js` "idempotente" |
| 21 | sim | `migrar.test.js` "aplica uma vez, registra e não reaplica", "migration quebrada não deixa metade" |
| 22 | sim | `migrar.test.js` "espelha docs/04_MODELAGEM/schema.sql, tabela por tabela" |
| 23 | sim | `migrar.test.js` "liga foreign_keys e WAL em banco de arquivo" |
| 24 | sim | `config.test.js` "FORGE_HOME aceita ~ e caminho explícito"; `server/testes/apoio.js` usa pasta temporária |
| 25 | sim | `server/modules/health/rotas.js` com `healthSchema`; smoke mostra o formato; `copiloto.ligado` fixo em `false` |
| 26 | sim | `settings.test.js` "devolve os defaults quando nada foi salvo" |
| 27 | sim | `settings.test.js`: relativo, `..`, arquivo, inexistente, null limpa, barra final, teto, tema, tipo; `atualizado_em` ISO |
| 28 | sim | `settings.test.js` "emite evento", "PATCH vazio não emite", "falha ao gravar o evento não altera a resposta" |
| 29 | sim | `config.test.js` "lê .env.local e deixa o ambiente ganhar", "usa os defaults"; `lerEnvLocal` sem dependência |
| 30 | sim | grep `shared/schemas`: `server/modules/*` e `src/services/*`, `src/features/config/FormularioConfig.jsx` |
| 31 | sim | grep `fetch(` em `src/`: só `src/services/api.js` (os outros acertos são `refetch()`) |
| 32 | sim | `api.test.js` (8 casos); `services/health.js` e `services/settings.js` passam por `validarContrato` |
| 33 | sim | `sessao.test.js` (6 casos); `App.jsx` renderiza `SemSessao` sem token; `main.jsx` captura antes do render |
| 34 | sim | `src/styles/tokens.css`; checagem por grep de cada token de docs/02; bloco `prefers-reduced-motion` |
| 35 | sim | grep de hex, rgb, hsl e `font-family` em `src/**/*.css` fora de `tokens.css`: nenhum |
| 36 | sim | `src/components/shared/{Botao,Campo,Selecao,Selo,Chave}`; testes dos cinco; `min-height: 32px` em botão, campo e seleção |
| 37 | sim | `src/components/layout/LayoutApp.jsx`; anel de foco em `global.css` (`:focus-visible`); NavLink é âncora nativa |
| 38 | sim | `PaginaInicio.test.jsx` (4 casos: carregando, sem workspace, com workspace, erro e tentar de novo) |
| 39 | sim | `PaginaConfig.test.jsx` (6 casos: carga, erro junto do campo, sucesso, teto inválido, erro geral, erro de carga) |
| 40 | sim | `src/mensagens.js`; páginas, layout e atoms leem só de lá |
| 41 | sim | grep `style=` em `src/`: nenhum |
| 42 | sim | `vitest.config.js` com projetos `server` e `web`; cobertura listada acima |
| 43 | sim | grep `console.log` fora de `server/index.js` e `server/cli/`: nenhum; grep `\bTODO\b`: nenhum |
| 44 | sim | `README.md` Estado, Rodar e Mapa; `memory/decisions.md` com três entradas de 2026-09-02 |
| 45 | sim | `docs/07_APIS/README.md` Autenticação local e códigos; `docs/11_SEGURANCA/README.md` C2 |

### Desvios do spec, todos registrados

- `npm run forge` passa `--dev` ao servidor, que então nunca serve `dist/`. `npm start` serve o
  build. Motivo: um build antigo em `dist/` não pode sequestrar o dev server. `INSTALACAO.md` atualizado.
- Fallback do SPA só devolve `index.html` para caminho sem extensão; asset ausente é 404.
- `FORGE_HOME` aceita `~` no início.
- Códigos novos (`FORGE_NOT_FOUND`, `FORGE_INTERNAL`, `FORGE_CONFIG`, `FORGE_PORT_IN_USE`,
  `FORGE_OFFLINE`, `FORGE_CONTRACT`) registrados em `docs/07`.
- Tokens `--forge-leading-*` e `--forge-focus-ring` registrados em `docs/02`.

### Correções feitas durante o review

- Checagem de `..` no workspace passou a rodar antes do `normalize`, que escondia o segmento.
- Teste do `beforeEach` devolvia o mock e o Vitest o tratava como cleanup (travava 10s). Corrigido.
- Asserção de `mutationFn` ajustada ao segundo argumento que o TanStack Query v5 passa.

### Pendências que exigem decisão do Matheus

Nenhuma. Ficam como observação, não como bloqueio: React 19 e React Router 7 já existem, mas a
documentação fixa React 18 e Router v6; mudar exige ADR. O tema claro está no schema (`tema`),
sem renderização, conforme a Fase 5.

✅ feito. Todos os 45 critérios de aceite cobertos, sem ressalvas.
