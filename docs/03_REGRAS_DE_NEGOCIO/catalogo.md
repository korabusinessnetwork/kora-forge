# Catálogo de regiões e componentes

> Contrato do vocabulário do Studio. Detalha **RN-08** e implementa as decisões 3 e 4 do
> **ADR-009**. Schema em `shared/schemas/catalogo.js`, itens em `catalogo/`.

## O que o catálogo resolve

O Studio não é ferramenta de desenho livre (**ADR-005**). O que ele deixa desenhar é exatamente o
que o gerador sabe escrever, e o catálogo é o lugar onde isso fica declarado, um item por vez.

Sem catálogo, `noSchema` aceitaria qualquer `tipo` slug: o desenho gravaria bonito e a
materialização descobriria tarde que não existe código para aquilo.

## O item

| Campo | O que é |
|---|---|
| `id` | slug, igual ao nome da pasta |
| `versao` | versão do item |
| `papel` | `regiao` ou `componente` |
| `nome` | como aparece na paleta |
| `descricao` | o que o item é |
| `microtexto` | o que ele afeta no resultado (regra 3 do design system) |
| `props` | as propriedades editáveis |
| `aceita` | ids que podem ser filhos. Lista vazia é folha |

O contrato é **estrito**: campo a mais é recusa, com o nome do campo.

## A prop

| Campo | O que é |
|---|---|
| `id` | slug. Vira `{{ID_EM_MAIUSCULA}}` no fragmento |
| `tipo` | `texto`, `numero`, `booleano` ou `opcao` |
| `rotulo` | o nome do campo na tela |
| `microtexto` | o que este campo afeta |
| `padrao` | obrigatório, do tipo declarado |
| `obrigatoria` | se o documento precisa trazer a prop |
| `opcoes` | só em `opcao`, com o `padrao` entre elas |

**Toda prop tem padrão**, sem exceção. Pergunta sem default é carga mental que o sistema já podia
ter tirado (princípio nº 1). `obrigatoria` diz se o documento precisa trazer a prop, não se ela tem
valor: valor sempre existe, nem que seja o do catálogo.

## Aninhamento

1. Região só entra no topo de uma página. Componente, nunca.
2. Componente entra onde o pai o declarou em `aceita`.
3. Região nunca é filha de nada.
4. O teto de profundidade do documento (`PROFUNDIDADE_MAXIMA`, seis níveis) continua valendo.
   `aceita` é um segundo limite, por item e mais apertado.

## Do item ao código gerado

Cada item traz `fragmento.jsx`, template versionado como qualquer outro. `{{CHAVE}}` por prop,
`{{FILHOS}}` pelos filhos. O motor é o mesmo `renderizar()` de `shared/template.js`: só troca
chave por valor, sem condicional, sem laço, sem `eval` e sem `new Function`.

No boot, duas coerências são conferidas, e qualquer uma quebrada derruba o processo:

- toda chave do fragmento é prop declarada ou `{{FILHOS}}`, e toda prop aparece no fragmento;
- só quem aceita filhos usa `{{FILHOS}}`, e quem aceita é obrigado a usar.

**Valor de prop é dado, nunca código.** Antes de entrar no fragmento, passa por
`escaparValorJsx()` de `shared/jsx.js`, que neutraliza `<`, `>`, `{`, `}` e aspas. Um título com
`</h1><script>` vira texto, não injeção no projeto do usuário.

Nenhum item traz marca, cor, nome ou regra de cliente: todo projeto gerado nasce white-label e
multi-tenant, e isso vale para o catálogo como vale para os templates.

## Ciclo de vida do item, e o que acontece quando ele sai

Assimetria deliberada (**ADR-009**, decisão 4):

- **Na escrita**, o documento é conferido contra o catálogo. Tipo inexistente, prop não declarada,
  valor fora do tipo, obrigatória ausente e aninhamento não aceito são recusa `FORGE_VALIDATION`,
  com `caminho` apontando o nó (`paginas.0.regioes.1.filhos.0.props.variante`), nunca o documento
  inteiro. Prop opcional ausente **não** é erro: vale o padrão do catálogo.
- **Na leitura**, o documento volta **inteiro**, e o que o catálogo não conhece mais vem em
  `pendencias`, com o id do nó, o tipo ausente, a página e as duas versões de catálogo. Nada é
  reescrito, nada é apagado. `pendencias` é sempre lista, nunca `null`.

Documento vindo de um Forge mais novo (catálogo à frente) continua sendo recusado ao salvar, com
as duas versões na mensagem.

## Onde o catálogo mora

Em disco, em `catalogo/`, carregado no boot. **Não vai para o banco.** O paralelo é `templates/`,
não `presets/`: preset está no banco porque o usuário pode ter preset custom e o projeto fixa
`presetId` mais versão, e regra está no banco porque `rule_hits` a referencia. Nada disso vale
para o catálogo v1, e uma cópia no SQLite seria só uma segunda versão para ficar velha.
