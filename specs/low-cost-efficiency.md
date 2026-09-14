# Spec, Low Cost More Efficiency: skill, motor de custo e painel de eficiência

> Origem: pedido do dono em 2026-09-03 ("encontrar a melhor forma de operar com modelos de API
> com crédito, a melhor recomendação por custo de cada modelo, o sistema entender o intuito da
> aplicação para otimizar o gasto, e um dashboard interativo de qual modelo entrega eficiência
> com melhor custo"). Loop `spec → build → review`. Status: **aprovado sem ressalvas** (review em 2026-09-03, seção 7).

## 1. Escopo

Uma skill de projeto (`.claude/skills/low-cost-efficiency/`) que ensina o Claude Code a operar
o copiloto e qualquer chamada de API Anthropic no menor custo por tarefa concluída, apoiada por
um **motor determinístico de eficiência** (`shared/eficiencia/`) que: conhece o catálogo de
modelos e preços como dado versionado; infere a **intenção da aplicação** (site, aplicação web,
aplicação local, API, automação) a partir do preset ou de uma descrição; recomenda modelo,
esforço, cache e limites por etapa do copiloto; calcula custo de chamada; e ranqueia os modelos
pela eficiência observada em `copilot_calls`. Uma **página Eficiência** no Forge mostra isso
como dashboard interativo: filtro por intenção e período, indicadores de gasto contra o teto,
ranking dos modelos por sucesso por dólar, recomendação por etapa e um simulador de custo.

## 2. Fora de escopo

- O copiloto em si (Fase 4): nenhuma chamada real à API Anthropic é feita aqui. O que nasce é a
  régua que o copiloto vai usar e o registro que ele vai alimentar.
- Cofre, chave de API, teto automático que desliga o copiloto (ficam com a Fase 3 e 4).
- Buscar preço na internet em runtime. O catálogo é dado versionado no repositório, com data e
  fonte, atualizado à mão pela skill quando o dono pedir (restrição T-01, offline).
- Gráficos com biblioteca externa. Barras em SVG puro com tokens `--forge-*` (restrição T-03).
- Tema claro, i18n, exportação de relatório.

## 3. Arquivos afetados

Skill: `.claude/skills/low-cost-efficiency/SKILL.md`, `references/modelos.md`,
`references/perfis-de-intencao.md`, `references/alavancas.md`, `references/operacao-com-credito.md`,
`scripts/estimar.mjs`. Comando `.claude/commands/custo.md`. `.claude/README.md` (linha da skill).

Contrato: `shared/eficiencia/catalogo-modelos.json`, `shared/eficiencia/perfis.json`,
`shared/eficiencia/motor.js`, `shared/eficiencia/motor.test.js`, `shared/schemas/eficiencia.js`.

Servidor: `server/db/migrations/20260903_copilot_calls_eficiencia.sql`,
`docs/04_MODELAGEM/schema.sql`, `server/modules/eficiencia/servico.js`,
`server/modules/eficiencia/rotas.js`, `server/modules/eficiencia/eficiencia.test.js`,
`server/app.js` (registro do módulo), `docs/07_APIS/README.md` (rotas novas).

Front: `src/features/eficiencia/PaginaEficiencia.jsx` + `.module.css` + `.test.jsx`,
`src/features/eficiencia/RankingModelos.jsx` + `.module.css`,
`src/features/eficiencia/PainelRecomendacao.jsx` + `.module.css`,
`src/features/eficiencia/SimuladorCusto.jsx` + `.module.css` + `.test.jsx`,
`src/features/eficiencia/Indicador.jsx` + `.module.css`,
`src/services/eficiencia.js`, `src/App.jsx` (rota), `src/components/layout/LayoutApp.jsx`
(menu), `src/mensagens.js`.

Governança: `memory/decisions.md` (decisão leve), `README.md` (Estado).

## 4. Critérios de aceite

### Catálogo e motor (determinismo, P-01, P-03)
1. `catalogo-modelos.json` tem `versao`, `atualizado_em`, `fonte` e, por modelo: `id`, `nome`,
   `tier` (`frontier` | `equilibrio` | `economico`), preços por milhão (entrada, saída, escrita
   de cache 5 min, escrita de cache 1 h, leitura de cache), `contexto`, `saida_maxima`, níveis de
   esforço suportados, `forcas` e `evitar`. Validado por Zod ao carregar; catálogo inválido lança.
2. `perfis.json` descreve cada intenção (`site`, `aplicacao`, `local`, `api`, `automacao`) com
   `sinais` (palavras-chave), `categoria_preset` correspondente e, por etapa do copiloto do
   catálogo de `docs/10`, a recomendação: `modelo`, `escalar_para`, `esforco`, `max_tokens`,
   `cache` e `motivo`. Toda etapa de `docs/10` aparece em toda intenção.
3. `calcularCustoUsd(chamada, catalogo)` aplica os quatro medidores (entrada, saída, leitura de
   cache, escrita de cache) e o desconto de lote (50%); devolve número com 6 casas; modelo
   desconhecido lança `FORGE_VALIDATION`.
4. `inferirIntencao({ categoriaPreset, descricao })` prioriza a categoria do preset; sem preset,
   casa `sinais` na descrição (sem acento e sem caixa); sem sinal, devolve `aplicacao` com
   `confianca: 'baixa'`. Determinístico: mesma entrada, mesma saída.
5. `recomendar({ intencao, etapa })` devolve a recomendação do perfil mais o custo estimado de
   uma chamada típica no modelo recomendado e no modelo de escalada, e a lista ordenada de
   alternativas por custo. Etapa desconhecida lança `FORGE_VALIDATION`.
6. `ranquear(chamadas, catalogo)` agrega por modelo: chamadas, sucessos, taxa de sucesso, custo
   total, custo médio, custo por sucesso, sucessos por dólar, latência média, e `pontuacao`
   0 a 100 relativa ao melhor `sucessos por dólar`. Modelo sem sucesso tem pontuação 0 e custo
   por sucesso `null`. Modelo com menos de 5 chamadas leva `amostraPequena: true`. Ordem: pontuação
   decrescente, empate por custo médio crescente, depois id.
7. Toda função pura tem teste (Vitest, projeto `server`).

### Banco
8. Migration `20260903_copilot_calls_eficiencia.sql` adiciona a `copilot_calls` as colunas
   `intencao TEXT`, `tokens_cache_leitura INTEGER NOT NULL DEFAULT 0`,
   `tokens_cache_escrita INTEGER NOT NULL DEFAULT 0`, `lote INTEGER NOT NULL DEFAULT 0`,
   `duracao_ms INTEGER`. `docs/04_MODELAGEM/schema.sql` espelha (o teste de migrations continua verde).

### API local (guarda, envelope, Zod nas duas pontas)
9. `GET /api/eficiencia/catalogo` devolve o catálogo validado.
10. `GET /api/eficiencia/recomendacao?intencao=&etapa=` devolve a recomendação; `intencao` fora do
    enum ou `etapa` desconhecida respondem `400 FORGE_VALIDATION` apontando o campo. `etapa`
    ausente devolve todas as etapas da intenção.
11. `GET /api/eficiencia/painel?intencao=&periodo=` (`periodo` ∈ `mes`, `30d`, `tudo`, default
    `mes`) devolve `{ periodo, intencao, teto, totais, ranking, porEtapa }` com `totais.custoUsd`,
    `totais.chamadas`, `totais.sucessos`, `totais.percentualDoTeto` e `ranking` no formato do critério 6.
    Sem chamadas: `ranking` vazio e totais zerados (nunca erro).
12. `POST /api/eficiencia/chamadas` registra uma chamada em `copilot_calls`: corpo estrito
    (`etapa`, `modelo`, `estado`, tokens, `intencao?`, `projectId?`, `lote?`, `duracaoMs?`);
    o custo é calculado pelo servidor com o catálogo, nunca aceito do cliente; `modelo` fora do
    catálogo é 400; emite `copiloto.chamada.registrada` (fire-and-forget) e devolve a linha gravada.
13. Todos os schemas de entrada e saída vivem em `shared/schemas/eficiencia.js` e são usados pelo
    servidor e pelo front. Testes de rota cobrem 9 a 12, inclusive o cálculo de custo no servidor.

### Front (princípio nº 1: quatro estados, defaults, sem carga mental)
14. Rota `/eficiencia` e item de menu "Eficiência" no `LayoutApp`.
15. `PaginaEficiencia` tem os estados carregando, erro (com tentar de novo), vazio e sucesso. O
    vazio diz que o copiloto nasce desligado, que o ranking aparece quando houver chamadas, e deixa
    o simulador e a recomendação utilizáveis mesmo sem dado.
16. Filtros em uma linha acima dos painéis: intenção (default `aplicacao`, marcada como padrão
    Kora) e período (default mês atual). Mudar filtro refaz a consulta do painel.
17. Indicadores: gasto no período contra o teto (com percentual e barra de progresso), chamadas,
    taxa de sucesso, modelo mais eficiente. Um único número-herói: o gasto.
18. `RankingModelos` mostra uma barra por modelo (SVG, cor única `--forge-accent`, 4px de raio na
    ponta, ≤ 24px de espessura), rótulo com nome e pontuação, e tabela com as métricas do critério 6.
    Modelo com `amostraPequena` mostra selo "amostra pequena". Sem dado: estado vazio, não gráfico em branco.
19. `PainelRecomendacao` lista, para a intenção filtrada, cada etapa com modelo recomendado, escalada,
    esforço, `max_tokens`, cache e motivo, mais o custo estimado da chamada típica.
20. `SimuladorCusto` tem entradas com default (tokens de entrada, tokens de saída, chamadas por mês,
    cache ligado, lote) e mostra o custo mensal por modelo ordenado do mais barato ao mais caro, com o
    percentual do teto. Calcula no cliente com o mesmo `motor.js` (nada de `fetch` para simular).
21. Nenhum `fetch` fora de `src/services/`, nenhum `style=` inline, nenhuma cor literal fora de
    `tokens.css`, textos em `mensagens.js`. Testes: página (4 estados e troca de filtro) e simulador.

### Skill
22. `SKILL.md` tem `name`, `description` que dispara em pedidos sobre custo, modelo, tokens, crédito,
    orçamento ou eficiência de API (mesmo sem a palavra "skill"), e o fluxo: identificar intenção →
    consultar catálogo e perfis → aplicar alavancas gratuitas antes de trocar modelo → recomendar com
    número → medir no painel → registrar decisão. Menos de 300 linhas; detalhe fica nas references.
23. `scripts/estimar.mjs` roda com `node` sem dependência além do repositório e imprime, para uma
    intenção e etapa (ou descrição livre), a recomendação e a tabela de custo por modelo.
24. `.claude/commands/custo.md` invoca a skill com `$ARGUMENTS`.

### Governança
25. `docs/07_APIS/README.md` lista as rotas novas; `memory/decisions.md` registra a decisão de
    catálogo de preços como dado versionado; `README.md` cita a página Eficiência.
26. `npm test` e `npm run build` verdes. Nenhum `console.log` fora de `server/index.js`, `server/cli/`
    e `scripts/`. Nenhum `TODO`.

## 5. Edge cases conhecidos

- Custo com todos os tokens zero é 0, não `NaN`. Divisão por zero em taxa e custo por sucesso vira `0` ou `null`.
- Chamada com `estado` ≠ `sucesso` ainda custa (o token foi gasto) e entra no custo total, mas não nos sucessos.
- Período `mes` usa o mês civil em UTC; `30d` usa 30 × 24 h a partir de agora.
- `intencao` na chamada é opcional (projeto antigo sem intenção); no painel, filtro `intencao` só
  considera chamadas com aquela intenção, e `todas` considera todas.
- Catálogo com modelo removido: chamada antiga continua no ranking com o custo gravado; só o
  recálculo de custo novo exige modelo do catálogo.
- Simulador com valor vazio ou negativo trata como zero e avisa junto do campo.

## 6. Definição de "aprovado sem ressalvas"

Os 26 critérios respondidos com sim e evidência, `npm test` e `npm run build` verdes do zero, sem
`TODO`, sem `console.log` fora do permitido, sem `fetch` fora da camada de serviços, `docs/07` e
`docs/04` batendo com o código, e a skill funcionando de ponta a ponta com o copiloto desligado.

## 7. Review (2026-09-03)

Suíte: `npm test`, 21 arquivos, 163 testes, verde. `npm run build` verde. Dashboard conferido no
browser (Chromium headless) nos estados vazio e com 16 chamadas registradas pela API.

| # | Sim? | Evidência |
|---|---|---|
| 1 | sim | `catalogo-modelos.json`; `catalogoSchema` em `shared/schemas/eficiencia.js`; `motor.test.js` "carregam validados" |
| 2 | sim | `perfis.json`; `perfisSchema` exige as seis etapas por intenção (`porChave`); teste "cobrem toda etapa em toda intenção" |
| 3 | sim | `calcularCustoUsd`; testes "aplica os quatro medidores", "1 hora", "lote desconta 50%", "modelo fora do catálogo" |
| 4 | sim | `inferirIntencao`; testes de preset, acento e caixa, palavra inteira, empate, padrão determinístico |
| 5 | sim | `recomendar`; testes "alternativas ordenadas", "etapa desconhecida lança FORGE_VALIDATION" |
| 6 | sim | `ranquear`; teste "pontua por sucessos por dólar…" confere todas as métricas, amostra pequena e ordem |
| 7 | sim | `shared/eficiencia/motor.test.js`, 24 casos no projeto `server` |
| 8 | sim | `20260903_copilot_calls_eficiencia.sql`; `migrar.test.js` "espelha docs/04_MODELAGEM/schema.sql" verde |
| 9 | sim | `eficiencia.test.js` "devolve o catálogo versionado dentro do contrato" |
| 10 | sim | `eficiencia.test.js` "sem etapa devolve as seis etapas", "intenção fora do enum… 400 apontando o campo" |
| 11 | sim | `eficiencia.test.js` "sem chamadas devolve totais zerados", "agrega o período, ranqueia e filtra" |
| 12 | sim | `eficiencia.test.js` "registra com custo calculado no servidor… emite evento", "custo enviado pelo cliente… 400", "falha ao gravar o evento" |
| 13 | sim | `shared/schemas/eficiencia.js` importado por `server/modules/eficiencia/*` e `src/services/eficiencia.js` |
| 14 | sim | `src/App.jsx` rota `eficiencia`; `LayoutApp.jsx` NavLink "Eficiência" |
| 15 | sim | `PaginaEficiencia.test.jsx` "carregando e depois o estado vazio…", "erro ao carregar… tentar de novo", "com dados…" |
| 16 | sim | `PaginaEficiencia.test.jsx` "trocar período e intenção refaz a consulta", "intenção padrão Kora vem primeiro" |
| 17 | sim | `Indicador.jsx` com `heroi` só no gasto; medidor SVG com `role="progressbar"` (teste confere `aria-valuenow`) |
| 18 | sim | `RankingModelos.jsx`: SVG, `--forge-accent`, `rx=4`, altura 20px, `<title>` no hover, tabela completa, selo `amostra_pequena`; print `painel-com-dados` |
| 19 | sim | `PainelRecomendacao.jsx`; print mostra modelo, escalada, esforço, saída máxima, cache, custo e motivo por etapa |
| 20 | sim | `SimuladorCusto.jsx` usa `simularMensal` do `@shared` (sem fetch); `SimuladorCusto.test.jsx` (3 casos + `interpretarNumero`) |
| 21 | sim | grep `fetch(` em `src/`: só `api.js` (os demais são `refetch()`); grep `style=`: nenhum; grep de cor literal fora de `tokens.css`: nenhum; textos em `mensagens.eficiencia` |
| 22 | sim | `SKILL.md`, 118 linhas, descrição com gatilhos implícitos, fluxo em seis passos |
| 23 | sim | `scripts/estimar.mjs` rodado com `--descricao`, `--intencao --etapa`, `--todas`, `--simular` e erro de intenção (`FORGE_VALIDATION`, exit 1) |
| 24 | sim | `.claude/commands/custo.md` |
| 25 | sim | `docs/07_APIS/README.md` (4 rotas); `memory/decisions.md` (3 entradas de 2026-09-03); `README.md` Estado e Mapa |
| 26 | sim | `npm test` e `npm run build` verdes; grep `console.log` fora do permitido: nenhum; grep `TODO`: só a própria regra nesta spec |

### Desvios do spec, todos registrados

- `POST /api/eficiencia/chamadas` responde `201`, não `200`, por ser criação.
- `GET /eficiencia/recomendacao` com `etapa` devolve o mesmo formato de lista com um item, em vez de um objeto solto, para a rota ter um único `schemaSaida`.
- `Selo` ganhou os estados `economico`, `equilibrio`, `frontier`, `amostra_pequena` e `recomendado` (mapa de tom, sem mudar a API do atom).
- `src/services/api.js` ganhou `criar` (POST), que não existia porque nenhuma rota anterior criava recurso.

### Pendências que exigem decisão do Matheus

Nenhuma bloqueante. Observações: o catálogo v1 traz os preços de 2026-09-03 e precisa de revisão
trimestral (rotina em `references/operacao-com-credito.md`); a intenção `api` e `automacao` já
têm perfil, mas os presets correspondentes seguem no backlog.

✅ feito. Todos os 26 critérios de aceite cobertos, sem ressalvas.

