# Catálogo de regiões e componentes

O vocabulário do Studio. O documento de design só pode usar o que está aqui, e cada item traz o
fragmento que gera o código dele. É essa amarração que impede o Studio de deixar desenhar o que o
gerador não sabe escrever (**ADR-005**, **ADR-009**).

Item é dado declarativo versionado, no mesmo padrão de `presets/`, `regras/` e `templates/`
(padrão P-01). **Não vai para o banco**, e o paralelo certo é `templates/`: ninguém escreve no
catálogo, nada o referencia por chave estrangeira, e o documento guarda só o `tipo` como texto
mais a versão do catálogo. Cópia no SQLite seria uma segunda versão para ficar velha.

## Os itens da versão 1

| Pasta | Papel | O que é |
|---|---|---|
| `cabecalho/` | região | a faixa do topo da página |
| `secao/` | região | um bloco de conteúdo, onde a maior parte do desenho vive |
| `rodape/` | região | a faixa do fim da página |
| `titulo/` | componente | título de página ou de seção, com nível |
| `texto/` | componente | um parágrafo |
| `botao/` | componente | a ação da região, com variante |
| `imagem/` | componente | imagem com texto alternativo obrigatório |
| `campo/` | componente | rótulo, entrada e microtexto, no padrão de campo do Kora |
| `cartao/` | componente | superfície que agrupa conteúdo dentro de uma seção |

Região só entra no topo de uma página; componente, nunca. Quem decide isso é o campo `papel`, e
não convenção de nome.

## A pasta de um item

```
catalogo/<id>/
  item.json       manifesto: papel, nome, microtexto, props e o que aceita como filho
  fragmento.jsx   o JSX que o gerador escreve, com {{CHAVE}} por prop e {{FILHOS}} pelos filhos
```

O `id` do manifesto tem que ser igual ao nome da pasta. Item fora do contrato, sem fragmento ou
com fragmento incoerente **derruba o boot**, como preset, regra e template já fazem: subir pela
metade seria oferecer na tela um item que o gerador não sabe escrever.

## As duas regras que o boot confere

1. Toda `{{CHAVE}}` do fragmento é prop declarada ou a chave reservada `{{FILHOS}}`, e toda prop
   declarada aparece no fragmento. Nos dois sentidos, senão catálogo e geração saem de sincronia.
2. Só quem aceita filhos usa `{{FILHOS}}`, e quem aceita é obrigado a usar. Folha com `{{FILHOS}}`
   nunca teria conteúdo; container sem ele perderia o filho na geração.

Valor de prop é dado, nunca código: passa por `escaparValorJsx()` de `shared/jsx.js` antes de
entrar no fragmento. O motor continua sendo o `renderizar()` de `shared/template.js`, que só troca
chave por valor, sem condicional, sem laço, sem `eval`.

Nenhum item traz marca, cor, nome ou regra de cliente: todo projeto gerado nasce white-label, e um
teste varre os fragmentos atrás disso.

Contrato completo em `docs/03_REGRAS_DE_NEGOCIO/catalogo.md`. Schema em
`shared/schemas/catalogo.js`.
