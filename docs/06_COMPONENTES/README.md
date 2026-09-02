# 06, Componentes

Atomic design. Componente do Forge usa exclusivamente tokens `--forge-*` (P-06).
Um componente por arquivo, PascalCase, CSS Module co-localizado.

```
src/
├── components/
│   ├── shared/            atoms e molecules reutilizáveis
│   └── <feature>/         componentes específicos da feature
├── features/
│   ├── registry/
│   ├── wizard/
│   ├── studio/
│   ├── apihub/
│   └── config/
└── services/              único ponto que fala com a API local
```

## Atoms

| Componente | Notas |
|---|---|
| `Botao` | variantes: primario, secundario, fantasma, destrutivo. Estado de carregando embutido |
| `Campo` | label, microtexto obrigatório, erro, valor default visível |
| `CampoSegredo` | mascarado, sem autocomplete, nunca ecoa valor, nunca vai para o log |
| `Selecao` | opção "padrão Kora" sempre primeiro, com selo |
| `Chave` | exibe `PATH`, comando ou nome de tabela em mono, com copiar |
| `Selo` | status: rascunho, pronto, materializado, arquivado, ativa, invalida |
| `SeloIA` | marca conteúdo vindo do copiloto. Obrigatório em toda sugestão |
| `Icone` | conjunto único, sem misturar bibliotecas |

## Molecules

| Componente | Notas |
|---|---|
| `CartaoPreset` | o menu na tela inicial: nome, descrição, o que gera, quanto demora |
| `CartaoProjeto` | nome, preset, status, caminho, última alteração |
| `AvisoRegra` | renderiza um `rule_hit`: severidade, explicação, ação. Fica junto do campo |
| `LinhaPlano` | um arquivo do dry-run: caminho, ação, tamanho, conflito |
| `LinhaComando` | um comando: cmd, args, estado, duração, parar |
| `CampoConexao` | alias, status, teste de conexão. Nunca mostra o valor |
| `CartaoIdeia` | título e próximo passo |

## Organisms

| Componente | Notas |
|---|---|
| `PassoWizard` | casca de uma etapa: título, microtexto, campos, avisos, navegação, pular |
| `PainelPlano` | o dry-run inteiro, agrupado por pasta, com total e conflitos no topo |
| `PainelLog` | log ao vivo, stdout e stderr diferenciados, autoscroll com trava, parar |
| `ListaProjetos` | Registry com filtro por status e busca |
| `CanvasStudio` | área de desenho com zoom, pan, régua, snap |
| `PainelTokens` | edição dos tokens `--projeto-*` com preview ao vivo |
| `VisualizadorDiff` | diff de arquivo em conflito, lado a lado |
| `GaleriaModelosApi` | catálogo de modelos de integração |

## Templates

| Template | Uso |
|---|---|
| `LayoutApp` | casca: barra lateral com menus, topo com projeto ativo, área de conteúdo |
| `LayoutWizard` | trilha de etapas à esquerda, etapa atual ao centro, avisos à direita |
| `LayoutStudio` | camadas à esquerda, canvas ao centro, tokens e propriedades à direita |

## Regras

1. Componente não chama API. Ele recebe dado e callbacks. Quem chama é a feature, pela camada de serviços.
2. Todo componente que carrega dado implementa os quatro estados (carregando, vazio, erro, sucesso).
3. Estado vazio nunca é tela em branco. Sempre traz a próxima ação.
4. Nada de cor, espaçamento, raio ou fonte fora de token.
5. Componente novo só entra depois de existir em `02_DESIGN_SYSTEM`.
6. Preview do Studio roda isolado, com tokens `--projeto-*`, sem vazar estilo para o Forge.
