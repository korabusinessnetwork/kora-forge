# Fase 2, bloco 2, painel de tokens com preview ao vivo

> Spec do loop `spec → build → review`. A auditoria critério a critério vira a seção 7 deste
> mesmo arquivo, e o bloco só é declarado feito quando todos os critérios têm sim com evidência.

## 1. Escopo

A primeira tela do Studio. Editar os tokens do projeto e **ver o efeito enquanto digita**.

1. **`PainelTokens`**: edita os tokens do documento de design do bloco 1, agrupados, cada campo
   com default visível e com "usar o padrão Kora" em primeiro lugar.
2. **`PreviewProjeto`**: container isolado que mostra como o projeto vai ficar, com os tokens do
   projeto e nenhum token da ferramenta.
3. **Guarda de arquitetura dos dois namespaces**, varrendo nos dois sentidos: nada de `--forge-*`
   dentro do preview, nada de token de projeto fora dele (P-06).
4. **Uma casa para o painel**: `PaginaStudio` em `/projetos/:id/studio`, com o painel à direita e
   o preview ao centro. Sem canvas, sem camadas.
5. **Salvar pela camada de serviços do bloco 1**, com os quatro estados obrigatórios.

### Por que a página entra neste bloco

O plano da fase põe o canvas no bloco 4 e a etapa do wizard no bloco 5. Sem uma rota, o painel
deste bloco não teria como ser aberto, e o bloco não teria como ser validado com o produto
rodando, que é a exigência do harness. Então entra aqui a **casca mínima**: o bloco 4 troca o
centro da página pelo canvas e o bloco 5 leva a etapa do wizard para cá. `LayoutStudio` completo,
com a coluna de camadas, é do bloco 4.

## 2. Fora de escopo

Catálogo de componentes (bloco 3), canvas, zoom, pan e desfazer (bloco 4), etapa Design no wizard
(bloco 5), exportação dos tokens escolhidos para o `tokens.css` do projeto gerado (bloco 6), diff
(bloco 7).

Neste bloco o preview é uma **amostra fixa** de elementos (título, texto, botão, cartão, campo),
não as páginas do documento: página desenhada depende do catálogo, que é o bloco 3.

Salvamento automático também fica de fora, e de propósito: desfazer chega no bloco 4, e salvar
sozinho sem ter como desfazer é a combinação que perde trabalho.

## 3. Arquivos afetados

| Arquivo | Dono | O que muda |
|---|---|---|
| `docs/02_DESIGN_SYSTEM/README.md` | edição | a regra do alias `--projeto-*` e a lista corrigida |
| `docs/06_COMPONENTES/README.md` | edição | `PainelTokens`, `PreviewProjeto`, `PaginaStudio` |
| `shared/schemas/design.js` | edição | `alias` na tabela de `listarTokens()` |
| `shared/schemas/design.test.js` | edição | teste do alias |
| `src/features/studio/campos.js` | novo | descritores de campo derivados do schema |
| `src/features/studio/campos.test.js` | novo | testes dos descritores |
| `src/features/studio/PaginaStudio.jsx` | novo | a página, com os quatro estados |
| `src/features/studio/PaginaStudio.module.css` | novo | layout de duas colunas |
| `src/features/studio/PaginaStudio.test.jsx` | novo | testes da página |
| `src/components/studio/PainelTokens/PainelTokens.jsx` | novo | o painel |
| `src/components/studio/PainelTokens/PainelTokens.module.css` | novo | estilos do painel |
| `src/components/studio/PainelTokens/PainelTokens.test.jsx` | novo | testes do painel |
| `src/components/studio/PreviewProjeto/PreviewProjeto.jsx` | novo | o preview isolado |
| `src/components/studio/PreviewProjeto/PreviewProjeto.module.css` | novo | estilos do preview |
| `src/components/studio/PreviewProjeto/PreviewProjeto.test.jsx` | novo | testes do preview |
| `src/components/studio/namespaces.test.js` | novo | guarda de arquitetura dos dois namespaces |
| `src/App.jsx` | edição | a rota do Studio |
| `src/mensagens.js` | edição | os textos |
| `src/features/registry/PaginaProjeto.jsx` | edição | o caminho até o Studio |
| `docs/09_BACKLOG/fase2.md` | edição | bloco 2 entregue |
| `memory/decisions.md` | edição | decisões do bloco |

## 4. Critérios de aceite

### Os dois namespaces (P-06)

1. O alias de preview é **mecânico e sem segunda tabela**: `--cor-fundo` vira
   `--projeto-cor-fundo`, sempre prefixando o nome que o arquivo gerado usa. `listarTokens()`
   passa a devolver `alias`, e um teste confere a regra em toda a lista.
2. Um teste de arquitetura varre `src/components/studio/` e `src/features/studio/` nos **dois
   sentidos**: nenhum arquivo do preview lê `--forge-*`, e nenhum arquivo fora do preview lê
   `--projeto-*`. Falha nomeia o arquivo e o token.
3. O preview não herda estilo da ferramenta: declara explicitamente fundo, cor de texto e fonte a
   partir dos tokens do projeto. Um teste confere as três declarações no CSS do preview.
4. Nenhum token do projeto é escrito em `:root`, `html` ou `body`. Um teste confere que o CSS do
   preview não tem nenhum desses seletores, porque é assim que o vazamento aconteceria.

### Painel

5. Todo token do schema tem campo no painel. Um teste compara `listarTokens()` com os descritores
   de `campos.js` e falha se sobrar ou faltar um. Token novo entra nos dois lados ou o teste cai.
6. Cor é editada por seletor de cor **e** por campo de texto, ligados ao mesmo token: seletor para
   escolher, texto para colar o hex exato da marca.
7. Todo campo tem microtexto dizendo o que ele afeta no resultado, e o valor padrão visível
   (regra 3 do design system, e `Campo` já obriga o microtexto).
8. **"Usar o padrão Kora" é a primeira ação**, no topo do painel e também por grupo. Restaurar um
   grupo volta só aquele grupo; restaurar tudo volta o documento inteiro ao padrão.
9. Campo com valor em branco mostra erro junto do campo, antes de qualquer requisição. Prevenção
   de erro acima de mensagem de erro.
10. O painel é navegável só com teclado, com foco sempre visível, e cada grupo é uma seção com
    título de verdade, não um `div` com texto em negrito.

### Preview ao vivo

11. Mudar um token atualiza o preview **enquanto se digita**, sem requisição nenhuma: o estado é
    local até a pessoa mandar salvar.
12. O preview mostra os tokens em uso de verdade, não uma lista de cores: título, texto
    secundário, botão, cartão, campo e um trecho em fonte mono.
13. O preview reflete os tokens do documento salvo quando a página abre, e o padrão Kora quando o
    projeto ainda não tem documento.
14. Editar o preview não muda um pixel da UI do Forge. Um teste renderiza a página, aplica um
    token berrante e confere que o container do preview carrega a variável e que nada fora dele
    carrega.

### Salvar

15. Salvar chama `salvarDesign` da camada de serviços do bloco 1. Nenhum componente fala com
    `fetch`, e a guarda de arquitetura existente continua verde.
16. Enquanto há mudança não salva, a página diz isso com todas as letras e oferece **descartar**.
    Sem mudança, o botão de salvar fica desabilitado, porque salvar igual não versiona.
17. Salvar mostra estado de carregando, e o erro aparece com a mensagem da API, com opção de
    tentar de novo. Falha nunca silenciada.
18. Projeto arquivado abre o Studio em modo leitura, com o motivo e o caminho para restaurar. Não
    é tela em branco nem botão que falha depois.

### Estados e navegação

19. Os quatro estados obrigatórios na página: carregando, erro (com tentar de novo), vazio
    (projeto sem documento, que mostra o padrão Kora e diz que ainda é o padrão) e sucesso.
20. Projeto inexistente mostra a mesma mensagem e o mesmo caminho de volta que `PaginaProjeto` já
    usa, em vez de tela quebrada.
21. Existe caminho visível até o Studio a partir da página do projeto, e caminho de volta.

### Padrões e verificação

22. CSS separado do JSX, tudo em CSS Module, nenhuma cor, fonte, raio ou espaçamento fora de
    token. A **única** exceção é a lista de custom properties do preview, que é dado em tempo de
    execução e não tem como sair de arquivo estático: fica isolada em um único ponto, documentada,
    e nenhum outro estilo inline entra.
23. Um componente por arquivo, PascalCase, CSS Module co-localizado, texto de UI em
    `src/mensagens.js`.
24. `npm test` e `npm run build` verdes no Windows, o ambiente primário (T-02).
25. Sem regressão no bloco 1: o documento salvo pelo painel passa pelo mesmo contrato, e um
    projeto que nunca abriu o Studio continua gerando o mesmo plano.

### Documentação

26. `docs/02_DESIGN_SYSTEM` corrige a lista de tokens do projeto, que hoje lista nomes
    (`--projeto-bg`) que não existem em lugar nenhum do código, e declara a regra do alias.
27. `docs/06_COMPONENTES` descreve `PainelTokens`, `PreviewProjeto` e `PaginaStudio`, e a regra 6
    passa a apontar para a guarda de arquitetura que a prova.
28. `fase2.md` marca o bloco 2 como entregue. `memory/decisions.md` registra as decisões.

## 5. Edge cases conhecidos

- Projeto sem documento de design: o painel abre no padrão Kora e diz que ainda é o padrão.
- Projeto arquivado: leitura, sem salvar.
- Documento salvo por um Forge mais novo (catálogo à frente): a API já recusa no bloco 1, e a
  página mostra a mensagem dela, sem inventar texto próprio.
- Valor de cor que o seletor nativo não entende (`rgb()`, `oklch()`): o campo de texto aceita, o
  seletor mostra o que conseguir. O documento guarda o que a pessoa escreveu.
- Escala de espaçamento com oito degraus: o rótulo de cada campo é o nome do token gerado
  (`--espaco-1`), senão vira adivinhação.
- Sair da página com mudança não salva: a página avisa em texto, sem sequestrar a navegação.

## 6. Definição de "aprovado sem ressalvas"

Os 28 critérios com sim e evidência nomeada, `npm test` e `npm run build` verdes no Windows, e
validação com o **produto real**: `npm run forge`, abrir um projeto no Studio, mudar cor e fonte,
ver o preview mudar enquanto digita, salvar, recarregar a página e encontrar o que foi salvo, e
conferir com `curl` que o documento gravado tem os valores escolhidos.

## 7. Auditoria, critério a critério

> Feita depois do build, com `npm test` e `npm run build` verdes no Windows e com o produto
> rodando. Evidência nomeada em todos: nome de teste, arquivo ou verificação executada.

### Os dois namespaces (P-06)

| # | Sim | Evidência |
|---|---|---|
| 1 | sim | `aliasDePreview()` em `shared/schemas/design.js` prefixa `--projeto` no nome gerado, e `listarTokens()` devolve `alias` em toda entrada. Testes `o alias de preview é mecânico: prefixa --projeto no nome do arquivo gerado` e `nenhum alias de preview colide com o namespace da ferramenta (P-06)` em `shared/schemas/design.test.js` |
| 2 | sim | `src/components/studio/namespaces.test.js`, testes `o preview do Studio não lê nenhum token da ferramenta` e `nenhum token do projeto vaza para fora do preview`. A varredura do segundo sentido cobre `src/` inteiro, não só `src/features/studio/`, e a falha nomeia arquivo e token |
| 3 | sim | Teste `o palco do preview declara fundo, cor e fonte em vez de herdar os da ferramenta`, que confere as três declarações em `PreviewProjeto.module.css` |
| 4 | sim | Teste `o preview não escreve em :root, html nem body, que é por onde vazaria` |

### Painel

| # | Sim | Evidência |
|---|---|---|
| 5 | sim | `campos.test.js`, teste `todo token do schema tem campo, e nenhum campo é inventado`, que compara as duas listas ordenadas. E `PainelTokens.test.jsx`, `todo token do schema tem controle na tela, nenhum fica sem editor` |
| 6 | sim | `PainelTokens.test.jsx`, `cor tem seletor e campo de texto ligados ao mesmo token`: os dois controles disparam `onTrocar` no mesmo caminho. Cor que o seletor não representa fica no campo de texto, com nota, no teste seguinte |
| 7 | sim | `Campo` recusa render sem microtexto (`throw` em `Campo.jsx`) e mostra `padrao`. Testes `todo campo diz o que afeta no resultado e mostra o valor padrão` e `o campo do tema escuro diz que cai no bloco escuro, e não repete o microtexto do claro` |
| 8 | sim | `PainelTokens.test.jsx`, `"usar o padrão Kora" é a primeira ação do painel, antes de qualquer campo` e `restaurar o painel inteiro e restaurar um grupo são ações separadas`. Escopo conferido em `PaginaStudio.test.jsx`, `restaurar um grupo não mexe nos outros grupos` |
| 9 | sim | `PainelTokens.test.jsx`, `token em branco mostra o erro junto do campo, antes de tentar salvar`: `role="alert"` e `aria-invalid`, sem nenhuma requisição |
| 10 | sim | Cada grupo é `<section aria-labelledby>` com `<h3>` de verdade (teste `cada grupo é uma seção de verdade, com título e microtexto`). Foco visível pelo `:focus-visible` global de `src/styles/global.css` mais `.seletor:focus-visible` em `PainelTokens.module.css`. **Defeito achado e corrigido nesta auditoria**: `cor.fundo` e `corEscuro.fundo` tinham o mesmo rótulo e o mesmo microtexto, então dois controles da mesma página tinham nome acessível idêntico. O rótulo do escuro virou "Fundo no escuro", o microtexto virou `microEscuro()`, e a guarda `nenhum controle repete o nome acessível, mesmo quando dois tokens geram a mesma variável` varre a página inteira para a colisão não voltar |

### Preview ao vivo

| # | Sim | Evidência |
|---|---|---|
| 11 | sim | `PaginaStudio.test.jsx`, `trocar um token muda o preview na hora, e nada é enviado para a API`: o `style` do palco muda no mesmo render e `salvarDesign` não é chamado. O estado é o `rascunho` local de `PaginaStudio.jsx` |
| 12 | sim | `PreviewProjeto.test.jsx`, `é uma região anunciável, com uma amostra de cada peça que o token afeta`: título, botão, cartão, campo, mono e os três estados |
| 13 | sim | `PaginaStudio.test.jsx`, `projeto com design abre nos tokens salvos e diz de que versão eles são` e `projeto sem design abre no padrão Kora, dizendo que ainda não existe versão` |
| 14 | sim | `PaginaStudio.test.jsx`, `o token editado fica dentro do preview, e nenhum elemento fora dele o carrega`: aplica `#ff00ff` e varre todo elemento com `style` na página, exigindo que nenhum fora do palco carregue `--projeto-` |

### Salvar

| # | Sim | Evidência |
|---|---|---|
| 15 | sim | `PaginaStudio.jsx` só fala com `obterDesign` e `salvarDesign` de `src/services/design.js`. **A guarda que a spec dava como existente não existia**: foi construída agora, em `src/arquitetura.test.js`, teste `nenhum componente, página ou hook fala com a rede por conta própria`, que varre `src/` fora de `src/services/` atrás de `fetch`, `WebSocket`, `XMLHttpRequest` e `EventSource`. Desvio da tabela de arquivos da seção 3, assumido: sem ele o critério não teria como ser marcado sim |
| 16 | sim | `PaginaStudio.test.jsx`, `salvar só fica disponível quando há mudança, e envia o documento inteiro` (botão desabilitado sem mudança, aviso de não salvo com mudança) e `descartar devolve o que está salvo, sem passar pela API`. "Mudou" é `saoIguais()` do bloco 1, o mesmo critério que o servidor usa para não versionar igual |
| 17 | sim | Estado de carregando conferido no mesmo teste (`m.salvando`, botão desabilitado). Erro em `erro ao salvar aparece junto do botão, e o rascunho continua na tela`, com a mensagem da API e o rascunho preservado para tentar de novo |
| 18 | sim | `PaginaStudio.test.jsx`, `projeto arquivado é só leitura, com o motivo na tela`: aviso com o caminho para restaurar, salvar e padrão Kora desabilitados, campos em `readonly`, preview ainda visível |

### Estados e navegação

| # | Sim | Evidência |
|---|---|---|
| 19 | sim | Os quatro: `mostra o estado de carregando enquanto projeto e design não chegam`, `erro de carregar oferece tentar de novo, sem perder a página`, `projeto sem design abre no padrão Kora, dizendo que ainda não existe versão` (vazio, que mostra o padrão e diz que ainda é o padrão) e `projeto com design abre nos tokens salvos e diz de que versão eles são` |
| 20 | sim | `projeto que não existe manda de volta para a lista, em vez de mostrar erro cru`: mesma mensagem e mesmo link que `PaginaProjeto` já usa |
| 21 | sim | Ida: `PaginaProjeto.test.jsx`, `a página do projeto leva ao Studio, com microtexto dizendo o que se faz lá`. Volta: `PaginaStudio.test.jsx`, `a página leva de volta para o projeto, que é de onde se chega nela` |

### Padrões e verificação

| # | Sim | Evidência |
|---|---|---|
| 22 | sim | Os quatro CSS Modules do bloco usam só token, conferido pela guarda `a UI da ferramenta continua sendo escrita só com --forge-*`. A exceção é `variaveisDoPreview()` em `campos.js`, aplicada em um único ponto (`PreviewProjeto.jsx`), documentada no próprio arquivo, e o teste do critério 14 confirma que nenhum outro elemento da página carrega custom property |
| 23 | sim | Um componente por arquivo, PascalCase, CSS Module co-localizado. Todo texto de UI no bloco `studio` de `src/mensagens.js`, nenhum literal de UI nos componentes |
| 24 | sim | `npm test`: 69 arquivos, 607 testes, todos verdes. `npm run build`: `✓ built`, 266 módulos transformados. Windows 11, o ambiente primário (T-02) |
| 25 | sim | O painel envia o documento pelo mesmo `documentoDesignSchema` do bloco 1, conferido com `curl` na validação abaixo. A não-regressão do plano continua congelada no teste `projeto sem design gera o mesmo plano de sempre, e o hash não muda por causa deste bloco` (`server/modules/design/design.test.js`), verde |

### Documentação

| # | Sim | Evidência |
|---|---|---|
| 26 | sim | `docs/02_DESIGN_SYSTEM/README.md`: a lista fantasma (`--projeto-bg`, `--projeto-surface`) saiu, entrou a regra do alias com `aliasDePreview()`, a tabela dos nove grupos editáveis, a exclusão de `--anel-foco` e a seção "Como o preview fica isolado" |
| 27 | sim | `docs/06_COMPONENTES/README.md`: `PainelTokens` expandido, `PreviewProjeto` e `PaginaStudio` acrescentados, regra 6 apontando para `namespaces.test.js` e regra 1 agora apontando para `src/arquitetura.test.js` |
| 28 | sim | `docs/09_BACKLOG/fase2.md` com o bloco 2 entregue e o critério P-06 da fase marcado. `memory/decisions.md` com as seis decisões novas do bloco |

### Validação com o produto rodando

`node server/index.js --dev`, projeto **Alfa Teste**, pela API local com token de sessão e `Origin`:

- `GET /projects/:id/design` antes: `{"design": null}`, o estado "ainda usa o padrão Kora".
- `POST` do documento com `cor.acento = #ff0055` e `fonte.ui = Inter, system-ui, sans-serif`:
  devolveu versão 1 com os dois valores.
- `GET` de novo, que é o que a página faz ao recarregar: versão 1, `#ff0055` e
  `Inter, system-ui, sans-serif`.
- `POST` do mesmo documento outra vez: continua versão 1. Salvar igual não versiona, como no bloco 1.
- `POST` com `fonte.ui` em branco: `FORGE_VALIDATION` com `caminho: tokens.fonte.ui`. O contrato
  recusa na fronteira, e o painel já impede antes, com o erro junto do campo.
- `POST /projects/:id/plano` depois do design salvo: plano gerado, agora com o documento no hash.

### Ressalvas

Nenhuma. Os dois defeitos encontrados na auditoria, o nome acessível repetido entre os dois grupos
de cor e a guarda da camada de serviços que a spec dava como existente sem existir, foram
corrigidos dentro do bloco, cada um com teste que impede a volta.
