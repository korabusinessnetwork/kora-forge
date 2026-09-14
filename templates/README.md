# Templates

O que o gerador escreve. Template é dado versionado, nunca código (padrão P-03, **ADR-007**).

Cada template é uma pasta com:

- `template.json`: `id`, `versao`, `descricao` e `ordem` de escrita.
- `arquivos/`: a estrutura espelha o destino no projeto gerado. Adicionar um arquivo ao template
  é criar o arquivo aqui, sem tocar em código.
- `moldes/` (opcional): templates que o gerador usa para montar arquivo derivado de outro dado, e
  que nunca são escritos direto. Só arquivos, e a pasta não pode estar vazia, senão o boot cai.

| Template | Ordem | O que gera |
|---|---|---|
| `fundacao-kora` | 10 | `CLAUDE.md`, `README.md`, `memory/` e `docs/00` a `11`, com ADR-001 preenchido |
| `config-base` | 20 | `.gitignore` e `.env.example` |
| `vite-react` | 30 | `package.json`, `vite.config.js`, `index.html` e as raízes do app |
| `design-tokens` | 35 | `src/styles/tokens.css` e `global.css` |
| `camada-de-servicos` | 40 | `src/services/`, o único ponto que fala com o backend |
| `studio-paginas` | 45 | Só quando o desenho do Studio tem página: `src/paginas/pagina.module.css`, e pelos moldes uma `src/paginas/Pagina<Id>.jsx` por página e o `src/App.jsx` com uma rota por página. Nesse caso o `src/App.module.css` sai do plano |

A `ordem` segue RN-05.4: fundação, config, código. O plano sai nessa ordem e, dentro dela, por
caminho.

## Placeholder

Só `{{CHAVE}}`, em maiúscula. Sem condicional, sem laço, sem expressão: o motor
(`shared/template.js`) apenas troca chave por valor. Quando um template precisar de condicional, a
decisão vira regra no motor (**ADR-004**), não sintaxe nova aqui.

Toda chave precisa existir em `shared/valores.js`. Chave sem valor derruba a geração com
`FORGE_TEMPLATE_INCOMPLETO`, porque placeholder que sobra na saída é bug, não pendência
(aprendizado A-04). Um teste cruza as chaves de todos os arquivos contra o mapa nos dois sentidos:
chave sem valor reprova, e chave no mapa que nenhum template usa também.

## Tokens do Studio

O `tokens.css` do `design-tokens` não tem valor literal: cada variável editável é uma chave
`{{TOKEN_…}}` derivada do nome da variável (`--cor-fundo` vira `TOKEN_COR_FUNDO`, e no bloco escuro
`TOKEN_ESCURO_COR_FUNDO`). O valor vem do documento de design efetivo ou, sem ele, dos padrões de
`shared/schemas/design.js`, que reproduzem byte a byte o arquivo de antes, guardado em
`server/modules/gerador/fixtures/tokens-padrao.css`. Por isso o manifesto continua na versão 1.
