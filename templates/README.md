# Templates

O que o gerador escreve. Template é dado versionado, nunca código (padrão P-03, **ADR-007**).

Cada template é uma pasta com:

- `template.json`: `id`, `versao`, `descricao` e `ordem` de escrita.
- `arquivos/`: a estrutura espelha o destino no projeto gerado. Adicionar um arquivo ao template
  é criar o arquivo aqui, sem tocar em código.

| Template | Ordem | O que gera |
|---|---|---|
| `fundacao-kora` | 10 | `CLAUDE.md`, `README.md`, `memory/` e `docs/00` a `11`, com ADR-001 preenchido |
| `config-base` | 20 | `.gitignore` e `.env.example` |
| `vite-react` | 30 | `package.json`, `vite.config.js`, `index.html` e as raízes do app |
| `design-tokens` | 35 | `src/styles/tokens.css` e `global.css` |
| `camada-de-servicos` | 40 | `src/services/`, o único ponto que fala com o backend |

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
