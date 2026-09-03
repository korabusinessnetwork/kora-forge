# Spec, Fase 1, Blocos 2 e 3: presets builtin e Registry

> Origem: `docs/09_BACKLOG/mvp.md`, blocos 2 (Registry) e 3 (Presets). Loop `spec → build → review`.
> Data: 2026-09-02. Status: **aprovado sem ressalvas** (review em 2026-09-03, seção 7).
>
> Por que juntos: `projects.preset_id` é chave estrangeira obrigatória e o fluxo F-01 começa por
> "escolhe o menu". Um Registry sem presets carregados não cria projeto. O bloco 3 se resume a
> schema Zod mais carga dos três JSONs que já existem em `presets/`, então cabe aqui.

## 1. Escopo

Carregar os presets builtin do repositório no banco, validados por schema estrito, e expor o
Registry completo: listar, criar, abrir, renomear, arquivar e restaurar projeto, com blueprint
versionado (uma versão ativa por projeto) e retomada na etapa em que parou. No front, a tela
inicial vira o Registry, com estados vazio, carregando e erro, uma tela de novo projeto que parte
dos menus e uma tela de projeto.

## 2. Fora de escopo

- Wizard e edição do conteúdo do blueprint (bloco 4). Aqui o blueprint só nasce, é versionado e
  é reaberto na `etapaAtual`.
- Motor de regras (5), gerador (6), runner (7), painéis (8), ideias (9).
- Preset custom: `POST /presets`, `~/.kora-forge/presets/`, editor (Fase 5). Só builtin.
- Apagar projeto. Não existe rota `DELETE` (RN-01.5).
- Mudar o preset de um projeto existente (RN-02.5).

## 3. Arquivos afetados

`shared/`: `comandos.js` (whitelist global), `slug.js` (`gerarSlug`), `schemas/preset.js`,
`schemas/projeto.js`, `schemas/blueprint.js`.

`server/`: `modules/presets/{servico,rotas}.js`, `modules/projetos/{servico,rotas}.js`, `app.js`
(registro), `index.js` e `cli/init.js` (sincronizar presets), testes co-localizados.

`src/`: `services/api.js` (`enviar` para POST), `services/presets.js`, `services/projetos.js`,
`components/registry/{CartaoPreset,CartaoProjeto,ListaProjetos}/`, `features/registry/
{PaginaRegistry,PaginaNovoProjeto,PaginaProjeto}.jsx` e CSS, `features/sessao/SemSessao.jsx`
(movido), `App.jsx`, `components/layout/LayoutApp.jsx` (menu Projetos), `mensagens.js`. Remove
`features/inicio/` (a tela Início vira banner do Registry e versão na barra lateral).

Docs: `docs/07_APIS/README.md`, `docs/03_REGRAS_DE_NEGOCIO/README.md` (RN-01.2),
`docs/09_BACKLOG/mvp.md` (estado), `README.md`, `memory/decisions.md`.

## 4. Critérios de aceite

### Presets (bloco 3)
1. `shared/schemas/preset.js` define o contrato de `docs/03_REGRAS_DE_NEGOCIO/presets.md` como objeto estrito: chave desconhecida é rejeitada; `id` é slug; `versao` inteiro ≥ 1; `categoria` ∈ {site, aplicacao, api, automacao}; `etapas` sem repetição, contendo `identidade` e `materializar`; `comandos[].cmd` ∈ whitelist de `shared/comandos.js` (`git`, `npm`, `npx`, `node`, `supabase`); `comandos[].id` únicos.
2. Os três JSONs reais de `presets/` passam no schema (teste lê os arquivos).
3. `carregarPresetsBuiltin()` lê `presets/*.json` em ordem de nome; preset inválido lança `FORGE_VALIDATION` citando o arquivo, e boot e `forge:init` param com mensagem legível.
4. `sincronizarPresets(db, lista)` faz upsert por `id` com `origem = 'builtin'`: rodar duas vezes não duplica; JSON alterado atualiza `payload_json`, `versao` e `atualizado_em`; linha com `origem = 'custom'` não é tocada.
5. `GET /api/presets` devolve resumos `{ id, nome, descricao, categoria, icone, versao, origem, etapas }` ordenados por nome; `GET /api/presets/:id` devolve o preset completo; id desconhecido responde `404 FORGE_NOT_FOUND`.
6. Boot (`server/index.js`) e `forge:init` sincronizam os presets builtin antes de servir.

### Registry, servidor (bloco 2)
7. `shared/slug.js` `gerarSlug(nome)`: minúsculo, sem acento, só `[a-z0-9-]`, sem hífen nas pontas nem duplicado, no máximo 60 caracteres; vazio quando não sobra nada. Testado com acento, espaço, símbolo e vazio.
8. `POST /api/projects` com `{ nome, presetId }` (estrito) cria, em uma transação, o projeto (`status = rascunho`, `slug` derivado, `preset_versao` = versão atual do preset, `etapa_atual` = primeira etapa do preset, `caminho_disco = null`) e o blueprint v1 ativo `{ preset: { id, versao }, etapaAtual, etapasConcluidas: [], assumidas: [], respostas: {} }`; emite `projeto.criado` com `project_id`; devolve `{ projeto, blueprint }`.
9. `nome` vazio, só símbolos ou com mais de 80 caracteres responde 400 com issue em `nome`; `presetId` inexistente responde 400 com issue em `presetId`; slug já usado responde 400 com issue em `nome` citando o slug.
10. `GET /api/projects` lista sem arquivados por padrão, ordenada por `atualizado_em` decrescente; `?status=` filtra por um status válido (inclusive `arquivado`); `?busca=` filtra por nome ou slug sem diferenciar maiúsculas; status inválido responde 400.
11. Item da lista: `{ id, nome, slug, presetId, presetNome, presetVersao, status, etapaAtual, caminhoDisco, criadoEm, atualizadoEm }`, validado por `projetoResumoSchema`.
12. `GET /api/projects/:id` devolve `{ projeto, blueprint }` com o blueprint ativo (`versao`, `criadoEm`, `payload`); id desconhecido responde 404.
13. `PATCH /api/projects/:id` com `{ nome?, arquivado? }` (estrito): renomear muda `nome`, mantém `slug` e emite `projeto.renomeado`; `arquivado: true` põe `status = arquivado` e emite `projeto.arquivado`; `arquivado: false` devolve `materializado` quando há `caminho_disco` e `rascunho` quando não há, e emite `projeto.restaurado`; patch vazio responde 200 sem evento.
14. `POST /api/projects/:id/blueprint` recebe o blueprint completo (schema estrito): `preset` diferente do projeto responde 400; projeto arquivado responde 400; sucesso cria a versão n+1 ativa, desativa a anterior, atualiza `projects.etapa_atual` e `atualizado_em`, emite `blueprint.salvo` e devolve `{ projeto, blueprint }`.
15. `GET /api/projects/:id/blueprint/versoes` devolve `[{ versao, ativo, criadoEm }]` da mais nova para a mais antiga.
16. Invariante testado: depois de várias gravações há exatamente um blueprint ativo por projeto. Nenhuma rota apaga projeto.
17. Todo evento de projeto é gravado em `events` com `project_id` preenchido.

### Registry, front
18. `src/services/api.js` ganha `enviar` (POST). `services/presets.js` e `services/projetos.js` são os únicos a usar a camada para essas rotas e validam toda resposta com os schemas compartilhados.
19. Rota `/` é `PaginaRegistry`, com os quatro estados: carregando, erro com "tentar de novo", vazio (texto de próxima ação mais os `CartaoPreset` para começar) e lista de `CartaoProjeto`.
20. A lista tem busca (Campo) e filtro de status (Selecao com "ativos" como padrão Kora, mais rascunho, pronto para materializar, materializado e arquivados), aplicados pela API via query string. Busca sem resultado mostra um estado "nenhum resultado" diferente do vazio inicial.
21. Registry mostra um aviso com link para Configurações quando o workspace não está configurado (via `useHealth`).
22. `PaginaNovoProjeto` (`/novo`): grade de `CartaoPreset`; escolher um abre o formulário com nome e microtexto mostrando o slug ao vivo via `gerarSlug`; erro do servidor aparece junto do campo; sucesso navega para `/projetos/:id`.
23. `PaginaProjeto` (`/projetos/:id`): nome, `Selo` de status, preset (nome e versão), etapa atual, caminho em `Chave` quando existe; renomear inline; arquivar ou restaurar; lista de versões do blueprint; projeto inexistente vira estado de erro com link de volta ao Registry.
24. `CartaoPreset`, `CartaoProjeto` e `ListaProjetos` em `src/components/registry/<Nome>/`, um por arquivo, CSS Module co-localizado, só tokens.
25. Barra lateral com "Projetos" (`/`) e "Configurações". `features/inicio/` removida; `SemSessao` em `features/sessao/`.
26. Textos novos em `mensagens.js`; sem `fetch` fora de `api.js`; sem `style=`; sem cor literal; sem `console.log` fora de `server/index.js` e `server/cli/`.
27. Testes cobrindo 1 a 5, 7 a 17, 18 (services), 19 a 23 (páginas) e 24 (componentes). `npm test` e `npm run build` verdes.

### Documentação
28. `docs/07_APIS/README.md` descreve corpo e semântica das rotas de presets, projetos e blueprint como implementadas. `docs/03_REGRAS_DE_NEGOCIO/README.md` RN-01.2 registra que o slug não muda ao renomear. `docs/09_BACKLOG/mvp.md` ganha seção de estado com os blocos entregues. `README.md` Estado atualizado. `memory/decisions.md` registra: blocos 2 e 3 juntos, slug imutável, regra de restauração.

## 5. Edge cases conhecidos

- Nome só com emoji ou símbolo gera slug vazio: 400 em `nome`.
- "Meu App" e "meu-app" geram o mesmo slug: o segundo recebe 400 citando o slug.
- Renomear para um nome cujo slug já existe é permitido, porque o slug não muda.
- Blueprint com `preset.versao` diferente da do projeto: 400 (trocar preset exige projeto novo).
- `?status=` vazio equivale ao padrão (sem arquivados).
- Projeto arquivado: a tela mostra "restaurar" e o servidor recusa salvar blueprint.
- Id malformado em `/projects/:id`: 404, sem vazar detalhe.
- Preset com comando fora da whitelist no repositório: o boot para, não sobe pela metade.

## 6. Definição de "aprovado sem ressalvas"

Os 28 critérios com sim e evidência, `npm test` e `npm run build` verdes, sem `TODO`, sem
`console.log` fora do CLI, sem `fetch` fora da camada de serviços, `docs/07` e `docs/03` batendo
com o código.

## 7. Review (2026-09-03)

Auditoria do build contra os 28 critérios. Suíte: `npm test`, 26 arquivos, 159 testes, tudo
verde. `npm run build` verde. Smoke test com o servidor real: `forge:init` sincronizou 3 presets;
criar, duplicado, renomear, blueprint v2, versões, arquivar e lista filtrada responderam como o
spec pede, com os eventos `projeto.criado`, `projeto.renomeado`, `blueprint.salvo` e
`projeto.arquivado` gravados com `project_id`.

| # | Sim? | Evidência |
|---|---|---|
| 1 | sim | `shared/schemas/preset.js`; `presets.test.js` "rejeita chave desconhecida, etapa repetida, etapa obrigatória ausente, comando fora da whitelist e id repetido" |
| 2 | sim | `presets.test.js` "os três presets reais do repositório passam no contrato" |
| 3 | sim | `presets.test.js` "preset inválido lança FORGE_VALIDATION citando o arquivo"; boot e `init` passam por `encerrarComErro` e `iniciar().catch` |
| 4 | sim | `presets.test.js` "insere na primeira vez, não duplica na segunda, atualiza quando o JSON muda e ignora custom" |
| 5 | sim | `presets.test.js` "GET /presets devolve resumos e GET /presets/:id o preset completo" (com 404) |
| 6 | sim | `server/index.js` e `server/cli/init.js` chamam `sincronizarPresets(db, carregarPresetsBuiltin())`; smoke "Presets builtin: 3 novos" |
| 7 | sim | `shared/slug.test.js` (8 casos mais o corte em 60) |
| 8 | sim | `projetos.test.js` "cria projeto em rascunho com slug, preset, primeira etapa e blueprint v1 ativo" |
| 9 | sim | `projetos.test.js` "nome vazio, só símbolo ou longo demais", "presetId inexistente", "slug já usado" |
| 10 | sim | `projetos.test.js` "lista sem arquivados, ordenada por atualização, e filtra por status e busca" (inclui `?status=` vazio, `%` escapado e status inválido) |
| 11 | sim | `projetoResumoSchema` como `schemaSaida` da lista; o mesmo teste valida com `listaProjetosSchema` |
| 12 | sim | `projetos.test.js` "devolve projeto com blueprint ativo e 404 para id desconhecido" |
| 13 | sim | `projetos.test.js` "renomear mantém o slug e emite evento; patch vazio não emite", "arquivar e restaurar" |
| 14 | sim | `projetos.test.js` "salvar cria versão n+1 ativa", "preset diferente, projeto arquivado, chave desconhecida e etapa inválida respondem 400" |
| 15 | sim | mesmo teste de salvar: `versoes` como `[v3 ativa, v2, v1]` |
| 16 | sim | mesmo teste: `count(ativo = 1) = 1`; "não existe rota para apagar projeto" |
| 17 | sim | `eventos(ctx, projeto.id)` filtra por `project_id` em todos os testes de evento |
| 18 | sim | `src/services/api.js` `enviar`; `services/presets.js` e `services/projetos.js` com `validarContrato`; `projetos.test.js` do front |
| 19 | sim | `PaginaRegistry.test.jsx` "carregando, depois vazio inicial", "lista os projetos", "erro mostra alerta" |
| 20 | sim | `ListaProjetos.test.jsx` (barra, padrão Kora, sem resultado); `PaginaRegistry.test.jsx` "leva filtros para a API", "busca sem resultado" |
| 21 | sim | `PaginaRegistry.test.jsx` "avisa quando o workspace não está configurado" |
| 22 | sim | `PaginaNovoProjeto.test.jsx` (slug ao vivo, navegação, `?preset=`, erro no campo) |
| 23 | sim | `PaginaProjeto.test.jsx` (dados, renomear, arquivar e restaurar, não encontrado, erro genérico) |
| 24 | sim | `src/components/registry/{CartaoPreset,CartaoProjeto,ListaProjetos}/`; testes dos três; grep de cor literal vazio |
| 25 | sim | `LayoutApp.jsx` com "Projetos"; `features/inicio/` removida; `features/sessao/SemSessao.jsx` |
| 26 | sim | greps de `fetch(`, `style=`, cor literal, `console.log` e `TODO`: nenhum fora do permitido |
| 27 | sim | 159 testes; `npm run build` verde |
| 28 | sim | `docs/07` rotas de presets, projetos e blueprint; `docs/03` RN-01.2 e RN-01.6; `mvp.md` seção Estado; `README.md`; `memory/decisions.md` com três entradas |

### Desvios do spec, todos registrados

- RN-01 ganhou o item 6 (restauração e recusa de blueprint em projeto arquivado), além do ajuste
  do item 2 previsto.
- `formatarData` virou função pura em `src/utils/`, com teste, em vez de helper dentro do cartão.
- O estado vazio do Registry virou o componente `VazioRegistry`, para manter um componente por arquivo.

### Correções feitas durante o review

- Um teste esperava achar `alfa-ren` por slug depois de renomear, mas o slug é imutável por
  decisão. O teste passou a provar a busca por slug com `beta-si`.

### Pendências que exigem decisão do Matheus

Nenhuma. Observação: o wizard (bloco 4) é o próximo, e a tela do projeto já avisa que ele ainda
não existe.

✅ feito. Todos os 28 critérios de aceite cobertos, sem ressalvas.
