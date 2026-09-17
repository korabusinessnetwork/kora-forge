# Fase 2, bloco 3, catálogo de regiões e componentes

> Spec do loop `spec → build → review`. A auditoria critério a critério vira a seção 7 deste
> mesmo arquivo, e o bloco só é declarado feito quando todos os critérios têm sim com evidência.

## 1. Escopo

O vocabulário do Studio. Hoje `noSchema` aceita qualquer `tipo` slug, e o comentário no próprio
arquivo diz: "a diferença entre região e componente é o que o catálogo diz que eles são (bloco 3)".
Este bloco é esse catálogo.

1. **`catalogo/`**, uma pasta por item, com `item.json` e `fragmento.jsx`, no mesmo padrão
   declarativo de `presets/`, `regras/` e `templates/`.
2. **Contrato em Zod** (`shared/schemas/catalogo.js`), estrito, usado nas duas pontas. Item fora
   do contrato derruba o boot, como preset, regra e template já fazem.
3. **A amarração item → código gerado**, que é o que impede o Studio de desenhar o que o gerador
   não sabe escrever. Cada item declara suas props e traz o fragmento que as consome; um teste
   confere que os dois lados batem, nos dois sentidos.
4. **Validação do documento de design contra o catálogo** ao salvar: tipo que não existe, prop
   que não foi declarada, valor fora do tipo e aninhamento que o item não aceita viram recusa com
   caminho, não desenho impossível gravado no banco.
5. **Pendência declarada na leitura**: documento que usa item que saiu do catálogo continua
   abrindo, com o item nomeado (ADR-009, decisão 4). Nunca "some do desenho sem avisar".
6. **`GET /catalog`** e a camada de serviços do front, para o bloco 4 ter o que oferecer na
   paleta do canvas.

### Onde o catálogo mora, e por que não vai para o banco

O plano da fase dizia "sincronizado no banco no `forge:init`", pelo paralelo com `presets/` e
`regras/`. **Ao construir, o paralelo certo é `templates/`, que não tem tabela.** Preset está no
banco porque o usuário pode ter preset custom e o projeto fixa `presetId` mais versão; regra está
no banco porque `rule_hits` referencia `rules`. O catálogo v1 é builtin, ninguém escreve nele, e
nada referencia um item por chave estrangeira: o documento guarda o `tipo` como texto e a versão
do catálogo, exatamente como o plano guarda o id e a versão do template.

Copiar o catálogo para o SQLite criaria uma segunda cópia que pode ficar velha, mais uma migration,
sem ganho nenhum. Fica em disco, carregado no boot, como template. `docs/09_BACKLOG/fase2.md` é
corrigido junto, porque a documentação prevalece e deve ser corrigida quando está errada.

## 2. Fora de escopo

Canvas e paleta visual (bloco 4), etapa Design no wizard (bloco 5), **geração de JSX a partir do
fragmento** (bloco 6) e diff (bloco 7). Aqui o fragmento é declarado, validado e servido; quem
renderiza é o bloco 6.

Catálogo custom do usuário, item vindo de plugin e versionamento múltiplo de catálogo lado a lado
também ficam de fora: existe uma versão de catálogo, a deste Forge, e o documento grava qual era.

Estilo do item no projeto gerado (o CSS Module de cada componente) é do bloco 6, junto com a
geração. Aqui o fragmento declara a classe que vai usar, e só.

## 3. Arquivos afetados

| Arquivo | Dono | O que muda |
|---|---|---|
| `catalogo/README.md` | novo | a convenção da pasta |
| `catalogo/<id>/item.json` | novo | nove itens: três regiões e seis componentes |
| `catalogo/<id>/fragmento.jsx` | novo | o fragmento de cada item |
| `shared/schemas/catalogo.js` | novo | contrato do item, do catálogo e da validação do documento |
| `shared/schemas/catalogo.test.js` | novo | testes do contrato |
| `shared/jsx.js` | novo | escapar valor de prop para JSX, função pura |
| `shared/jsx.test.js` | novo | testes do escape |
| `server/modules/catalogo/servico.js` | novo | carregar do disco, servir, validar documento |
| `server/modules/catalogo/rotas.js` | novo | `GET /catalog` |
| `server/modules/catalogo/catalogo.test.js` | novo | testes do módulo e dos itens reais |
| `server/modules/design/servico.js` | edição | recusa ao salvar, pendência ao ler |
| `server/modules/design/design.test.js` | edição | testes da recusa e da pendência |
| `server/app.js` | edição | registrar o módulo e injetar no de design |
| `shared/schemas/design.js` | edição | `pendencias` no registro lido |
| `src/services/catalogo.js` | novo | camada de serviços do front |
| `src/services/camadaDeServicos.test.js` | edição | varre `src/` por exclusão, e absorve o arquivo duplicado do bloco 2 |
| `docs/03_REGRAS_DE_NEGOCIO/catalogo.md` | novo | o contrato em português |
| `docs/03_REGRAS_DE_NEGOCIO/README.md` | edição | RN-08 aponta para o catálogo |
| `docs/07_APIS/README.md` | edição | `GET /catalog` |
| `docs/09_BACKLOG/fase2.md` | edição | bloco 3 entregue, e a correção sobre o banco |
| `memory/decisions.md` | edição | decisões do bloco |

## 4. Critérios de aceite

### O contrato do item

1. `itemCatalogoSchema` é estrito e exige: `id` slug, `versao`, `papel` (`regiao` ou
   `componente`), `nome`, `descricao`, `microtexto` (o que o item afeta no resultado, regra 3 do
   design system), `props` e `aceita`. Campo a mais é recusa, com o nome do campo.
2. Cada prop declara `id` slug, `tipo` (`texto`, `numero`, `booleano` ou `opcao`), `rotulo`,
   `microtexto`, `padrao` do tipo declarado e `obrigatoria`. Prop de tipo `opcao` declara `opcoes`
   não vazia, e o `padrao` tem que estar entre elas. Toda prop tem default, princípio nº 1.
3. `aceita` é a lista de ids que podem ser filhos daquele item. Lista vazia significa folha. Um
   item só pode aceitar filhos que existam no catálogo, e um teste varre o catálogo real
   conferindo isso: referência para item inexistente derruba o boot.
4. Região só entra no topo de uma página, componente nunca. Isso é decidido por `papel`, não por
   convenção de nome, e é verificado nas duas pontas.
5. O catálogo tem uma `versao` única, a mesma `CATALOGO_VERSAO_ATUAL` do bloco 1, e um teste
   garante que os dois números não podem divergir.

### A amarração com o código gerado

6. Cada item traz `fragmento.jsx`, e o carregador lê o arquivo junto do manifesto, como o gerador
   já faz com `arquivos/` do template. Item sem fragmento derruba o boot com o caminho.
7. **Nos dois sentidos**: toda chave `{{CHAVE}}` do fragmento corresponde a uma prop declarada ou
   à chave reservada `{{FILHOS}}`, e toda prop declarada aparece no fragmento. Um teste varre o
   catálogo real. É esta a guarda contra o risco "catálogo e templates saírem de sincronia" da
   `fase2.md`.
8. Só item que aceita filhos pode usar `{{FILHOS}}`, e item que aceita filhos é obrigado a usar.
   Folha com `{{FILHOS}}` seria filho que some na geração.
9. Valor de prop é **dado, nunca código**: `escaparValorJsx()` neutraliza `<`, `>`, `{`, `}` e
   aspas antes de qualquer valor entrar no fragmento, e um teste cobre a tentativa de fechar tag
   e abrir expressão. A função nasce aqui, com teste, e o bloco 6 a consome.
10. O motor de template continua o mesmo `renderizar()` de `shared/template.js`: sem condicional,
    sem laço, sem `eval`, sem `new Function`. Nenhuma sintaxe nova entra por causa do catálogo.

### O catálogo v1

11. Nove itens, todos com nome e microtexto em português, todos com fragmento: regiões
    `cabecalho`, `secao` e `rodape`; componentes `titulo`, `texto`, `botao`, `imagem`, `campo` e
    `cartao`.
12. Nenhum item traz marca, cor, nome ou regra de cliente. Todo projeto gerado nasce white-label,
    e um teste varre os fragmentos atrás de cor literal e de nome próprio.
13. `catalogo/README.md` lista os itens e aponta para o contrato, como `presets/README.md` faz.

### Documento validado contra o catálogo

14. Salvar documento com `tipo` que não existe no catálogo é recusado com
    `caminho: paginas.0.regioes.1.tipo` e o nome do tipo na mensagem.
15. Salvar componente onde o pai não o aceita é recusado, dizendo qual item aceita o quê.
16. Salvar região no meio da árvore, ou componente no topo da página, é recusado pelo `papel`.
17. Prop não declarada é recusada com o nome da prop; valor fora do tipo declarado é recusado com
    o tipo esperado; prop obrigatória ausente é recusada. Prop opcional ausente **não** é erro:
    vale o `padrao` do catálogo.
18. Documento sem página nenhuma continua válido. O bloco 2 salva exatamente isso, e um projeto
    que só mexeu em token não pode passar a falhar.

### Pendência, não corrupção

19. `GET /projects/:id/design` de um documento que usa item ausente do catálogo devolve o
    documento **inteiro**, mais `pendencias`, cada uma com o id do nó, o tipo ausente e a versão
    de catálogo que o documento declarou. Nada é reescrito, nada é apagado.
20. Documento com `catalogo.versao` maior que a deste Forge continua sendo recusado ao salvar,
    como no bloco 1, e a mensagem nomeia as duas versões.
21. `pendencias` é `[]` quando está tudo certo, nunca `null` nem ausente, para a UI não precisar
    checar duas coisas.

### API e front

22. `GET /catalog` devolve `{ versao, itens }` no envelope de sempre, com `config.schemaSaida`
    declarado, e passa pelas mesmas guardas de Host, token e Origin.
23. `src/services/catalogo.js` é o único ponto do front que fala com a rota, valida o contrato e
    é coberto pela guarda de arquitetura de `src/services/camadaDeServicos.test.js`.
24. O fragmento **não** vai no `GET /catalog`: a paleta do bloco 4 precisa de nome, microtexto,
    props e `aceita`, não do código. Menos superfície, e o front não tem por que saber gerar nada.

### Padrões e verificação

25. Nenhum comportamento essencial depende de LLM; nada aqui chama o copiloto.
26. Erro com código estável mais mensagem legível em toda recusa, e `caminho` apontando o nó, não
    o documento inteiro.
27. `npm test` e `npm run build` verdes no Windows, o ambiente primário (T-02).
28. Sem regressão nos blocos 1 e 2: o hash congelado continua igual, o painel de tokens continua
    salvando, e um projeto sem página nenhuma continua passando.

### Documentação

29. `docs/03_REGRAS_DE_NEGOCIO/catalogo.md` descreve o contrato do item, as regras de
    aninhamento e o ciclo de vida do item removido. RN-08 aponta para ele.
30. `docs/07_APIS` documenta `GET /catalog`. `fase2.md` marca o bloco 3 e corrige o texto sobre
    sincronizar no banco. `memory/decisions.md` registra as decisões.

## 5. Edge cases conhecidos

- Item removido do catálogo com documento antigo usando: pendência na leitura, recusa na escrita.
  O documento não é tocado.
- Documento vazio, sem página: válido, e é o que o bloco 2 grava.
- Prop opcional ausente: vale o padrão do catálogo, não é erro.
- Prop com valor que parece JSX (`<b>oi</b>`): aceita como texto, escapada na geração.
- Aninhamento profundo: o teto de `PROFUNDIDADE_MAXIMA` do bloco 1 continua valendo, e o
  `aceita` do catálogo é um segundo limite, mais apertado e por item.
- Catálogo de um Forge mais novo: já recusado no bloco 1, e a mensagem nomeia as duas versões.
- Fragmento com chave que não é prop nem `FILHOS`: boot falha, com o id do item e a chave.

## 6. Definição de "aprovado sem ressalvas"

Os 30 critérios com sim e evidência nomeada, `npm test` e `npm run build` verdes no Windows, e
validação com o **produto real**: `npm run forge`, `GET /catalog` devolvendo os nove itens,
`POST` de um documento com uma página válida gravando, `POST` com tipo inexistente recusado com
caminho, e `GET` de um documento com item ausente devolvendo o desenho inteiro mais a pendência.


## 7. Auditoria, critério a critério

> Feita depois do build, com `npm test` e `npm run build` verdes no Windows e com o servidor real
> respondendo. Evidência nomeada em todos: nome de teste, arquivo ou verificação executada.

### O contrato do item

| # | Sim | Evidência |
|---|---|---|
| 1 | sim | `itemCatalogoSchema` em `shared/schemas/catalogo.js`. Testes `aceita um item completo e preenche os defaults do contrato`, `é estrito: campo a mais é recusa, não silêncio` e `nome, descrição e microtexto são obrigatórios: item sem microtexto vira nome solto na paleta` |
| 2 | sim | `propCatalogoSchema` com `superRefine` por tipo. Testes `o padrão tem que ser do tipo declarado, senão a paleta abriria com valor inválido`, `prop de opção declara as opções, e o padrão está entre elas`, `opções só valem para prop de opção` e `toda prop tem padrão: pergunta sem default é carga mental que o sistema já podia tirar` |
| 3 | sim | `conferirCoerencia()` recusa `aceita` para item inexistente, e roda no carregamento. Testes `tudo o que um item aceita existe no catálogo` (catálogo real) e `item que aceita filho inexistente` (catálogo sintético, boot falha com o id na mensagem) |
| 4 | sim | Decidido por `papel`. No contrato, `PAPEIS` é enum fechado (`papel só pode ser região ou componente…`); na validação, `conferirDocumento` recusa componente no topo e região no meio (`componente no topo da página é recusado, e região dentro da árvore também`); no catálogo real, `região não é aceita como filha por ninguém, e todo componente tem onde entrar` |
| 5 | sim | `CATALOGO_VERSAO` é reexportado de `CATALOGO_VERSAO_ATUAL`, e o teste `é a mesma que o documento de design grava, e as duas não podem divergir` compara os dois. Não há como divergirem sem quebrar a suíte |

### A amarração com o código gerado

| # | Sim | Evidência |
|---|---|---|
| 6 | sim | `carregarCatalogoBuiltin()` lê `item.json` e `fragmento.jsx` da pasta do item, como o gerador faz com `arquivos/`. Testes `item sem fragmento` (caminho `botao/fragmento.jsx`), `item.json que não é JSON válido`, `item fora do contrato, com o caminho do campo` e `id do manifesto diferente da pasta` |
| 7 | sim | Nos dois sentidos, contra o catálogo real: `toda chave do fragmento é prop declarada ou a chave reservada dos filhos` e `toda prop declarada aparece no fragmento: prop que ninguém usa é campo que não faz nada`. Contra catálogo sintético, provando que o boot cai: `fragmento com chave que não é prop nem filhos` e `prop declarada que o fragmento nunca usa` |
| 8 | sim | Teste `só quem aceita filhos usa a chave dos filhos, e quem aceita é obrigado a usar`, que compara `chavesUsadas(fragmento).includes(FILHOS)` com `aceita.length > 0` item a item. Os dois lados da falha em `folha com a chave dos filhos, e container sem ela` |
| 9 | sim | `shared/jsx.js` mais `shared/jsx.test.js`, 9 testes: `não dá para fechar a tag do fragmento nem abrir uma nova`, `não dá para abrir expressão JSX com chave`, `aspas não escapam do atributo`, `o e-comercial é escapado uma vez só, sem escapar o próprio escape` e `nenhum caractere perigoso sobra, qualquer que seja a mistura` |
| 10 | sim | O carregador usa `chavesUsadas()` e o teste de render usa `renderizar()`, os dois de `shared/template.js`, sem tocar no motor. Nenhuma sintaxe nova: teste `o fragmento renderiza com os padrões do catálogo, sem sobrar placeholder` renderiza os nove itens com o motor de sempre |

### O catálogo v1

| # | Sim | Evidência |
|---|---|---|
| 11 | sim | Teste `tem os nove itens da versão 1, três regiões e seis componentes`, que compara a lista de ids inteira, e `todo item traz nome, microtexto e fragmento, e nenhum fica sem o que a paleta precisa`. Conferido também no servidor real: `GET /api/catalog` devolveu os nove |
| 12 | sim | Teste `nenhum fragmento traz cor literal nem marca: o projeto gerado nasce white-label`, que varre hex, `rgb(`, `hsl(` e o nome da própria Kora nos nove fragmentos |
| 13 | sim | `catalogo/README.md`, com a tabela dos nove itens, o formato da pasta, as duas regras que o boot confere e o ponteiro para o contrato |

### Documento validado contra o catálogo

| # | Sim | Evidência |
|---|---|---|
| 14 | sim | `design.test.js`, `tipo que não existe no catálogo é recusado, com o caminho do nó`. No servidor real: `400`, `caminho: paginas.0.regioes.0.tipo`, mensagem `"carrossel" não existe no catálogo deste Forge.` |
| 15 | sim | `filho que o pai não aceita é recusado, dizendo o que o pai aceita`. No servidor real: `"Rodapé" não aceita "Imagem". Aceita: texto, botao.` |
| 16 | sim | `componente no topo da página e região no meio da árvore são recusados pelo papel`. No servidor real: `"Título" é componente e só entra dentro de uma região. No topo da página vai região.` |
| 17 | sim | `prop não declarada, valor fora do tipo e obrigatória ausente são recusados, cada um com seu caminho` e `prop opcional ausente não é erro: vale o padrão do catálogo`. No servidor real, a tentativa com prop errada e obrigatória ausente devolveu as duas issues de uma vez, e o desenho sem a prop opcional gravou |
| 18 | sim | `documento sem página nenhuma continua válido: é o que o painel de tokens salva`, e no contrato `documento sem página nenhuma é válido: é o que o painel de tokens salva`. O bloco 2 continua salvando: suíte inteira verde |

### Pendência, não corrupção

| # | Sim | Evidência |
|---|---|---|
| 19 | sim | `o desenho volta inteiro, com o item ausente nomeado ao lado`. No servidor real, com uma linha gravada direto na tabela: o nó `carrossel` voltou com props e tudo, e `pendencias` trouxe `{ no: 'antigo-1', tipo: 'carrossel', pagina: 'inicio', catalogoDoDocumento: 1, catalogoDoForge: 1 }` |
| 20 | sim | A recusa por catálogo à frente é do bloco 1 e continua verde: `documento de um Forge mais novo é recusado com as duas versões na mensagem` |
| 21 | sim | `sem pendência a lista vem vazia, nunca null nem ausente`, com o envelope conferido por `designOuNadaSchema`. `pendencias` tem `.default([])` no schema |
| — | — | Extra do mesmo grupo: `ler não reescreve nem apaga nada: o documento continua igual na tabela`, comparando `paginas_json` e a contagem de linhas antes e depois do `GET` |

### API e front

| # | Sim | Evidência |
|---|---|---|
| 22 | sim | `rotas.js` declara `config.schemaSaida: catalogoSchema`. Testes `devolve versão e itens no envelope, dentro do contrato` e `passa pelas mesmas guardas: sem token não responde` (401) |
| 23 | sim | `src/services/catalogo.js` com `validarContrato`, testado em `src/services/catalogo.test.js` (3 testes). Coberto pela guarda `nada fora de src/services fala com a rede: nem componente, nem feature, nem hook` |
| 24 | sim | `listar()` faz destructuring que descarta o fragmento. Teste `não devolve o fragmento: o front não tem por que saber gerar nada`, que confere o JSON inteiro e as chaves de cada item. Confirmado no servidor real |

### Padrões e verificação

| # | Sim | Evidência |
|---|---|---|
| 25 | sim | Nada no bloco chama o copiloto. O catálogo é dado em disco e a validação é função pura; o Forge inteiro continua funcionando com o copiloto desligado, que é o estado padrão |
| 26 | sim | Toda recusa é `ErroForge('FORGE_VALIDATION', …)` com `issues` de `{ caminho, mensagem }`, e o caminho aponta o nó. Teste `validarDocumento recusa com código estável e caminho do nó`, e `cada nó com problema vira uma issue, e uma não esconde a outra` |
| 27 | sim | `npm test`: 72 arquivos, 679 testes, todos verdes. `npm run build`: `✓ built`. Windows 11, T-02 |
| 28 | sim | Hash congelado do bloco 1 continua igual (`projeto sem design gera o mesmo plano de sempre, e o hash não muda por causa deste bloco`). O painel de tokens continua salvando (suíte do bloco 2 verde). Documento sem página continua válido. **Uma mudança de fixture foi necessária e é correta**: o `documento()` de `design.test.js` usava `props: { titulo }` numa seção, que o catálogo não tem; era desenho impossível que o bloco 1 não tinha como recusar |

### Documentação

| # | Sim | Evidência |
|---|---|---|
| 29 | sim | `docs/03_REGRAS_DE_NEGOCIO/catalogo.md`: item, prop, aninhamento, do item ao código gerado, ciclo de vida do item removido e onde o catálogo mora. RN-08.1 aponta para ele |
| 30 | sim | `docs/07_APIS/README.md` com a seção `GET /api/catalog`, mais `pendencias` na resposta do design e a nova linha na lista do que o contrato recusa. `fase2.md` com o bloco 3 entregue e o texto sobre sincronizar no banco corrigido no lugar onde estava errado. `memory/decisions.md` com cinco decisões novas |

### Validação com o produto rodando

`node server/index.js --dev`, projeto **Delta Studio**, pela API local com token de sessão e `Origin`:

- `GET /api/catalog`: versão 1, nove itens, três regiões e seis componentes, com props e `aceita`
  de cada um. Nenhum `fragmento` na resposta.
- `POST` de uma página com seção, título, cartão e texto aninhados: `200`, versão 2.
- `POST` com `tipo: carrossel`: `400`, `paginas.0.regioes.0.tipo`,
  `"carrossel" não existe no catálogo deste Forge.`
- `POST` com título no topo da página: `400`,
  `"Título" é componente e só entra dentro de uma região. No topo da página vai região.`
- `POST` com imagem dentro do rodapé: `400`, `"Rodapé" não aceita "Imagem". Aceita: texto, botao.`
- `POST` com prop inventada mais obrigatória ausente: `400`, as duas issues de uma vez
  (`paginas.0.regioes.0.props.cor` e `paginas.0.regioes.0.filhos.0.props.texto`).
- `POST` com prop opcional ausente: `200`, versão 3.
- Linha gravada direto na tabela com `tipo: carrossel`, simulando item que saiu do catálogo:
  o `GET` devolveu o nó inteiro, com props, mais
  `pendencias: [{ no: 'antigo-1', tipo: 'carrossel', pagina: 'inicio', catalogoDoDocumento: 1, catalogoDoForge: 1 }]`.
  A linha sintética foi apagada depois.

### Ressalvas

Uma, e é sobre a auditoria do bloco anterior, não sobre este bloco.

Ao escrever o serviço do front do catálogo, encontrei `src/services/camadaDeServicos.test.js`: a
guarda "componente nunca chama fetch" **existia desde a Fase 1**, e a auditoria do bloco 2 afirmou
que não existia e criou `src/arquitetura.test.js` para supri-la. A busca que fiz lá foi cortada por
um `head` e não mostrou o arquivo, e eu concluí ausência a partir de uma busca incompleta.

Corrigido aqui: o arquivo duplicado foi removido, a cobertura a mais que ele trazia (varrer `src/`
por exclusão em vez de por lista de pastas, mais `XMLHttpRequest` e `EventSource`, mais a
conferência de que `api.js` e `logDeRun.js` mantêm o acesso injetável) foi dobrada na guarda
original, e a linha 15 da auditoria do bloco 2 foi reescrita com o que de fato aconteceu.
