# Spec, Fase 1, Bloco 6: Gerador

> Origem: `docs/09_BACKLOG/mvp.md`, bloco 6. Loop `spec → build → review`.
> Data: 2026-09-03. Status: **aprovado sem ressalvas** (review em 2026-09-03, seção 7).

## 1. Escopo

Transformar blueprint mais templates versionados em um **plano** de arquivos e comandos, sem tocar
no disco. O plano é o contrato entre planejar e executar (**ADR-002**): o runner do bloco 7 recebe
o plano aprovado, nunca a intenção original. Inclui o motor de template por placeholder, o
catálogo de templates, a resolução de valores a partir do blueprint, a detecção de conflito
contra o disco, o confinamento de caminho no workspace (controle C4) e o hash que amarra o plano
ao blueprint que o gerou.

## 2. Fora de escopo

- Escrita em disco e execução de comandos (bloco 7). Este bloco **planeja**, e nada mais.
- Painel de log ao vivo (8), gaveta de ideias (9), Studio, API Hub, copiloto.
- Diff visual de conflito (`VisualizadorDiff`). Aqui o conflito é declarado como ação
  `sobrescrever` com o tamanho dos dois lados; a comparação linha a linha fica para o bloco 8.
- Os templates `supabase-schema`, `sqlite-schema`, `servidor-local-fastify` e `seo-base`, que os
  presets já declaram. Eles entram no plano como **pendência declarada**, com o motivo.

## 3. Arquivos afetados

`shared/`: `schemas/plano.js` (plano, arquivo, comando, pendência), `template.js` (motor de
placeholder, puro), `valores.js` (mapa de valores a partir do contexto).

`templates/`: `README.md` e cinco templates (`fundacao-kora`, `vite-react`, `camada-de-servicos`,
`design-tokens`, `config-base`), cada um com `template.json` e a pasta `arquivos/`.

`server/`: `lib/caminhos.js` (confinamento no workspace, C4), `modules/gerador/{servico,rotas}.js`,
`app.js`, `index.js`, `cli/init.js` (validar templates no boot), `shared/erros.js`
(`FORGE_PLAN_BLOQUEADO`, `FORGE_TEMPLATE_AUSENTE`), testes.

`src/`: `services/plano.js`, `components/plano/{LinhaPlano,PainelPlano}/`,
`features/wizard/etapas/Materializar.jsx` (mostra o plano), `mensagens.js`, testes.

Docs: `docs/07_APIS/README.md`, `docs/03_REGRAS_DE_NEGOCIO/README.md` (RN-05),
`docs/05_FLUXOS/README.md` (F-02), `docs/06_COMPONENTES/README.md`, `docs/11_SEGURANCA/README.md`
(C4 como implementado), `docs/09_BACKLOG/mvp.md`, `README.md`, `memory/decisions.md`,
`memory/patterns.md` (P-03).

## 4. Critérios de aceite

### Motor de template
1. `shared/template.js` `renderizar(texto, valores)` substitui `{{CHAVE}}` pelo valor. Sem `eval`, sem `new Function`, sem condicional, sem laço e sem expressão: só troca de chave por valor (P-03, **ADR-007**).
2. Chave presente no texto e ausente no mapa lança `FORGE_TEMPLATE_INCOMPLETO` citando a chave e o arquivo. Placeholder que sobra na saída é bug, não pendência (aprendizado A-04).
3. `chavesUsadas(texto)` lista as chaves de um texto, para o teste que garante que todo template é resolvível pelo mapa de valores.
4. `{{` sem fechamento, chave com espaço ou minúscula não são tratados como placeholder e passam intactos, porque arquivo gerado pode conter chaves de outra sintaxe.

### Valores
5. `shared/valores.js` `montarValores(contexto, extras)` devolve um mapa **completo**: toda chave que qualquer template usa tem valor string, sempre.
6. Resposta em branco vira um texto honesto e visível (`_a definir_`), nunca string vazia silenciosa nem placeholder sobrando.
7. Lista vira lista markdown (`- item`), booleano vira `Sim`/`Não`, e a data é a do plano em ISO curto (`AAAA-MM-DD`), tudo determinístico.
8. Um teste cruza as chaves de todos os arquivos de todos os templates contra o mapa: chave sem valor reprova.

### Catálogo de templates
9. Cada template é uma pasta em `templates/<id>/` com `template.json` (`id`, `versao`, `descricao`, `ordem`) e a pasta `arquivos/`, cuja estrutura espelha o destino no projeto gerado.
10. `carregarTemplatesBuiltin()` lê os cinco templates, valida o manifesto por Zod e lança `FORGE_VALIDATION` citando o arquivo quando algo está fora do contrato. Boot e `forge:init` param nesse caso.
11. `fundacao-kora` gera `CLAUDE.md`, `README.md`, os seis arquivos de `memory/` e `docs/00_VISAO` a `docs/11_SEGURANCA`, mais `docs/08_DECISOES/adr-000-template.md` e `adr-001-stack-e-arquitetura.md`, todos preenchidos com o blueprint.
12. `vite-react` gera `package.json`, `vite.config.js`, `index.html`, `src/main.jsx` e `src/App.jsx`; `camada-de-servicos` gera `src/services/`; `design-tokens` gera `src/styles/tokens.css` e `global.css`; `config-base` gera `.gitignore` e `.env.example`.
13. `.gitignore` gerado cobre `.env`, `.env.local`, `node_modules` e artefatos de build (controle C5).
14. `ordem` do manifesto respeita RN-05.4: fundação, config, código. O plano sai ordenado por essa ordem e, dentro dela, por caminho.

### Plano
15. `POST /projects/:id/plano` devolve `{ hashBlueprint, raiz, arquivos, comandos, pendencias, totais }` e **não escreve nada**. Um teste garante que a pasta do workspace continua vazia depois de gerar o plano.
16. Cada arquivo traz `caminho` (relativo à raiz), `acao` ∈ {criar, sobrescrever, pular}, `tamanho`, `template` e `conteudo`. O conteúdo vai no plano porque o runner recebe o plano, nunca a intenção (**ADR-002**).
17. `acao` é `criar` quando o arquivo não existe, `sobrescrever` quando existe com conteúdo diferente, e `pular` quando existe com conteúdo idêntico. `totais.conflitos` conta os `sobrescrever`.
18. `comandos` vem do preset, com `id`, `cmd`, `args`, `obrigatorio`, `longaDuracao` e `timeoutMs`; todo `cmd` pertence à whitelist global, e comando fora dela reprova o plano com `FORGE_CMD_NOT_ALLOWED`.
19. Efeito `adicionar_arquivo` de hit que dispara agora inclui o template no plano; `remover_arquivo` o exclui. Hit `dispensado` ou `ignorado` não contribui com efeito nenhum.
20. Template pedido pelo preset ou por uma regra e ausente do catálogo vira `pendencias[]` com `{ tipo: 'template', item, motivo }`, e **não** derruba o plano.
21. `hashBlueprint` é `sha256` sobre a serialização estável do payload do blueprint mais id e versão do preset mais as versões dos templates usados. Mesmo blueprint gera o mesmo hash; qualquer mudança relevante muda o hash (princípio nº 2).
22. Gerar o plano duas vezes seguidas produz exatamente o mesmo resultado, byte a byte, com exceção de nada: a data entra pelo blueprint, não pelo relógio da chamada.

### Segurança
23. `server/lib/caminhos.js` `resolverNoWorkspace(raiz, relativo)` normaliza e recusa caminho absoluto, `..`, e qualquer resultado fora da raiz, com `FORGE_PATH_FORBIDDEN`. Testado com `../`, `..\\`, caminho absoluto POSIX e Windows, e caminho que só parece estar dentro (`/ws-outro`).
24. Symlink que aponta para fora do workspace é recusado ao inspecionar o disco.
25. Workspace não configurado responde `FORGE_VALIDATION` apontando `workspace`, com a mensagem que ensina a configurar.
26. Bloqueio aberto no motor de regras responde `FORGE_PLAN_BLOQUEADO`, listando os títulos dos bloqueios. Nenhum plano é gerado nesse caso.
27. Projeto arquivado responde 400.

### Front
28. `LinhaPlano` (molecule) mostra caminho em mono, ação com selo, tamanho legível e o template de origem.
29. `PainelPlano` (organism) agrupa por pasta, põe os conflitos no topo, mostra o total de arquivos, o total em bytes e a lista de comandos; sem conflito, não renderiza a seção de conflitos.
30. Pendências aparecem no painel, com o motivo, em vez de sumirem.
31. A etapa Materializar do wizard carrega o plano, com os quatro estados, e o erro de bloqueio aparece com a lista do que falta resolver.
32. O painel deixa claro que nada foi escrito e que a execução chega no bloco 7.

### Padrões e verificação
33. Sem `fetch` fora de `api.js`; sem `style=`; sem cor ou fonte literal fora de `tokens.css`; sem `console.log` fora do CLI; sem `TODO`; um componente por arquivo; nenhum `eval` ou `new Function` no motor de template.
34. `npm test` e `npm run build` verdes.

### Documentação
35. `docs/07` documenta a rota do plano e os dois códigos de erro novos. `docs/03` RN-05 registra o que o plano carrega e a regra de `pular` por conteúdo idêntico. `docs/05` F-02 marca os passos 3 e 4 como implementados. `docs/06` ganha `LinhaPlano` e `PainelPlano`. `docs/11` descreve C4 como implementado. `memory/patterns.md` P-03 aponta para o motor real.
36. `mvp.md`, `README.md` e `memory/decisions.md` atualizados, com a decisão sobre os quatro templates adiados.

## 5. Edge cases conhecidos

- Workspace configurado mas apagado do disco depois: `FORGE_VALIDATION` apontando `workspace`.
- Pasta do projeto já existe com conteúdo: o plano marca cada arquivo existente, e o resumo mostra quantos conflitos.
- Arquivo existente com conteúdo idêntico: ação `pular`, não `sobrescrever`. Regerar plano em projeto já materializado sem mudanças mostra zero conflitos e zero criações.
- Preset com template repetido na árvore: entra uma vez só.
- Regra que pede `remover_arquivo` de um template que o preset não inclui: sem efeito, sem erro.
- Blueprint sem nenhuma resposta: o plano é gerado, e os documentos saem com `_a definir_` visível.
- Nome de projeto com acento: o slug já é seguro, e o conteúdo dos docs mantém o nome com acento.
- Arquivo binário em template: não existe nesta fase; todo template é texto UTF-8.

## 6. Definição de "aprovado sem ressalvas"

Os 36 critérios com sim e evidência, `npm test` e `npm run build` verdes, o teste que prova que
nada foi escrito em disco, o teste que cruza chaves de template contra o mapa de valores, sem
`TODO`, sem `console.log` fora do CLI, sem `fetch` fora da camada de serviços, e `docs/03`,
`docs/05`, `docs/06`, `docs/07` e `docs/11` batendo com o código.

## 7. Review (2026-09-03)

Auditoria do build contra os 36 critérios. Suíte: `npm test`, 48 arquivos, 367 testes, tudo verde.
`npm run build` verde.

Validação além dos testes: com o servidor real, gerei o plano de um projeto Criar Site (32
arquivos, 35 kB, zero conflitos, duas pendências declaradas), confirmei que o workspace continuou
vazio, que nenhum placeholder sobrou e que dois planos seguidos são idênticos byte a byte.
Depois **escrevi o plano à mão** (o papel do bloco 7) e o projeto gerado instalou, `npm run build`
passou e `npm run dev` respondeu 200 com `<title>Site da Kora</title>`.

| # | Sim? | Evidência |
|---|---|---|
| 1 | sim | `shared/template.js`; `template.test.js` "troca a chave pelo valor"; grep sem `eval`/`new Function` |
| 2 | sim | `template.test.js` "chave sem valor lança FORGE_TEMPLATE_INCOMPLETO citando a chave e o arquivo" |
| 3 | sim | `chavesUsadas`; `template.test.js` "lista as chaves, sem repetir, em ordem" |
| 4 | sim | `template.test.js` "não trata como placeholder o que não é MAIÚSCULA entre chaves duplas" |
| 5 | sim | `shared/valores.js`; `valores.test.js` "toda chave do mapa é string" |
| 6 | sim | `valores.test.js` "resposta em branco vira um texto honesto e visível" (`_a definir_`) |
| 7 | sim | `valores.test.js` "lista vira lista markdown e booleano vira Sim ou Não" e "a data vem do plano, não do relógio" |
| 8 | sim | `valores.test.js` "templates contra o mapa de valores", **nos dois sentidos**: chave sem valor reprova, e chave no mapa que ninguém usa também |
| 9 | sim | `templates/<id>/template.json` mais `arquivos/`; `gerador.test.js` "carrega os cinco templates" |
| 10 | sim | `gerador.test.js` "manifesto fora do contrato", "id que não bate com a pasta", "template sem pasta arquivos"; boot e `init` chamam `carregarTemplatesBuiltin` |
| 11 | sim | `gerador.test.js` "a fundação carrega CLAUDE.md, memory/ e docs/00 a 11", com os dois ADRs |
| 12 | sim | 34 arquivos nos cinco templates; smoke listou os 32 do preset Criar Site |
| 13 | sim | `gerador.test.js` ".gitignore gerado cobre .env, node_modules e build", e `.env.example` sem valor nenhum |
| 14 | sim | `ordem` no manifesto (10, 20, 30, 35, 40); `gerador.test.js` "a ordem respeita fundação, config, código e depois o caminho" |
| 15 | sim | `gerador.test.js` "devolve o plano completo e não escreve nada em disco" (compara o conteúdo da pasta antes e depois, e checa que a raiz não foi criada) |
| 16 | sim | `arquivoPlanoSchema`; o mesmo teste confere os campos |
| 17 | sim | `gerador.test.js` "arquivo idêntico vira pular, diferente vira sobrescrever", com `tamanhoAtual` e os totais |
| 18 | sim | `montarComandos`; teste confere id, args, obrigatório, longa duração e timeout; `FORGE_CMD_NOT_ALLOWED` para comando fora da whitelist |
| 19 | sim | `templatesPedidos` soma `adicionar_arquivo` e subtrai `remover_arquivo`, ignorando hit dispensado ou ignorado; a pendência `testes/exemplo` no smoke vem de um efeito de regra |
| 20 | sim | `gerador.test.js` "template que o preset pede e o catálogo não tem vira pendência declarada" |
| 21 | sim | `hashBlueprint` com sha256 sobre a serialização estável; testes "gerar duas vezes produz exatamente o mesmo plano" e "mudar o blueprint muda o hash" |
| 22 | sim | mesmo teste, mais o smoke comparando dois planos: `data` idêntico (só `requestId` e `duracaoMs` do envelope mudam, como deve ser) |
| 23 | sim | `server/lib/caminhos.js`; `caminhos.test.js` com sete casos de recusa mais o caso `/ws-outro` |
| 24 | sim | `caminhos.test.js` "aceita symlink que aponta para dentro e recusa o que aponta para fora" |
| 25 | sim | `gerador.test.js` "sem workspace configurado" e "workspace apagado do disco" |
| 26 | sim | `gerador.test.js` "bloqueio aberto responde FORGE_PLAN_BLOQUEADO listando o que falta", conferindo também que nada foi escrito |
| 27 | sim | `gerador.test.js` "projeto arquivado responde 400 e projeto inexistente 404" |
| 28 | sim | `LinhaPlano.test.jsx` (criar, sobrescrever com tamanho de hoje, pular) |
| 29 | sim | `PainelPlano.test.jsx` (resumo, agrupamento, comandos, conflitos no topo comparando posição no DOM, seções ausentes quando não há nada) |
| 30 | sim | `PainelPlano.test.jsx` "pendências aparecem com o motivo, em vez de sumirem" |
| 31 | sim | `PaginaWizard.test.jsx` "plano na etapa Materializar": plano, workspace faltando com link para Configurações, erro genérico com tentar de novo |
| 32 | sim | `mensagens.plano.nadaEscrito` e `execucaoIndisponivel`, ambos verificados em teste |
| 33 | sim | greps limpos: sem `eval`, sem `fetch` fora da camada, sem `style=`, sem cor literal, sem `console.log` fora do CLI, sem `TODO`, um export default por arquivo |
| 34 | sim | 367 testes; build verde |
| 35 | sim | `docs/07` rota e dois códigos novos; `docs/03` RN-05.2, 5.3, 5.7 a 5.9; `docs/05` F-02 passos 3 e 4; `docs/06` `LinhaPlano` e `PainelPlano`; `docs/11` C4 como implementado; `memory/patterns.md` P-03 |
| 36 | sim | `mvp.md`, `README.md`, `templates/README.md` e `memory/decisions.md` com três entradas |

### Desvios do spec, todos registrados

- Dois módulos a mais que os previstos, ambos puros e testados: `shared/ordenar.js` (comparação
  determinística) e `src/utils/formatarBytes.js`.
- `shared/serializar.js` nasceu extraindo `serializarEstavel` de `src/features/wizard/comparar.js`,
  que agora reexporta. O wizard usa para saber se algo mudou, o gerador usa para o hash: uma
  implementação só.
- O plano ganhou `totais.pulados` além dos campos previstos, porque "32 arquivos" sem separar os
  que serão pulados diria menos do que parece.

### Correções feitas durante o review

- **Determinismo, pego por teste**: a ordenação usava `localeCompare`, que depende dos dados de
  ICU do sistema. O mesmo plano poderia sair em ordem diferente em duas máquinas, contra o
  princípio nº 2. Trocado por comparação por código de caractere em `shared/ordenar.js`, com teste,
  e o avaliador de regras foi migrado junto.
- **Chaves mortas, pegas por teste**: `MODELO`, `STACK_LINHA` e `PRESET_ID` estavam no mapa de
  valores sem nenhum template usá-las. Em vez de apagar, passaram a aparecer onde carregam
  informação real (a tabela de arquitetura e o prompt de handoff).

### Pendências que exigem decisão do Matheus

**Uma, registrada como R-07 em `memory/bugs.md`.** O `npm install` do projeto gerado falha nesta
máquina com `Cannot read properties of null (reading 'edgesOut')`. Investiguei até o repro mínimo:
qualquer `package.json` que dependa de `vitest@4.1.11` falha, sem nada do Forge envolvido. A mesma
falha atinge o **próprio Forge** num `npm install` do zero; o repositório só instala porque tem
`package-lock.json` versionado, e `npm ci` funciona.

Com `--legacy-peer-deps` o projeto gerado instala, builda e o dev server responde 200, o que
prova que o `package.json` gerado está correto. A decisão que precisa de você é o que o runner
(bloco 7) faz: detectar a falha e tentar o fallback, ou o preset declarar a flag. Não decidi
sozinho porque `--legacy-peer-deps` afrouxa a resolução de peers em todo projeto gerado, e isso é
escolha de padrão, não detalhe de implementação.

✅ feito. Todos os 36 critérios de aceite cobertos, sem ressalvas.
