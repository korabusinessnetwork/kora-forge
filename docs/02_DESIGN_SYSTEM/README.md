# 02, Design System

> **Regra que não pode ser quebrada:** existem **dois** design systems neste produto e
> eles nunca se misturam (padrão P-06).
>
> - `--forge-*`: a aparência da ferramenta. Fixa, definida aqui.
> - `--projeto-*`: a aparência do projeto que o usuário está criando, editada no Studio e exportada no blueprint.
>
> Componente do Forge nunca lê token de projeto. Preview do Studio roda em container
> isolado, com os tokens do projeto, e não vaza estilo para a UI da ferramenta.

## Princípio aplicado

Intuitividade (princípio nº 1). Densidade alta de informação, mas hierarquia clara.
Ferramenta de trabalho para sessões longas em desktop, não vitrine.

## Tokens do Forge

### Cor (tema escuro, padrão)

| Token | Valor | Uso |
|---|---|---|
| `--forge-bg` | `#0E0F12` | fundo da aplicação |
| `--forge-surface` | `#16181D` | painéis e cartões |
| `--forge-surface-2` | `#1D2026` | elementos elevados, popover |
| `--forge-border` | `#282C34` | divisórias |
| `--forge-text` | `#E8EAED` | texto primário |
| `--forge-text-muted` | `#9AA0A9` | texto secundário |
| `--forge-accent` | `#F2A65A` | ação primária, marca da forja |
| `--forge-accent-weak` | `#3A2A18` | fundo de destaque |
| `--forge-success` | `#4CAF7D` | comando concluído |
| `--forge-warning` | `#E0B341` | aviso do motor de regras |
| `--forge-danger` | `#E0574A` | erro, ação destrutiva |
| `--forge-info` | `#5B9BD5` | dica, sugestão do copiloto |

Tema claro entra na Fase 5 (ver `docs/09_BACKLOG/README.md`) e usa os mesmos nomes de token com outros valores.
Nenhum componente pode ter cor fora de token.

### Tipografia

| Token | Valor |
|---|---|
| `--forge-font-ui` | `Inter, "Segoe UI", system-ui, sans-serif` |
| `--forge-font-mono` | `"JetBrains Mono", "Cascadia Code", monospace` |
| `--forge-text-xs` | `12px / 16px` |
| `--forge-text-sm` | `13px / 20px` |
| `--forge-text-md` | `15px / 24px` |
| `--forge-text-lg` | `20px / 28px` |
| `--forge-text-xl` | `28px / 36px` |

No CSS, tamanho e altura de linha são tokens separados: `--forge-text-*` e `--forge-leading-*`.

Mono é obrigatório em: caminho de arquivo, comando, log, nome de tabela, chave de env.

### Espaçamento, raio, sombra, motion

| Token | Valor |
|---|---|
| `--forge-space-1` a `--forge-space-8` | `4, 8, 12, 16, 24, 32, 48, 64` px |
| `--forge-radius-sm / md / lg` | `4 / 8 / 14` px |
| `--forge-shadow-1` | `0 1px 2px rgba(0,0,0,.4)` |
| `--forge-shadow-2` | `0 8px 24px rgba(0,0,0,.5)` |
| `--forge-motion-fast` | `120ms ease-out` |
| `--forge-motion-base` | `200ms ease-out` |
| `--forge-focus-ring` | `0 0 0 2px var(--forge-bg), 0 0 0 4px var(--forge-accent)` |

Animação é funcional (mostrar de onde algo veio, indicar progresso). Nada decorativo.
Respeitar `prefers-reduced-motion`.

## Regras de UI

1. **Uma etapa, uma tela.** Nunca duas perguntas grandes competindo pela atenção.
2. **Todo campo tem default visível** e a opção "usar o padrão Kora" vem primeiro.
3. **Todo campo tem microtexto** dizendo o que ele afeta no resultado, por exemplo "isso vira o nome da pasta e o slug do repositório".
4. **Quatro estados obrigatórios** em todo componente que carrega dado: carregando, vazio, erro, sucesso. Vazio nunca é tela em branco, sempre traz a próxima ação.
5. **Ação destrutiva** é vermelha, exige confirmação e diz exatamente o que será afetado.
6. **Log ao vivo** é sempre visível durante execução, com opção de parar. Nunca spinner mudo.
7. **Aviso do motor de regras** aparece perto do campo que o causou, não em uma lista no fim.
8. Alvo de clique mínimo de 32px de altura em desktop.
9. Foco de teclado sempre visível. O wizard inteiro é navegável só com teclado.

## Tokens do projeto (editados no Studio)

O Studio edita um conjunto paralelo, que **não** afeta a UI do Forge e que é exportado
para o projeto gerado como `src/styles/tokens.css`:

`--projeto-bg`, `--projeto-surface`, `--projeto-text`, `--projeto-accent`,
`--projeto-font-ui`, `--projeto-radius-md`, escala de espaçamento e breakpoints.

Regra herdada do padrão Kora: no projeto gerado, esses tokens vêm do tenant em tempo de
execução, nunca hardcodados. O Studio produz o **default** do tenant, não uma marca fixa.
