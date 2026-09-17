# Os itens do catálogo, desenhados no Forge

Um componente React por item de `catalogo/`, mais o palco isolado onde eles rodam. É o que faz o
canvas mostrar o **componente de verdade** em vez de um desenho dele, que é a promessa do
**ADR-005**.

## Por que existe uma segunda encarnação do item

O item já tem um `fragmento.jsx` no catálogo, e o bloco 6 é quem vai transformá-lo em arquivo no
projeto gerado. Interpretar esse fragmento aqui no navegador seria compilar JSX em tempo de
execução, ou seja `new Function` com outro nome, e isso é proibido pela constituição. Então o
canvas tem a sua própria encarnação de cada item.

Duas encarnações da mesma coisa é exatamente o risco que a Fase 2 lista: catálogo e desenho saírem
de sincronia. Por isso a sincronia é **teste**, e não intenção. `registro.test.jsx` lê o catálogo
real do disco e confere que:

1. o conjunto de renderizadores é exatamente o conjunto de ids do catálogo;
2. cada renderizador lê exatamente as props que o item declara, nem mais nem menos;
3. quem aceita filhos usa `children`, e quem não aceita não usa.

Item novo no catálogo sem renderizador derruba a suíte. Prop declarada que ninguém desenha,
também.

## A convenção que a guarda depende

A guarda lê o código-fonte do renderizador, e não uma lista declarada ao lado, porque lista ao lado
é mais uma coisa para ficar velha. Para isso funcionar:

- a assinatura é sempre `function Nome({ props, children })`;
- toda leitura de prop é `props.<id>`, **nunca** desestruturada;
- filhos entram por `children`, que é o `{{FILHOS}}` do fragmento.

## Tokens

Tudo aqui é zona do projeto (P-06): só `--projeto-*`, nunca `--forge-*`. O contorno de seleção, o
zoom e o resto da moldura são da ferramenta e vivem no `CanvasStudio`, fora desta pasta.
`namespaces.test.js` varre os dois sentidos.
