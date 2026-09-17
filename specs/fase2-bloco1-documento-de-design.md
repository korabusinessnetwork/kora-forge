# Fase 2, bloco 1, documento de design e contrato

> Spec do loop `spec → build → review`. A auditoria critério a critério vira a seção 7 deste
> mesmo arquivo, e o bloco só é declarado feito quando todos os critérios têm sim com evidência.

## 1. Escopo

A camada que os outros seis blocos da Fase 2 assumem. **Sem UI nenhuma.**

1. **ADR-009**, serialização do documento de design. Escrita antes do código, porque é ela que
   decide o formato. Já está em `docs/08_DECISOES/adr-009-serializacao-do-design.md`.
2. **Contrato em Zod**, `shared/schemas/design.js`: tokens, páginas, regiões e componentes,
   estrito nas duas pontas.
3. **Serviço e rotas**: `GET /projects/:id/design`, `POST /projects/:id/design` e
   `GET /projects/:id/design/versoes`, espelhando o que o blueprint já faz.
4. **O documento entra no hash do plano**, para redesenhar invalidar plano aprovado.
5. **Projeto sem documento de design continua nascendo como hoje**, byte a byte.

## 2. Fora de escopo

Painel de tokens (bloco 2), catálogo de componentes (bloco 3), canvas (bloco 4), etapa do wizard
(bloco 5), exportação real para `tokens.css` e JSX (bloco 6), diff (bloco 7).

Neste bloco o catálogo ainda não existe, então o `tipo` de um componente é validado como formato,
não contra um catálogo. A validação contra catálogo entra no bloco 3 e a spec de lá herda esta.

## 3. Arquivos afetados

| Arquivo | Dono | O que muda |
|---|---|---|
| `docs/08_DECISOES/adr-009-serializacao-do-design.md` | novo | a decisão |
| `shared/schemas/design.js` | novo | contrato do documento |
| `shared/schemas/design.test.js` | novo | testes do contrato |
| `server/modules/design/servico.js` | novo | versionamento e leitura |
| `server/modules/design/rotas.js` | novo | as três rotas |
| `server/modules/design/design.test.js` | novo | testes de rota e serviço |
| `server/app.js` ou equivalente | edição | registrar o módulo |
| `server/modules/gerador/servico.js` | edição | design entra no hash |
| `server/modules/gerador/rotas.js` | edição | passar o design ao gerador |
| `server/modules/runner/rotas.js` | edição | idem, na regeração do plano |
| `src/services/design.js` | novo | camada de serviços do front |
| `src/services/design.test.js` | novo | testes do serviço |
| `docs/07_APIS/README.md` | edição | as três rotas, campo a campo |
| `docs/04_MODELAGEM/README.md` | edição | ciclo de vida do documento |
| `docs/09_BACKLOG/fase2.md` | edição | bloco 1 entregue |
| `memory/decisions.md` | edição | decisões do bloco |

## 4. Critérios de aceite

### Contrato

1. `documentoDesignSchema` é estrito e cobre `{ catalogo: { versao }, tokens, paginas }`. Campo a
   mais é erro, não é ignorado em silêncio.
2. A hierarquia é árvore aninhada, com `filhos`, e **não existe** campo de ordenação separado. Um
   teste falha se `ordem` ou `paiId` aparecer no schema.
3. **Nenhum campo de coordenada.** Um teste tenta gravar `x`, `y`, `largura` e `topo` e os quatro
   são recusados, com o caminho do campo apontado.
4. A árvore tem profundidade máxima declarada e um documento mais fundo é recusado com mensagem
   legível, nunca com estouro de pilha.
5. `id` de página, região e componente é único dentro do documento. Id repetido é recusado
   nomeando o id, porque id duplicado quebra desfazer, seleção e diff de uma vez só.
6. `rota` de página é validada e única no documento. Duas páginas na mesma rota é recusa.
7. Os tokens usam o vocabulário do arquivo gerado (`cor.fundo`, `espaco`, `fonte.ui`), e um teste
   confere **correspondência exata nas duas pontas** entre a tabela de mapeamento do schema e as
   variáveis declaradas no `tokens.css` do template `design-tokens`: nenhum token do schema sem
   variável no template, e nenhuma variável do template sem token no schema. Token derivado de
   outros (hoje só `--anel-foco`, que é composto de `--cor-fundo` e `--cor-acento`) fica numa
   allow-list explícita e exportada, porque editá-lo direto deixaria o arquivo gerado
   internamente incoerente. Se qualquer um dos dois lados ganhar token novo sozinho, o teste falha.
8. Todo campo tem default, como no `respostasSchema`: documento parcial é válido, porque o Studio
   salva enquanto a pessoa desenha.

### Serviço e rotas

9. `GET /projects/:id/design` devolve `{ design }` com o documento ativo, ou `{ design: null }`
   quando não há. Ausência é estado normal, não 404.
10. `POST /projects/:id/design` cria versão n+1 ativa e desativa a anterior, na mesma transação.
11. `GET /projects/:id/design/versoes` lista as versões, mais nova primeiro, como o blueprint.
12. Projeto arquivado recusa o `POST` com 400 e mensagem que diz para restaurar antes.
13. Projeto inexistente responde 404 nas três rotas.
14. Corpo fora do contrato responde 400 com `FORGE_VALIDATION` e o caminho do campo.
15. Salvar emite o evento `design.salvo`, em `dot.case` e no passado, com a versão no payload.
16. As três rotas exigem a mesma guarda das outras: Host, token e `Origin`. Um teste confere,
    igual ao que já existe para as rotas de materialização.

### Plano e determinismo

17. O documento de design entra no hash do plano. Redesenhar muda o hash; um teste prova.
18. Projeto **sem** documento de design gera exatamente o mesmo plano de antes deste bloco:
    mesmo hash, mesmos arquivos, mesmo conteúdo. Este é o critério de não-regressão da Fase 1 e
    vale mais que qualquer outro aqui.
19. Gerar duas vezes com o mesmo documento produz o mesmo hash, byte a byte.
20. Aprovar um plano e depois salvar design novo faz o `POST /materializar` responder
    `FORGE_PLAN_STALE`, sem escrever nada.

### Camada de serviços do front

21. `src/services/design.js` é o único ponto que fala com essas rotas, valida a resposta com o
    schema compartilhado e devolve erro com código estável. Nenhum componente as chama.

### Padrões e verificação

22. Nomes de domínio em português, técnicos em inglês. SQL em `snake_case`, JS em `camelCase`.
23. Envelope `{ data, error, meta }` em tudo, validado por Zod antes de chegar na UI.
24. Nenhuma migration nova: a tabela `design_documents` já existe e não é alterada. Um teste
    confere que o schema do banco não mudou.
25. `npm test` e `npm run build` verdes no Windows, o ambiente primário (T-02).

### Documentação

26. `docs/07_APIS` descreve as três rotas campo a campo, incluindo o `design: null`.
27. `docs/04_MODELAGEM` descreve o ciclo de vida do documento e a relação com o blueprint.
28. `fase2.md` marca o bloco 1 como entregue. `memory/decisions.md` registra as decisões.

## 5. Edge cases conhecidos

- Projeto sem design, que é o caso comum hoje e tem que continuar sendo o caminho barato.
- Documento salvo com página sem nenhuma região: válido, é uma página em branco.
- Documento com catálogo de versão futura, vindo de um Forge mais novo: recusa com mensagem.
- Dois `POST` seguidos sem mudança: versiona mesmo assim, ou não? **Decisão**: só versiona quando
  o payload muda, igual ao blueprint, senão o histórico enche de versão idêntica.
- Projeto materializado que ganha design depois: permitido, e é o que o bloco 7 vai diffar.
- A tabela `design_documents` tem `tokens_json` e `paginas_json`, e **não tem coluna `ativo` nem
  coluna de catálogo**. Duas consequências, ambas deliberadas para não abrir migration:
  ativo é derivado, a versão ativa é a de maior número; e `paginas_json` guarda a parte estrutural
  inteira do documento, `{ catalogo, paginas }`, não só o array de páginas.

## 6. Definição de "aprovado sem ressalvas"

Os 28 critérios com sim e evidência nomeada, `npm test` e `npm run build` verdes no Windows, e
validação com o **produto real**: `npm run forge`, um projeto criado, `POST` de um documento de
design, plano gerado antes e depois, provando na mão que o hash muda e que o projeto sem design
continua gerando o mesmo plano de antes.

## 7. Auditoria, critério a critério

Feita em 2026-09-05, depois de `npm test` (63 arquivos, 550 testes) e `npm run build` verdes no
Windows 11, e depois de rodar o produto real (`node server/index.js --dev`, API em `127.0.0.1:7337`).

Legenda das evidências: `arquivo` para código, `"nome do teste"` para teste automatizado, e
**produto real** para o que foi conferido com o servidor rodando.

### Contrato

| # | Critério | Sim | Evidência |
|---|---|---|---|
| 1 | schema estrito com `{ catalogo, tokens, paginas }` | sim | `shared/schemas/design.js:documentoDesignSchema`, todo nível em `z.strictObject`. `"é estrito nas duas pontas: campo a mais é erro, não é ignorado em silêncio"` cobre raiz, página, nó e grupo de token |
| 2 | árvore aninhada, sem campo de ordenação | sim | `noSchema` tem `filhos`, e nada de `ordem`/`paiId`. `"a hierarquia é árvore aninhada, sem campo de ordenação nem ponteiro para o pai"` recusa `ordem`, `paiId`, `parentId` e `indice`. `"a ordem dos irmãos é a ordem do array, e trocar a ordem muda o documento"` |
| 3 | nenhuma coordenada, com o campo apontado | sim | `"não aceita coordenada nenhuma: posição é a ordem do array, não um número (ADR-009)"` recusa `x`, `y`, `largura` e `topo`, cada um com caminho completo. **Produto real**: `POST` com `x` e `y` respondeu 400 com `paginas.0.regioes.0.x` e `paginas.0.regioes.0.y` |
| 4 | profundidade máxima com mensagem legível | sim | `PROFUNDIDADE_MAXIMA = 6`, checado em `superRefine` (recursão própria, não estouro de pilha). `"aceita 6 níveis e recusa o seguinte com mensagem legível"` confere o texto `"a árvore desce 7 níveis e o máximo é 6"` |
| 5 | `id` único no documento inteiro, nomeando o id | sim | `"id repetido é recusado nomeando o id, em qualquer nível da árvore"`: irmãos, pai e filho, página e componente, e duas páginas |
| 6 | rota validada e única | sim | `"rota é validada e única: duas páginas na mesma rota é recusa"`, 4 rotas válidas e 6 inválidas. **Produto real**: duas páginas em `/` responderam `duas páginas na mesma rota: /` |
| 7 | vocabulário do arquivo gerado, correspondência exata nas duas pontas | sim | `listarTokens()` é a tabela. `"todo token do schema existe no tokens.css do template"`, `"toda variável do tokens.css existe no schema, fora as derivadas da allow-list"`, `"a allow-list de derivadas é decisão explícita, e o que está nela é composto de outros"` (`--anel-foco` tem `var(--` na definição), `"a tabela de mapeamento traduz caminho do documento para variável do arquivo gerado"`, `"o valor padrão de cada token é o mesmo que está no template hoje"` e o mesmo para o bloco de tema escuro |
| 8 | todo campo tem default | sim | `"documento vazio é válido e vira defaults: o Studio salva enquanto a pessoa desenha"`. Na rota, `"documento parcial é aceito e sai completo"`: `POST` com `{}` responde 200 com a paleta inteira. Os grupos usam `prefault`, não `default`, senão o Zod 4 devolveria `{}` cru |

### Serviço e rotas

| # | Critério | Sim | Evidência |
|---|---|---|---|
| 9 | `GET` devolve o ativo ou `design: null`, sem 404 | sim | `"projeto sem design responde design null: ausência é estado normal, não 404"` e `"devolve o documento ativo, com tokens e páginas de volta inteiros"`. **Produto real**: `{"design":null}` com 200 |
| 10 | `POST` cria n+1 e a anterior sai de ativa | sim | `"cria versão n+1 e a anterior sai de ativa, com o histórico inteiro preservado"`, conferindo também as duas linhas em `design_documents` |
| 11 | `versoes` lista da mais nova para a mais antiga | sim | mesmo teste: `[[2, true], [1, false]]`, validado por `listaVersoesDesignSchema` |
| 12 | projeto arquivado recusa com 400 mandando restaurar | sim | `"projeto arquivado recusa com 400 e mensagem que manda restaurar"`. **Produto real**: `"Projeto arquivado. Restaure antes de editar o design."` |
| 13 | projeto inexistente responde 404 nas três rotas | sim | `"projeto inexistente responde 404 nas três rotas"`. **Produto real**: 404 em `/api/projects/nao-existe/design` |
| 14 | corpo fora do contrato: 400, `FORGE_VALIDATION`, caminho do campo | sim | `"corpo fora do contrato responde 400 FORGE_VALIDATION com o caminho do campo"`, com `paginas.0.regioes.0.x`, `paginas.0.rota` e `tokens.cor.fundo`. Para isso o `formatarIssues` passou a quebrar `unrecognized_keys` em uma issue por campo, com mensagem em português |
| 15 | evento `design.salvo` com a versão | sim | `"emite design.salvo com a versão, e não emite quando nada mudou"`: um único evento, payload `{ versao: 1, paginas: 1, catalogoVersao: 1 }` |
| 16 | mesma guarda das outras rotas | sim | `"as três rotas de design exigem a mesma guarda das outras"`: sem token, com `Origin` de fora e com `Host` de fora, tudo 401, em `GET` e `POST`. **Produto real**: chamada sem token respondeu 401 |

### Plano e determinismo

| # | Critério | Sim | Evidência |
|---|---|---|---|
| 17 | o documento entra no hash | sim | `server/modules/gerador/servico.js`, campo `design` no insumo. `"salvar design muda o hash, e o mesmo design gera sempre o mesmo hash"`. **Produto real**: `sha256:40f63c6c…` sem design virou `sha256:3cbb20eb…` depois do `POST` |
| 18 | projeto sem design gera o mesmo plano de antes do bloco | sim | Medido, não presumido: o hash do plano do preset `criar-site` foi calculado no commit anterior (`a037ba6`, com as mudanças fora da árvore) e de novo depois do bloco, e deu `sha256:175a2bf0…` nos dois. Está congelado em `"projeto sem design gera o mesmo plano de sempre, e o hash não muda por causa deste bloco"`. A chave `design` só entra no insumo quando existe documento, nunca como `design: null`. **Produto real**: o projeto `Epsilon Sem Design` materializou inteiro, 33 arquivos, `git init`, `npm install` e `npm run build` verdes, e o dev server do projeto gerado respondeu 200 |
| 19 | mesmo documento, mesmo hash | sim | mesmo teste, gerando duas vezes. **Produto real**: dois `POST /plano` seguidos deram o mesmo hash |
| 20 | aprovar e redesenhar responde `FORGE_PLAN_STALE` sem escrever | sim | `"aprovar o plano e depois salvar design faz materializar responder FORGE_PLAN_STALE sem escrever nada"`, conferindo que a raiz não existe no disco. **Produto real**: 409 `FORGE_PLAN_STALE` e nenhuma pasta criada |

### Camada de serviços do front

| # | Critério | Sim | Evidência |
|---|---|---|---|
| 21 | `src/services/design.js` é o único ponto que fala com essas rotas | sim | `src/services/design.js`, cinco testes em `design.test.js` (resposta nula, contrato inválido virando `FORGE_CONTRACT`, `POST`, id escapado na URL, erro da API virando `ErroApi` com código estável). A guarda de arquitetura `"nenhum componente, feature ou hook chama fetch ou abre WebSocket direto"` continua verde |

### Padrões e verificação

| # | Critério | Sim | Evidência |
|---|---|---|---|
| 22 | nomes de domínio em português, técnicos em inglês | sim | `criarServicoDesign`, `documentoDesignSchema`, `listarVersoes`, `salvar`, `paraRegistro`; SQL em `snake_case` (`tokens_json`, `paginas_json`, `project_id`), JS em `camelCase` |
| 23 | envelope `{ data, error, meta }` validado por Zod | sim | as três rotas declaram `schemaSaida`, exigido pelo hook `preSerialization` do `server/app.js`. **Produto real**: toda resposta trouxe `data`, `error` e `meta` |
| 24 | nenhuma migration nova | sim | `"o bloco não abriu migration: a mesma tabela do schema inicial, coluna por coluna"` confere que só `20260902_schema_inicial.sql` encosta em `design_documents`, e que as seis colunas são as de sempre. `"espelha docs/04_MODELAGEM/schema.sql, tabela por tabela"`, que já existia, continua verde |
| 25 | `npm test` e `npm run build` verdes no Windows | sim | 63 arquivos, 550 testes, build em 484 ms, Windows 11 (T-02) |

### Documentação

| # | Critério | Sim | Evidência |
|---|---|---|---|
| 26 | `docs/07_APIS` com as três rotas campo a campo | sim | seção "Documento de design, `/api/projects/:id/design`", com tabela de campos, o que o contrato recusa e por quê, e o `design: null` na tabela de rotas |
| 27 | `docs/04_MODELAGEM` com o ciclo de vida | sim | seção "Ciclo de vida do documento de design (ADR-009)", com a comparação lado a lado com o blueprint, como o documento ocupa as colunas, e a invariante 1.1 sobre a ausência de coluna `ativo` |
| 28 | `fase2.md` e `memory/decisions.md` | sim | bloco 1 marcado como entregue com link para esta spec, o item aberto do bloco 2 sobre `--projeto-*` marcado como resolvido, e cinco decisões novas em `memory/decisions.md` |

### O que mudou fora do previsto na seção 3

Duas mudanças que a spec não previa, ambas pequenas e ambas justificadas:

- **`server/lib/validar.js`**: `formatarIssues` passou a quebrar `unrecognized_keys` em uma issue
  por campo, com caminho completo e mensagem em português. Sem isso o critério 14 não teria como
  ser cumprido: o Zod devolve o caminho do **objeto** e o nome do campo só dentro de uma mensagem
  em inglês. Vale para toda rota da API local, não só para as de design.
- **`shared/schemas/design.js` usa `prefault`, não `default`**, nos grupos de token. No Zod 4 o
  valor de `default` volta cru, sem passar pelo schema, e um grupo omitido viraria `{}` em vez dos
  defaults de dentro. Pego por teste, não por leitura.

### Ressalvas

Nenhuma. O bloco entrega a camada que os outros seis assumem, e o critério que vale mais que os
outros, o 18, foi conferido das duas formas: hash medido antes e depois do bloco, e um projeto sem
design materializado de ponta a ponta no produto real.

Fica registrado, sem ser ressalva, que o `tipo` de um componente ainda é validado como formato e
não contra catálogo: é fora de escopo declarado na seção 2, e a spec do bloco 3 herda isso.
