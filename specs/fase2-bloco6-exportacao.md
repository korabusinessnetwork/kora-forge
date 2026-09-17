# Fase 2, bloco 6, exportação do design para o gerador

> Spec do loop `spec → build → review`, rodada em modo Full Automático (`.full-auto/`). Toda escolha
> que seria do dono está na seção 1 com o motivo. A auditoria vira a seção 7.

## 1. Escopo

O documento de design efetivo (`designEfetivo()`, bloco 5) passa a **mudar arquivos** do plano:
`tokens.css` com os valores do Studio, e cada página desenhada vira rota e arquivo de esqueleto,
montados só por template versionado. Sem design efetivo, o plano sai **byte a byte** igual ao de hoje.

1. **`tokens.css` parametrizado.** O arquivo do template `design-tokens` troca cada valor literal
   por uma chave (`--cor-fundo: {{TOKEN_COR_FUNDO}};`, e `{{TOKEN_ESCURO_COR_FUNDO}}` no bloco
   escuro). As chaves nascem mecanicamente de `listarTokens()`, e o valor vem dos tokens do design
   efetivo ou de `TOKENS_PADRAO`. O manifesto continua na versão 1: com os tokens padrão, a saída é
   idêntica ao arquivo de antes, provada contra uma cópia congelada dele. Motivo: subir a versão
   mudaria o hash congelado da Fase 1 sem nenhum byte diferente no disco.
2. **Moldes, não arquivos.** O loader de templates passa a ler uma pasta opcional `moldes/`, que o
   gerador usa como template mas nunca escreve direto. O template novo **`studio-paginas`** (ordem 45)
   traz `arquivos/src/paginas/pagina.module.css`, com as classes que os fragmentos do catálogo usam,
   e os moldes `pagina.jsx`, `app.jsx`, `linha-import.jsx` e `linha-rota.jsx`.
3. **`exportarDesign()`**, função pura em `server/modules/gerador/exportarDesign.js`. Recebe o
   documento, o catálogo com fragmentos, os moldes e os valores do projeto; devolve os arquivos
   derivados, os caminhos que eles substituem ou removem, e as pendências. Percorre a árvore na ordem
   do array, renderiza o fragmento de cada nó com as props (padrão do catálogo quando ausente, sempre
   por `valorParaJsx`), e indenta os filhos.
4. **Página vira arquivo e rota.** Com ao menos uma página, o plano ganha `src/paginas/Pagina<Nome>.jsx`
   por página, onde `<Nome>` é o id em PascalCase, e `src/App.jsx` passa a ser o molde de rotas, com
   `BrowserRouter` e uma `Route` por página, na ordem do documento. `src/App.module.css`, que só o
   `App` antigo usava, sai do plano. Motivo: `react-router-dom` já está no `package.json` gerado, e
   o `main.jsx` já renderiza `App`, então a troca é uma só e não mexe em outro template.
5. **Hash.** O template `studio-paginas` entra na lista de templates do insumo só quando há página.
   O documento já entrava desde o bloco 1.
6. **Pendência de catálogo.** Nó cujo tipo saiu do catálogo não gera código e vira pendência
   declarada no plano (`tipo: 'catalogo'`), nomeando nó, tipo e página, como o ADR-009 manda.
7. **Valores perigosos.** Token com `;`, `{`, `}`, `<`, `>`, `\`, quebra de linha, `/*` ou `*/` é
   recusado **na escrita** do design pelo schema, porque sairia do valor e viraria regra CSS. Prop de
   texto que começa com `javascript:` ou `vbscript:` (ignorando espaço e caixa) é trocada pelo padrão
   do catálogo e vira pendência (`tipo: 'valor'`), porque escapar HTML não impede URL executável em
   `src`.

## 2. Fora de escopo

- Diff de projeto já materializado e `VisualizadorDiff`: bloco 7. Aqui o plano continua usando as
  ações de hoje (`criar`, `sobrescrever`, `pular`).
- Comportamento nos componentes gerados (clique, envio de formulário, estado). ADR-012, seção 2: o
  esqueleto é começo que pede código.
- Rota coringa ou 404 no projeto gerado, e página inicial automática quando nenhuma página usa `/`.
- Mudar o catálogo, o Studio ou o schema de props. Nenhum tipo de prop novo.
- Catálogo e moldes customizados (Fase 5).

## 3. Arquivos afetados

**Criados**
- `server/modules/gerador/exportarDesign.js` e `exportarDesign.test.js`
- `server/modules/gerador/fixtures/tokens-padrao.css`, cópia congelada do `tokens.css` de hoje
- `templates/studio-paginas/template.json`, `arquivos/src/paginas/pagina.module.css`,
  `moldes/pagina.jsx`, `moldes/app.jsx`, `moldes/linha-import.jsx`, `moldes/linha-rota.jsx`

**Modificados**
- `templates/design-tokens/arquivos/src/styles/tokens.css`: valores viram chaves
- `shared/valores.js` e `valores.test.js`: chaves de token, com `tokens` opcional em `montarValores`
- `shared/schemas/design.js` e `design.test.js`: valor de token seguro
- `shared/schemas/plano.js`: `pendenciaSchema.tipo` aceita `catalogo` e `valor`
- `server/modules/gerador/servico.js` e `gerador.test.js`: moldes, catálogo injetado, exportação
- `server/app.js`: passa `catalogo` ao gerador
- `server/modules/design/design.test.js`: o teste "os arquivos do plano ainda não mudam" se inverte
- `templates/README.md`, `catalogo/README.md`, `docs/05_FLUXOS/README.md` (F-05),
  `docs/09_BACKLOG/fase2.md`

## 4. Critérios de aceite

### Sem design, nada muda

1. Plano de `criar-site` sem documento gera o hash congelado `sha256:175a2bf0…` e o conteúdo de
   `src/styles/tokens.css` é idêntico a `fixtures/tokens-padrao.css`.
2. Com `design` assumida e documento salvo, idem (teste do bloco 5 continua verde).
3. Com o desenho do Studio escolhido e documento só com tokens padrão e nenhuma página, os caminhos
   e conteúdos dos arquivos são os de um projeto sem documento (o hash muda, o disco não).

### Tokens

4. `tokens.css` do template não tem nenhum valor literal nas variáveis editáveis: toda linha
   `--x: valor;` fora de `--anel-foco` usa uma chave `{{TOKEN_…}}`.
5. `montarValores` devolve uma chave por entrada de `listarTokens()`, com o valor do token recebido,
   e `TOKENS_PADRAO` quando nada é passado. O teste de chaves contra templates continua verde nos
   dois sentidos.
6. Com o desenho do Studio escolhido e `cor.acento` `#ff0055`, o `tokens.css` do plano tem
   `--cor-acento: #ff0055;` e nenhum outro valor diferente do padrão.
7. `corEscuro.fundo` alterado sai dentro do bloco `prefers-color-scheme: dark`, e só lá.
8. Salvar design com token contendo `;`, `{`, `}`, `<`, `>`, `\`, quebra de linha, `/*` ou `*/`
   responde 400 com o caminho do token. Os valores padrão, com aspas, vírgulas e parênteses, passam.

### Páginas

9. Documento com páginas `inicio` (`/`) e `sobre-nos` (`/sobre-nos`) gera
   `src/paginas/PaginaInicio.jsx` e `src/paginas/PaginaSobreNos.jsx`, `src/paginas/pagina.module.css`,
   e um `src/App.jsx` com duas `Route`, na ordem do documento, importando as duas páginas.
10. Com página, `src/App.module.css` não está no plano; sem página, está, com o conteúdo de hoje.
11. Os arquivos gerados de página e o `App.jsx` são JSX válido: um teste compila cada um com o
    `transformWithOxc` do Vite sem erro.
12. Cada nó vira o fragmento do seu item, na ordem do array, com os filhos dentro de `{{FILHOS}}` e
    indentados dois espaços por nível.
13. Prop ausente usa o padrão do catálogo; prop presente usa o valor do documento.
14. Texto com `</h1><script>{alert(1)}</script>` sai neutralizado por `escaparValorJsx`, e o
    arquivo continua compilando.
15. Imagem com `origem` `javascript:alert(1)` (e variações de caixa e espaço) sai com o padrão do
    catálogo, e o plano traz pendência `tipo: 'valor'` nomeando nó e página.
16. Nó com tipo fora do catálogo não aparece no arquivo, os irmãos aparecem, e o plano traz
    pendência `tipo: 'catalogo'` com nó, tipo e página.
17. Página sem região gera arquivo válido que renderiza um fragmento vazio.
18. Nome de página com quebra de linha não quebra o comentário do arquivo gerado.
19. Dois ids de página que dão o mesmo nome de arquivo sem diferenciar caixa (`a-b` e `ab`, por
    exemplo `PaginaAB` e `PaginaAb`) derrubam o plano com `FORGE_CONFLICT` nomeando os dois, porque no
    Windows seriam o mesmo arquivo.

### Determinismo e hash

20. Mesmo documento gera o mesmo plano duas vezes, com mesmos arquivos na mesma ordem.
21. Com página, a lista de templates do insumo inclui `studio-paginas` na versão 1; sem página, não.
22. Trocar a ordem de duas páginas muda o `App.jsx` e o hash; trocar uma prop muda só o arquivo da
    página dela, fora o hash.
23. O teste do bloco 1 "os arquivos do plano ainda não mudam com o design" vira "com o desenho do
    Studio escolhido, o design muda os arquivos do plano".

### Estrutura e padrões

24. `exportarDesign` não lê disco nem banco: recebe tudo por argumento, e o teste dela não sobe
    servidor.
25. Nenhum trecho de código gerado é montado por concatenação fora dos moldes e fragmentos: o que o
    código faz é juntar linhas já renderizadas e indentar.
26. Molde e fragmento continuam passando só por `renderizar()`; placeholder que sobra derruba.
27. O loader de templates recusa template com `moldes/` vazio ou com molde que não é arquivo, e
    template sem `moldes/` continua valendo.
28. `pagina.module.css` só usa variáveis do `tokens.css` gerado, e define toda classe `estilos.*` que
    algum fragmento do catálogo usa (teste cruza os dois).
29. O teste de marca white-label que varre fragmentos também varre moldes e o novo CSS.
30. `npm test` e `npm run build` verdes, sem teste pulado.
31. Validado no produto rodando: projeto com desenho do Studio, página com cabeçalho, seção com
    título, texto e botão, e token de acento trocado; materializado de verdade; `npm run build` do
    projeto gerado passa; `tokens.css` e a página conferidos no disco.

### Documentação

32. `templates/README.md` descreve `moldes/` e o `studio-paginas`; `catalogo/README.md` diz como o
    fragmento vira arquivo; F-05 diz o que sai no disco.
33. `docs/09_BACKLOG/fase2.md`: bloco 6 entregue; os itens do critério da fase sobre `tokens.css` e
    rota por página marcados com a evidência, e o item "pular a etapa Design" marcado.

## 5. Edge cases conhecidos

- **Documento com tokens alterados e nenhuma página**: só o `tokens.css` muda. `App.jsx` continua o
  de hoje.
- **Nenhuma página em `/`**: as rotas saem como desenhadas; abrir `/` mostra vazio. Fica anotado
  como ideia, não é escopo.
- **Id de página que começa com número** (`404`): o componente vira `Pagina404`, identificador
  válido porque sempre tem o prefixo.
- **Projeto já materializado sem Studio que agora escolhe o desenho**: `App.jsx` e `tokens.css`
  aparecem como `sobrescrever`, e `App.module.css` antigo fica no disco, porque o plano de hoje não
  apaga. Bloco 7 trata diff.
- **Valor numérico ou booleano de prop**: passa por `valorParaJsx` como hoje.
- **Profundidade máxima (6)**: indentação cresce, e o arquivo continua válido.

## 6. Definição de "aprovado sem ressalvas"

Os 33 critérios com sim e evidência na seção 7, hash congelado intacto sem design, projeto gerado
com design compilando de verdade, `npm test` e `npm run build` verdes, sem TODO novo, sem
`console.log` e sem regressão no wizard, no Studio e na materialização.

## 7. Auditoria

> Feita depois do build, com a suíte inteira verde (98 arquivos, 1143 testes, nenhum pulado) e `npm run build` sem erro, em Windows 11,
> e com a prova real `npm run verificar:fase2` (servidor de verdade, materialização, `vite build` e
> dev server do projeto gerado).

| # | Atende | Evidência |
|---|---|---|
| 1 | sim | `design.test.js` → "exportação do design para o plano (bloco 6)" → "sem documento, o hash é o congelado e o tokens.css é o de antes, byte a byte" |
| 2 | sim | `design.test.js` → "padrão Kora escolhido na etapa Design" → "com documento salvo, gera o hash congelado e os mesmos arquivos de um projeto sem Studio", sem mudança de valor |
| 3 | sim | "desenho do Studio só com tokens padrão e sem página: o disco é o mesmo, o hash não". A base de comparação é o mesmo blueprint sem documento, porque escolher o Studio já muda os documentos do blueprint |
| 4 | sim | `shared/valores.test.js` → "o tokens.css do template não tem valor literal em variável editável" |
| 5 | sim | `shared/valores.test.js` → "uma chave por token…" e "usa os tokens recebidos"; "templates contra o mapa de valores" continua verde nos dois sentidos |
| 6 | sim | `design.test.js` → "o design vira arquivo no plano: tokens do Studio…" (`#ff0055`) e "um token trocado muda só a linha dele…" |
| 7 | sim | "um token trocado muda só a linha dele, e o escuro sai só no bloco escuro"; na prova real, item 2, `--cor-fundo: #101418` dentro do bloco escuro |
| 8 | sim | `design.test.js` → token com caractere inseguro responde 400 com o caminho `tokens.cor.acento`; os padrões passam em todo teste que salva design |
| 9 | sim | `exportarDesign.test.js` → "gera uma página por id em PascalCase e um App com as rotas na ordem do documento" (`inicio` e `sobre-nos`) |
| 10 | sim | `design.test.js` → "com página, entra studio-paginas no plano e sai o App.module.css; sem página, fica" |
| 11 | sim | "todo arquivo gerado é JSX válido", com `transformWithOxc`; na prova real o `vite build` do projeto gerado sai com 0 |
| 12 | sim | "cada nó vira o fragmento do item, com os filhos dentro e dois espaços por nível" |
| 13 | sim | "prop ausente usa o padrão do catálogo e prop presente usa o valor do documento" |
| 14 | sim | "texto com tag e chave sai neutralizado e o arquivo continua compilando" |
| 15 | sim | "origem executável %j volta ao padrão e vira pendência de valor", com quatro variações de caixa e espaço, mais `vbscript:`; e "endereço comum com javascript no meio não é pendência" |
| 16 | sim | "nó com tipo fora do catálogo some do arquivo, os irmãos ficam, e vira pendência de catálogo", e no plano "item que saiu do catálogo vira pendência de catálogo no plano, e o resto da página sai" |
| 17 | sim | "página sem região gera arquivo válido com fragmento vazio" |
| 18 | sim | "nome de página com quebra de linha não sai do comentário" |
| 19 | sim | "dois ids que viram o mesmo arquivo sem diferenciar caixa derrubam com FORGE_CONFLICT" |
| 20 | sim | "mesmo documento, mesma saída" e, no plano, "com o desenho do Studio escolhido, salvar design muda o hash, e o mesmo design gera sempre o mesmo hash" |
| 21 | sim | `servico.js` põe `studio-paginas` em `usados` só quando `exportado.usaTemplate`, e `usados` entra no insumo do hash; "sem página, não gera nada e não pede o template" e o critério 22 provam o efeito no hash |
| 22 | sim | "trocar a ordem das páginas muda App e hash; trocar uma prop muda só o arquivo da página" |
| 23 | sim | o teste virou "o design vira arquivo no plano: tokens do Studio, uma página por rota e App com as rotas (bloco 6)" |
| 24 | sim | `exportarDesign.js` não importa `fs` nem banco; o teste chama a função direto, sem servidor |
| 25 | sim | leitura de `exportarDesign.js`: o código só junta linhas já renderizadas (`join('\n')`), recua e monta o nome do componente; todo JSX vem de molde ou fragmento |
| 26 | sim | todo texto gerado passa por `renderizar()` de `shared/template.js`, que lança `ErroTemplate` com chave sem valor; "molde ausente derruba com o nome do molde" |
| 27 | sim | "loader de moldes" → "template sem moldes/ continua valendo", "lê os moldes por nome", "recusa moldes/ vazia" e "recusa molde que não é arquivo" |
| 28 | sim | "pagina.module.css define toda classe que um fragmento usa, e só usa tokens" |
| 29 | sim | "moldes e CSS nascem white-label: sem cor literal nem marca". O teste pegou "KORA FORGE" no comentário do molde de página, que saiu |
| 30 | sim | 98 arquivos, 1143 testes, nenhum pulado, `npm run build` sem erro |
| 31 | sim | `npm run verificar:fase2`: projeto `criar-site` com cabeçalho, seção com título, texto e botão, rodapé e uma segunda página com campo, acento `#d9480f`; materializado de verdade; `tokens.css`, `PaginaInicio.jsx`, `PaginaContato.jsx` e `App.jsx` conferidos no disco; `vite build` com saída 0 e dev server respondendo 200. Feito pelas funções de `src/services/`, as mesmas da interface, e não clicando na tela |
| 32 | sim | `templates/README.md` (moldes e "Tokens do Studio"), `catalogo/README.md` ("Como o fragmento vira arquivo") e `docs/05_FLUXOS/README.md` (o que sai no disco) |
| 33 | sim | `docs/09_BACKLOG/fase2.md`: bloco 6 "(entregue)", e os itens de `tokens.css`, rota por página e pular a etapa Design marcados com a evidência |

Resultado: aprovado sem ressalvas, 33 de 33.
