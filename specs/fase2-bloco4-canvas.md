# Fase 2, bloco 4, canvas

> Spec do loop `spec → build → review`. A auditoria critério a critério vira a seção 7 deste
> mesmo arquivo, e o bloco só é declarado feito quando todos os critérios têm sim com evidência.

## 1. Escopo

O bloco 1 deu o documento, o 2 deu os tokens e o 3 deu o vocabulário. Falta a parte pela qual
alguém abre o Studio: **montar as páginas**. Hoje o `PainelTokens` edita `documento.tokens` e
`documento.paginas` fica sempre vazio, porque não existe nada na tela que crie uma página.

1. **O documento como estrutura editável.** Funções puras que criam, movem e removem página,
   região e componente, e que trocam prop. Sem React, testáveis sozinhas.
2. **Desfazer e refazer.** Editor sem desfazer é editor que dá medo de usar, e é o que permite
   experimentar sem confirmar cada passo.
3. **`PainelCamadas`**, a árvore da estrutura, navegável só com teclado.
4. **`PaletaItens`**, que oferece exatamente o que o catálogo aceita naquele ponto. Zero elemento
   livre: se o item não existe no catálogo, não aparece na paleta.
5. **`PainelPropriedades`**, montado a partir das props declaradas pelo item, cada campo com o
   rótulo e o microtexto que o catálogo já traz.
6. **`CanvasStudio`**, a página desenhada com os tokens do projeto, dentro do palco isolado
   (P-06), com zoom e seleção por clique.
7. **`LayoutStudio`**, a casca de três colunas: camadas à esquerda, canvas ao centro, propriedades
   e tokens à direita.
8. **Pendência do bloco 3 na tela**: documento que usa item que este Forge não tem abre inteiro,
   com o item nomeado, e o Studio impede a tentativa de salvar em vez de deixar o servidor recusar.

Este bloco é **inteiro no front**. Não há rota nova, schema novo nem migration: o bloco 3 já serve
o catálogo, o bloco 1 já grava o documento e a validação já mora no servidor. Que o bloco 4 caiba
sem tocar no backend é o sinal de que os três anteriores fecharam.

### O que "canvas com zoom, pan e snap" quer dizer aqui

O plano da fase descreve o canvas como "zoom, pan e snap, em DOM absoluto". O **ADR-009, decisão
2** já traduziu isso para o documento que existe: não há coordenada, "o snap é à grade da região,
não a pixel livre" e "mover um componente é reordenar um array". Então, em concreto:

- **Snap** é o encaixe na árvore. O destino de um item não é uma posição, é uma vaga entre irmãos,
  e quem decide se a vaga existe é o `aceita` do pai. Não há grade de pixels para prender nada.
- **Pan** é a rolagem do palco. Não existe modo de arrastar a superfície, porque não existe
  elemento solto para fugir do enquadramento: a página é uma pilha em fluxo, e o que passa do
  tamanho da moldura rola.
- **Zoom** é real e útil, para ver a página inteira de uma vez. Em degraus nomeados, não contínuo,
  porque degrau é operável por teclado e um valor arbitrário não é.
- **DOM, não canvas 2D**, como manda o ADR-005, e é o que permite o item na tela ser um componente
  React de verdade em vez de um desenho dele.

### Como o canvas desenha um item sem o gerador

O bloco 6 é que escreve JSX a partir do `fragmento.jsx`. O canvas precisa desenhar **agora**, e
havia três caminhos:

1. **Interpretar o fragmento no navegador.** Recusado. Compilar JSX em tempo de execução é
   `new Function` com outro nome, e isso é proibido pela constituição, além de mandar o código de
   geração para o front sem necessidade (o bloco 3 já decidiu não servir o fragmento).
2. **Um componente React por item, no front.** Fiel, porque o preview passa a ser o componente
   real, que é a promessa do ADR-005. O risco é o da própria fase: catálogo e renderizador saírem
   de sincronia.
3. **Uma caixa genérica com o nome do item.** Sem risco de sincronia e sem valor: seria o painel
   de camadas outra vez, em outra forma.

Escolhido o **2, com o risco neutralizado do mesmo jeito que no bloco 3**: uma guarda de
arquitetura confere que o conjunto de renderizadores é exatamente o conjunto de ids do catálogo, e
que cada renderizador consome exatamente as props que o item declara. Item novo no catálogo sem
renderizador derruba a suíte, e prop declarada que ninguém desenha também. Sincronia vira regra
mecânica, não intenção.

## 2. Fora de escopo

**Arrastar e soltar.** O plano da fase não pede, e a exigência que ele faz é a oposta: "navegação
por teclado de ponta a ponta". Como não há coordenada, arrastar só significaria reordenar e
reaninhar, que é exatamente o que os botões e as setas do teclado fazem. Construir o arrasto agora
seria um segundo caminho para a mesma ação, com o dobro de superfície e sem nada novo. Fica como
conforto para depois, sobre a mesma base.

Etapa Design no wizard (bloco 5), geração de arquivo a partir do desenho (bloco 6) e diff (bloco
7). O canvas produz documento; quem o transforma em disco é o 6.

Também fora: régua, guias, múltipla seleção, copiar e colar entre páginas, breakpoints e
responsividade além do que os tokens declaram, tema claro da ferramenta (Fase 5), e catálogo custom.

## 3. Arquivos afetados

Dono exclusivo por arquivo, como manda o harness.

| Arquivo | Dono | O que muda |
|---|---|---|
| `src/features/studio/documento.js` | novo | funções puras sobre páginas e árvore |
| `src/features/studio/documento.test.js` | novo | testes das funções puras |
| `src/features/studio/reducerStudio.js` | novo | estado do Studio: documento, seleção, desfazer e refazer |
| `src/features/studio/reducerStudio.test.js` | novo | testes do reducer, sem React |
| `src/components/layout/LayoutStudio/LayoutStudio.jsx` | novo | casca de três colunas |
| `src/components/layout/LayoutStudio/LayoutStudio.module.css` | novo | |
| `src/components/layout/LayoutStudio/LayoutStudio.test.jsx` | novo | |
| `src/components/studio/PainelCamadas/PainelCamadas.jsx` | novo | árvore da estrutura |
| `src/components/studio/PainelCamadas/PainelCamadas.module.css` | novo | |
| `src/components/studio/PainelCamadas/PainelCamadas.test.jsx` | novo | |
| `src/components/studio/PaletaItens/PaletaItens.jsx` | novo | o que dá para inserir aqui |
| `src/components/studio/PaletaItens/PaletaItens.module.css` | novo | |
| `src/components/studio/PaletaItens/PaletaItens.test.jsx` | novo | |
| `src/components/studio/PainelPropriedades/PainelPropriedades.jsx` | novo | props do que está selecionado |
| `src/components/studio/PainelPropriedades/PainelPropriedades.module.css` | novo | |
| `src/components/studio/PainelPropriedades/PainelPropriedades.test.jsx` | novo | |
| `src/components/studio/CanvasStudio/CanvasStudio.jsx` | novo | palco, zoom, seleção por clique |
| `src/components/studio/CanvasStudio/CanvasStudio.module.css` | novo | |
| `src/components/studio/CanvasStudio/CanvasStudio.test.jsx` | novo | |
| `src/components/studio/itens/<Item>.jsx` | novo | um renderizador por item do catálogo, nove |
| `src/components/studio/itens/itens.module.css` | novo | o CSS dos nove, só com `--projeto-*` |
| `src/components/studio/itens/PalcoProjeto.jsx` | novo | o palco isolado, extraído do `PreviewProjeto` |
| `src/components/studio/itens/PalcoProjeto.module.css` | novo | |
| `src/components/studio/itens/registro.js` | novo | id do catálogo → renderizador |
| `src/components/studio/itens/registro.test.jsx` | novo | a guarda de sincronia com o catálogo |
| `src/components/studio/PreviewProjeto/PreviewProjeto.jsx` | edição | passa a usar o `PalcoProjeto` |
| `src/components/studio/PreviewProjeto/PreviewProjeto.module.css` | edição | perde o palco, mantém a amostra |
| `src/components/studio/namespaces.test.js` | edição | a zona do projeto vira lista, não pasta única |
| `src/features/studio/PaginaStudio.jsx` | edição | reescrita sobre o `LayoutStudio` e o reducer |
| `src/features/studio/PaginaStudio.module.css` | edição | |
| `src/features/studio/PaginaStudio.test.jsx` | edição | testes da página inteira |
| `src/mensagens.js` | edição | textos do canvas, camadas, paleta e propriedades |
| `docs/02_DESIGN_SYSTEM/README.md` | edição | onde o palco isolado passa a morar |
| `docs/06_COMPONENTES/README.md` | edição | `CanvasStudio`, `LayoutStudio` e os novos painéis |
| `docs/08_DECISOES/adr-005-studio-editor-proprio.md` | edição | nota apontando o ADR-009 para snap e pan |
| `docs/09_BACKLOG/fase2.md` | edição | bloco 4 entregue, bloco 5 próximo |
| `memory/decisions.md` | edição | decisões do bloco |

## 4. Critérios de aceite

### O documento como estrutura editável

1. `documento.js` expõe funções puras que recebem o documento e devolvem outro, sem mutar o
   argumento: `adicionarPagina`, `removerPagina`, `moverPagina`, `trocarCampoDaPagina`,
   `adicionarNo`, `removerNo`, `moverNo` e `trocarProp`. Um teste congela o documento de entrada e
   confere que nenhuma delas o alterou.
2. `novoId(documento, tipo)` gera id único **no documento inteiro**, porque `documentoDesignSchema`
   trata id de página e id de nó no mesmo espaço e recusa repetido. A regra é `titulo`, `titulo-2`,
   `titulo-3`, determinística: mesmo documento e mesmo tipo dão sempre o mesmo id, sem sorteio nem
   relógio.
3. Página nova nasce com nome, id derivado do nome e rota derivada do nome, com `/` na primeira
   página. Colisão de id ou de rota é resolvida com sufixo, sem perguntar. Ninguém digita caminho
   nem identificador que o sistema saberia inferir (princípio nº 1).
4. `adicionarNo` cria o nó com **todas as props do item já preenchidas com o padrão do catálogo**,
   nunca com `props: {}`. O nó nasce válido, e inserir e salvar em seguida jamais é recusado por
   obrigatória ausente.
5. `moverNo` sobe, desce, entra no irmão anterior e sai para o avô. Movimento que produziria
   documento inválido, por `aceita` ou por `PROFUNDIDADE_MAXIMA`, é recusado pela própria função,
   que devolve o documento intacto. Prevenção de erro acima de mensagem de erro.
6. `ondePodeEntrar(itens, documento, selecao)` responde o que o catálogo permite inserir naquele
   ponto: região só no topo de uma página, componente só dentro de quem o declara em `aceita`. É a
   função que a paleta consome, então nunca aparece na tela um item que a validação recusaria.
7. Qualquer sequência de edições sobre o documento padrão termina em documento que
   `documentoDesignSchema` aceita, e um teste faz esse caminho de ponta a ponta.

### Desfazer e refazer

8. `reducerStudio` é um reducer puro sobre `{ documento, selecao, passado, futuro }`, exercitado
   nos testes sem montar componente nenhum.
9. Desfazer e refazer cobrem **tudo** o que muda o documento, tokens inclusive: o painel do bloco 2
   passa pela mesma história, porque é um documento só.
10. Edição consecutiva no mesmo campo vira **uma** entrada de história, sem timer e sem debounce:
    digitar um título é um desfazer, não vinte. A coalescência é por caminho do campo, e por isso é
    determinística.
11. `Ctrl+Z`, `Ctrl+Shift+Z` e `Ctrl+Y` funcionam de qualquer ponto do Studio, **exceto** com o
    foco dentro de campo de texto, onde o desfazer do navegador é o comportamento certo e
    sequestrá-lo quebraria a digitação.
12. Os dois botões ficam visíveis, desabilitados quando não há o que desfazer ou refazer, e dizem
    **o que** será desfeito ("Desfazer: adicionar Título"). Estado sempre visível.
13. Refazer é descartado assim que uma edição nova entra, que é o comportamento que todo editor
    tem e que evita ramificação silenciosa de história.

### Camadas

14. `PainelCamadas` é uma árvore (`role="tree"`) cujas raízes são as páginas, com região e
    componente abaixo. Estrutura é uma coisa só, e por isso é um widget só: não há barra de páginas
    separada disputando o mesmo trabalho.
15. Teclado completo: `↑` e `↓` andam pela árvore, `←` vai ao pai, `→` ao primeiro filho, `Enter` e
    `Espaço` selecionam, `Delete` remove, `Alt+↑` e `Alt+↓` reordenam entre irmãos, `Alt+←` e
    `Alt+→` tiram e põem um nível. Tabulação entra na árvore uma vez só (roving tabindex), como
    manda o padrão de árvore.
16. O foco é sempre visível, com o anel de foco da ferramenta, inclusive no item selecionado
    (regra 9 do design system).
17. Nó cujo tipo saiu do catálogo aparece **nomeado pelo tipo cru**, marcado como pendência, e
    nunca some da árvore (ADR-009, decisão 4).
18. Os quatro estados: carregando, vazio com a próxima ação ("nenhuma página ainda, criar a
    primeira"), erro e sucesso.

### Paleta

19. `PaletaItens` mostra exatamente o que `ondePodeEntrar` devolve para a seleção atual, cada item
    com o `nome` e o `microtexto` que o catálogo já traz. Nada de elemento livre, e nada de item
    que a validação recusaria.
20. Estado vazio nunca é tela em branco: quando nada entra naquele ponto, o painel diz por que e
    qual seleção aceitaria.
21. Inserir seleciona o nó recém-criado, para a ação seguinte continuar de onde a pessoa está, sem
    ter que procurar o que acabou de criar.

### Propriedades

22. `PainelPropriedades` monta os campos a partir das props declaradas pelo item: `texto` vira
    campo de texto, `numero` campo numérico, `booleano` chave e `opcao` seleção, cada um com o
    rótulo e o microtexto do catálogo e com o padrão visível.
23. Página selecionada edita nome e rota. Rota fora do formato ou repetida em outra página é
    avisada **no campo**, na hora, e não no salvar (regra 7 do design system).
24. Nó com tipo fora do catálogo não ganha formulário inventado: o painel diz que o item não existe
    mais neste Forge, mostra as props que estão gravadas como texto, e oferece remover.

### Canvas

25. `CanvasStudio` desenha a página selecionada com os tokens do documento, dentro do palco
    isolado. Clicar em um nó o seleciona, e o selecionado tem contorno visível. O contorno é da
    ferramenta e o conteúdo é do projeto, e os dois não se misturam.
26. Os nove itens do catálogo têm renderizador em `src/components/studio/itens/`, e a guarda
    `registro.test.jsx` confere, contra o catálogo real lido do disco, que o conjunto de
    renderizadores é **exatamente** o conjunto de ids e que cada renderizador consome exatamente as
    props declaradas. Item novo sem renderizador, ou prop declarada que ninguém desenha, derruba a
    suíte.
27. Zoom em degraus nomeados, com o valor na tela, operável por teclado como qualquer controle. Sem
    modo de arrastar a superfície e sem grade de pixel, pelos motivos da seção 1.
28. O centro alterna entre a página desenhada e a amostra de tokens do bloco 2, e a amostra é o que
    aparece enquanto não existe página nenhuma. O trabalho do bloco 2 não é jogado fora nem
    escondido.
29. A árvore desenhada no canvas é a mesma do documento, na mesma ordem, e um teste compara as duas
    para que "o que se vê é o que exporta" seja verificado e não prometido.
30. P-06 continua valendo com a guarda generalizada: a zona do projeto passa a ser
    `PreviewProjeto/` **mais** `itens/`, nenhum `--forge-*` entra lá e nenhum `--projeto-*` sai. O
    palco isolado passa a morar em um lugar só, usado pelo preview e pelo canvas, e continua sendo
    o único ponto do produto que monta estilo em tempo de execução.

### Salvar, pendência e leitura

31. Documento com pendência não pode ser salvo, e o Studio diz isso **antes** de a pessoa tentar:
    aviso no topo nomeando os itens ausentes e botão de salvar desabilitado com o motivo. O
    servidor recusaria de qualquer jeito; deixar a pessoa descobrir no clique seria mensagem de
    erro onde cabia prevenção.
32. Projeto arquivado continua somente leitura de ponta a ponta: não insere, não move, não remove e
    não edita prop, nem por teclado.
33. Recusa vinda do servidor aparece legível, uma linha por issue com a mensagem que já nomeia o
    item, nunca JSON cru na tela.

### Padrões e verificação

34. Nenhum componente novo chama API: tudo entra por props e callbacks, e a guarda
    `src/services/camadaDeServicos.test.js` continua verde. Nada de estilo fora de CSS Module, e
    nada de cor, espaço ou fonte fora de token.
35. `npm test` e `npm run build` verdes no Windows (T-02), sem regressão: os tokens continuam
    salvando como no bloco 2, o hash do plano não muda, e o wizard não é tocado.
36. `docs/02`, `docs/06`, `docs/09` e `memory/decisions.md` atualizados, mais a nota no ADR-005
    apontando o ADR-009 para o que "snap" e "pan" querem dizer neste documento.

## 5. Edge cases conhecidos

| Caso | Comportamento esperado |
|---|---|
| Documento sem página nenhuma | canvas mostra a amostra de tokens, camadas mostram o vazio com "criar a primeira página" |
| Página sem região | canvas mostra a página vazia com a próxima ação, não uma moldura muda |
| Remover uma região com filhos | pede confirmação nomeando quantos itens vão junto; remover folha não pede, porque desfazer resolve e confirmar tudo é atrito |
| Remover a página selecionada | seleção vai para a página anterior, ou para nenhuma se era a única |
| Mover que estouraria a profundidade | recusado na função, e a ação nem aparece habilitada |
| Item do catálogo sem renderizador | impossível: a guarda derruba a suíte antes de chegar na tela |
| Nó com tipo desconhecido no canvas | caixa nomeada pelo tipo cru, selecionável, sem inventar aparência |
| Rota repetida entre páginas | avisada no campo da rota, e o salvar fica bloqueado |
| Desfazer depois de salvar | volta o documento, e a página volta a marcar "há mudanças não salvas" |
| Zoom com a página maior que a moldura | a moldura rola; nada é cortado sem rolagem |

## 6. Definição de "aprovado sem ressalvas"

Os 36 critérios com sim e evidência nomeada, `npm test` e `npm run build` verdes no Windows, e
validação com o **produto real**: `npm run forge`, criar uma página, inserir região e componentes
pela paleta, editar prop, mover e remover pelo teclado, desfazer e refazer, salvar, recarregar e
ver o desenho voltar igual. Mais o caminho da pendência: abrir um documento com item que o catálogo
não tem e conferir que ele aparece nomeado, que o salvar fica bloqueado com o motivo, e que remover
o item destrava.

## 7. Auditoria, critério a critério

> Feita depois do build, com a suíte inteira verde e o produto rodando. Evidência é nome de teste,
> arquivo ou comando executado, nunca "conferido a olho".

**Resultado da suíte:** `npm test` → 80 arquivos, **851 testes, 0 falhas**. `npm run build` →
294 módulos, sem aviso. Ambos no Windows 11, Node 24.

### O documento como estrutura editável

| # | Sim? | Evidência |
|---|---|---|
| 1 | sim | `documento.js` exporta as oito funções, todas puras. `documento.test.js` → "nenhuma função escreve no argumento" congela o documento de entrada e chama as oito |
| 2 | sim | `novoId` varre `idsDoDocumento`, que junta ids de página e de nó no mesmo conjunto. Provado por "id novo é único no documento inteiro, e página e nó dividem o mesmo espaço" e "o id gerado é determinístico: mesmo documento, mesmo tipo, mesmo id" |
| 3 | sim | "a primeira página fica na raiz, e as outras derivam do nome, sem ninguém digitar caminho", "rota repetida ganha sufixo em vez de perguntar" e "página nova nasce com id e rota derivados do nome". Na tela, `PaginaStudio.test.jsx` → "criar a primeira página põe a página na árvore e já a deixa selecionada" confere nome `Início` e rota `/` sem ninguém digitar |
| 4 | sim | `adicionarNo` chama `propsPadrao(item)`. "o nó nasce válido: inserir e salvar em seguida nunca é recusa por obrigatória ausente" monta o nó e passa pelo `documentoDesignSchema`. Na tela: "inserir um item o seleciona, e o item nasce com as props do catálogo já preenchidas" |
| 5 | sim | Sete testes em `describe('mover nó')`, incluindo "entrar em quem não aceita é recusado pela própria função", "componente não sai para o topo da página, porque lá só entra região" e "movimento que estouraria o teto de profundidade é recusado". Todos conferem que a função devolve o **mesmo** documento |
| 6 | sim | `describe('o que o catálogo deixa entrar')`, seis testes. `PaletaItens` consome `ondePodeEntrar` e nada mais; na tela, "o filtro é o aceita do item selecionado, e não uma lista fixa" |
| 7 | sim | "montar uma página inteira pela API pública dá documento que o schema aceita" e, no reducer, "uma sequência longa termina em documento que o schema aceita, desfazendo e refazendo no meio" |

### Desfazer e refazer

| # | Sim? | Evidência |
|---|---|---|
| 8 | sim | `reducerStudio.test.js`, 26 testes, nenhum monta componente. O estado é `{ documento, itens, selecao, passado, futuro, marca }` |
| 9 | sim | "trocar token entra na pilha" e "restaurar grupo e restaurar tudo também". Na tela: "os tokens passam pela mesma história do desenho, porque o documento é um só" |
| 10 | sim | "digitar no mesmo campo é um desfazer, não vinte" e "a coalescência é por campo: trocar de campo abre entrada nova". A marca é `prop:<id>:<prop>`, `token:<caminho>` ou `pagina:<id>:<campo>`; não há timer em nenhum dos dois arquivos |
| 11 | sim | `PaginaStudio.test.jsx` → "Ctrl+Z desfaz de qualquer lugar do Studio" e "dentro de um campo de texto, o Ctrl+Z é do navegador e o Studio não interfere" |
| 12 | sim | "o botão diz o que será desfeito, em vez de obrigar a pessoa a lembrar"; na tela, "desfaz e refaz a última edição, e o botão diz qual é" e "sem nada para desfazer, os dois botões ficam desabilitados e dizem por quê" |
| 13 | sim | "edição nova joga fora o refazer, senão a história vira galho" |

### Camadas

| # | Sim? | Evidência |
|---|---|---|
| 14 | sim | `PainelCamadas` renderiza um `role="tree"` só, com página, região e componente como `treeitem`. `PainelCamadas.test.jsx` → "o aninhamento vira aria-level, e a indentação vira atributo, não estilo inline". Não existe segundo widget de páginas em lugar nenhum do Studio |
| 15 | sim | `PainelCamadas.test.jsx`: "as setas selecionam enquanto andam", "a seta esquerda sobe para o pai, pulando os irmãos que estiverem no caminho", "a seta direita entra no primeiro filho, e na folha não faz nada", "Home e End vão para as pontas da árvore", "Alt com seta move, e a página não se move por aqui", "a tabulação entra na árvore uma vez só". Na página inteira: "a tabulação entra na árvore uma vez só, e as setas andam por dentro" e "Alt com as setas reordena entre irmãos" |
| 16 | sim | `PainelCamadas.module.css:58` → `.linha:focus-visible` com `box-shadow: var(--forge-focus-ring)`, e a linha selecionada tem `.ativa` própria, então foco e seleção são visíveis separadamente |
| 17 | sim | `listarLinhas` marca `pendente` quando o item não está no catálogo e usa `no.tipo` como nome. "nó de tipo que saiu do catálogo aparece nomeado pelo tipo cru e marcado, nunca some"; na tela, "o desenho abre inteiro, com o item nomeado e marcado nas camadas" |
| 18 | sim | Carregando e erro em `PaginaStudio.test.jsx` ("mostra o estado de carregando…", "erro de carregar oferece tentar de novo, sem perder a página", "catálogo que não carrega também é erro tratado"); vazio em "sem página nenhuma, as camadas mostram o vazio com a próxima ação" |

### Paleta

| # | Sim? | Evidência |
|---|---|---|
| 19 | sim | `PaginaStudio` passa `ondePodeEntrar(...)` direto para `itens`; o componente não filtra nada. "a paleta só oferece o que o catálogo aceita no ponto onde se está" e "cada item vira um botão com o nome e o microtexto do catálogo" |
| 20 | sim | `PaletaItens.test.jsx`, `describe('estados vazios')`, os três: sem página, com página e nada selecionado, e selecionado que não aceita nada. Na página, "sem página nenhuma, a paleta diz que o primeiro passo é criar a página" |
| 21 | sim | `reducerStudio` → "o nó recém-criado fica selecionado, e o próximo entra dentro do certo". Na tela, "inserir um item o seleciona…" |

### Propriedades

| # | Sim? | Evidência |
|---|---|---|
| 22 | sim | `PainelPropriedades.test.jsx` → "cada tipo do catálogo vira o controle certo, com o valor gravado", "prop ausente no nó mostra o padrão do catálogo: nenhuma pergunta chega sem default", "todo campo carrega o microtexto que o item declarou" e "editar devolve a prop inteira e o valor, com número saindo como número" |
| 23 | sim | "rota fora do formato é avisada no campo, com exemplo do que serve", "rota repetida nomeia a página que já usa aquele caminho", "a própria rota não conta como repetida" e "nome em branco é avisado". O erro sai pelo `erro` do `Campo`, que é `role="alert"` ao lado do campo, e não no salvar |
| 24 | sim | "não inventa formulário: mostra o que está gravado, exatamente como está" e "a única saída oferecida é remover, e ela é destrutiva de verdade" |

### Canvas

| # | Sim? | Evidência |
|---|---|---|
| 25 | sim | `CanvasStudio.test.jsx` → "desenha o item com o componente real, e prop ausente cai no padrão do catálogo" e "clicar num nó seleciona só ele, e não os que o contêm" (o `stopPropagation` é o que faz a diferença). O contorno mora em `CanvasStudio.module.css`, em `--forge-*`; o conteúdo em `itens.module.css`, em `--projeto-*`, e a guarda de namespace cobre os dois sentidos |
| 26 | sim | `registro.test.jsx` lê `catalogo/*/item.json` do disco: "os dois conjuntos de ids são exatamente o mesmo", "prop declarada que ninguém desenha derruba a suíte", "prop desenhada que o catálogo não declara também", "quem aceita filhos usa children, e quem não aceita não usa". Rodado também contra o **catálogo servido pela API viva**, ver a validação abaixo |
| 27 | sim | `ZOOMS` são quatro degraus nomeados, em um `Selecao`, com o valor na tela e 100% marcado como padrão Kora: "os degraus de zoom são nomeados, com 100% marcado como padrão e em primeiro" e "trocar o zoom avisa quem manda, e o valor vira atributo, não estilo inline". Não existe handler de arrastar em `CanvasStudio.jsx` nem em `NoDoCanvas.jsx` |
| 28 | sim | `CanvasStudio.test.jsx` → "a vista de amostra mostra o que veio de fora, sem desenhar página nenhuma"; a escolha automática está em `PaginaStudio.jsx` e é conferida por "projeto sem design abre no padrão Kora…", que encontra a amostra sem trocar nada, e por "sem página, o centro mostra a amostra de tokens; com página, mostra a página" |
| 29 | sim | `PaginaStudio.test.jsx` → "a árvore desenhada no canvas é a mesma do documento, na mesma ordem" lê os elementos do palco em ordem de documento e compara com o que foi montado |
| 30 | sim | `namespaces.test.js`, cinco testes, com a zona do projeto sendo `PreviewProjeto/` mais `itens/`: "a zona do projeto não lê nenhum token da ferramenta", "nenhum token do projeto vaza para fora da zona do projeto", "o palco declara fundo, cor e fonte em vez de herdar os da ferramenta", "a zona do projeto não escreve em :root, html nem body". `PalcoProjeto` é o único arquivo do produto que monta estilo em tempo de execução, e `CanvasStudio.test.jsx` → "o palco carrega os tokens do projeto, e é o único lugar que carrega" varre o DOM renderizado para provar |

### Salvar, pendência e leitura

| # | Sim? | Evidência |
|---|---|---|
| 31 | sim | As pendências são calculadas contra o catálogo em mãos, não copiadas da resposta. `PaginaStudio.test.jsx` → "o Studio impede a tentativa de salvar, dizendo o motivo antes do clique" e "remover o item destrava o salvar na hora, sem precisar recarregar" |
| 32 | sim | "é só leitura de ponta a ponta, com o motivo na tela" e "nem pelo teclado dá para remover num projeto arquivado". Nos componentes: "em projeto arquivado a lista aparece, mas nenhum botão insere", "em projeto arquivado, nem Delete nem Alt com seta fazem alguma coisa", "em projeto arquivado nenhum controle aceita edição" |
| 33 | sim | "recusa do servidor aparece legível, uma linha por problema" e "erro sem detalhe ainda mostra a mensagem, e o rascunho continua na tela" |

### Padrões e verificação

| # | Sim? | Evidência |
|---|---|---|
| 34 | sim | `src/services/camadaDeServicos.test.js` verde na suíte: fora de `src/services/` nada toca `fetch`. Nenhum dos componentes novos importa serviço; quem consulta é `PaginaStudio`. Nenhum `style=` nos componentes novos: a indentação das camadas é `data-nivel` e o zoom é `data-zoom`, ambos resolvidos em CSS. Nenhuma cor, fonte ou espaço fora de token nos cinco CSS novos |
| 35 | sim | `npm test` 851/851 e `npm run build` verdes, rodados nesta ordem depois da última edição. Sem regressão: os testes do bloco 2 (tokens, preview, salvar, descartar, restaurar grupo) foram mantidos e continuam passando dentro do `PaginaStudio.test.jsx` reescrito |
| 36 | sim | `docs/02_DESIGN_SYSTEM/README.md` (a zona do projeto e o palco), `docs/06_COMPONENTES/README.md` (`PalcoProjeto`, `itens/*`, `CanvasStudio`, `NoDoCanvas`, `PainelCamadas`, `PaletaItens`, `PainelPropriedades`, `PreviewProjeto`, `PaginaStudio` e a regra 6), `docs/09_BACKLOG/fase2.md` (bloco 4 entregue, bloco 5 próximo, e o que "zoom, pan e snap" virou), `memory/decisions.md` (seis decisões) e a nota datada no ADR-005 |

### Validação com o produto rodando

Servidor real, bind em `127.0.0.1:7337`, token de sessão no header `X-Forge-Token`, `Origin` do
dev server.

1. **O catálogo que a API serve é o que o canvas desenha.** `GET /api/catalog` devolveu os nove
   ids (`botao, cabecalho, campo, cartao, imagem, rodape, secao, texto, titulo`) e nenhum
   `fragmento`. Um script rodou a mesma guarda do `registro.test.jsx` **contra a resposta viva**:
   `itens conferidos: 9 | divergencias: 0`.
2. **Desenho salvo e lido de volta idêntico.** `POST` de um documento com duas páginas (`/` e
   `/painel`), cabeçalho com título nível 1 e seção com texto → versão 4. `GET` devolveu
   `rotas / /painel`, `pendencias []` e `paginas voltam iguais? true`.
3. **A escrita recusa o que o catálogo não tem, com o caminho do nó.**
   `paginas.1.regioes.0.tipo` → `"carrossel" não existe no catálogo deste Forge.` (400).
4. **A escrita recusa aninhamento que o `aceita` não autoriza.**
   `paginas.0.regioes.0.filhos.0.filhos.0.tipo` → `"Seção" é região e só entra no topo da página,
   não dentro de "Título".` (400).
5. **O caminho da pendência, ponta a ponta e de verdade.** Um item temporário `carrossel` foi
   acrescentado ao catálogo em disco, o servidor reiniciado, e um desenho usando esse item foi
   salvo (versão 5, sem erro). O item foi **removido** do catálogo e o servidor reiniciado de novo.
   O `GET` seguinte devolveu o desenho **inteiro**, com as props preservadas (`velocidade: 5`),
   mais a pendência declarada, nomeando o nó, o tipo, a página e as duas versões de catálogo.
   Regravar o mesmo desenho foi recusado com 400, que é exatamente a recusa que o Studio evita
   antes do clique (critério 31). O item temporário foi retirado do repositório ao fim, e o projeto
   de teste voltou a um desenho sem pendência.

### Ressalvas

Nenhuma que impeça o "aprovado". Duas anotações honestas:

- **O passo do browser foi feito por teste, não por clique.** A sequência da seção 6 (criar página,
  inserir pela paleta, editar prop, mover e remover pelo teclado, desfazer, refazer, salvar) está
  coberta por `PaginaStudio.test.jsx`, que monta a página inteira com as três consultas mockadas,
  e o ida e volta ao disco foi exercitado contra o servidor real. O que **não** foi verificado por
  máquina é a aparência: contraste do contorno de seleção, comportamento do zoom a 50% em tela
  pequena e a pilha de colunas abaixo de 1180px. Isso pede olho humano.
- **Dois estados vazios da paleta não são alcançáveis pela página hoje.** `vazioSemSelecao` e
  `vazioNaoAceita` só aparecem com um catálogo sem região, que não é o caso do builtin. Eles
  existem porque catálogo custom vem na Fase 5 e porque estado vazio sem texto é a coisa que mais
  apodrece em silêncio; ficam testados no nível do componente, em `PaletaItens.test.jsx`.
