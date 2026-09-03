# 02, Design System

Tem interface: {{TEM_UI}}. White-label: {{WHITE_LABEL}}.

> Quando white-label é Sim, os tokens vêm do tenant em tempo de execução. Nenhuma marca, cor ou
> nome de cliente pode estar hardcodado no código.

## Tokens

Os tokens vivem em `src/styles/tokens.css`, como CSS vars. Nenhum componente pode ter cor,
espaçamento, raio ou fonte fora de token.

| Grupo | Tokens |
|---|---|
| Cor | fundo, superfície, borda, texto, texto secundário, acento, sucesso, aviso, perigo, info |
| Tipografia | família de UI, família mono, escala de tamanho e altura de linha |
| Espaçamento | escala de 4 a 64 |
| Raio, sombra, motion | pequeno, médio, grande |

## Regras de UI

1. Todo campo tem default visível e microtexto dizendo o que ele afeta.
2. Quatro estados obrigatórios em todo componente que carrega dado: carregando, vazio, erro, sucesso.
3. Estado vazio nunca é tela em branco. Sempre traz a próxima ação.
4. Ação destrutiva é vermelha, exige confirmação e diz exatamente o que será afetado.
5. Foco de teclado sempre visível. Fluxo principal navegável só com teclado.
6. Animação é funcional. Respeitar `prefers-reduced-motion`.
