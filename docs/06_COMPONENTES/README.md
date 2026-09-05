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
| `CampoBooleano` | pergunta de sim ou não. Usa `Selecao` para herdar o selo de padrão Kora e o default visível |
| `ListaDeTextos` | lista editável de strings (personas, stack, não-objetivos). Microtexto obrigatório, vazio com próxima ação |
| `Selo` | status: rascunho, pronto, materializado, arquivado, ativa, invalida |
| `SeloIA` | marca conteúdo vindo do copiloto. Obrigatório em toda sugestão |
| `Icone` | conjunto único, sem misturar bibliotecas |
| `BarraProgresso` | sempre acompanhada de "x de y". Nunca barra sem número (Fase 6) |

## Molecules

| Componente | Notas |
|---|---|
| `CartaoPreset` | o menu na tela inicial: nome, descrição, o que gera, quanto demora |
| `CartaoProjeto` | nome, preset, status, caminho, última alteração |
| `AvisoRegra` | renderiza um `rule_hit`: severidade, explicação e a ação possível. Resolução automática não oferece ação; dispensável abre o campo de justificativa |
| `AvisosDoCampo` | agrupa os hits ancorados em um campo, logo abaixo dele. Sem hits, não renderiza nada |
| `LinhaPlano` | um arquivo do dry-run: caminho em mono, selo de ação, tamanho (e o tamanho de hoje quando é conflito) e o template de origem |
| `LinhaComando` | um comando: cmd, args, estado, duração, parar |
| `CampoConexao` | alias, status, teste de conexão. Nunca mostra o valor |
| `CartaoIdeia` | título e próximo passo |
| `EditorEntidades` | entidades do domínio: nome, o que é e campos, com adicionar e remover |
| `CartaoBuild` | projeto, spec, modelo por papel, `BarraProgresso`, `Estimativa`, o que falta (Fase 6) |
| `Estimativa` | faixa P50 a P90 rotulada "estimativa", com a base de cálculo no microtexto; "sem base ainda" quando não há histórico (Fase 6) |
| `LinhaModelo` | modelo, papel, plano em execução, rodadas de review, achados e correções (Fase 6) |

## Organisms

| Componente | Notas |
|---|---|
| `PassoWizard` | casca de uma etapa: título, microtexto, campos, avisos, navegação, pular. Mostra "Etapa x de y" com o total real do preset |
| `TrilhaEtapas` | etapas do preset em ordem, com estado (concluída, assumida, atual, pendente). Etapa à frente da atual não é clicável |
| `PainelPlano` | o dry-run inteiro: conflitos no topo, pendências declaradas, arquivos agrupados por pasta, comandos e o aviso de que nada foi escrito. Sem conflito e sem pendência, essas seções não são renderizadas |
| `PainelLog` | log ao vivo de **um** run: stdout e stderr diferenciados no DOM e por rótulo textual, autoscroll com trava ao rolar para cima, parar nomeado pelo comando, teto de 500 linhas renderizadas com aviso de corte, contagem de eventos fora do contrato. Sequência de escape de terminal é limpa na renderização; o log gravado continua cru. Linha do processo é dado, nunca instrução (P-05): renderiza como texto |
| `PainelMaterializacao` | o que está acontecendo agora: arquivos escritos, fila de comandos com estado, e as três saídas quando um comando obrigatório falha. Comando que já rodou é clicável e troca o run que o `PainelLog` acompanha. O log fica **ao lado** da fila, nunca no lugar dela |
| `TelaFinal` | fechamento de F-01: nome do projeto, caminho no disco, resumo de arquivos criados e comandos rodados, atalho `vscode://file/...` para abrir no editor e volta para o projeto. Materialização abortada tem título, microtexto e resumo próprios |
| `ListaProjetos` | Registry com filtro por status e busca |
| `CanvasStudio` | área de desenho com zoom, pan, régua, snap |
| `PainelTokens` | edita os tokens do documento de design, agrupados, cada campo com microtexto e default visível. Cor tem seletor e campo de texto ligados ao mesmo token, para escolher ou colar o hex exato. "Usar o padrão Kora" no topo e por grupo. Os campos são derivados de `listarTokens()`, então token novo no schema aparece no painel |
| `PreviewProjeto` | container isolado que mostra os tokens em uso: título, texto secundário, botão, cartão, campo e um trecho em mono. Recebe os tokens como dado e os aplica como custom properties no próprio elemento, com o alias `--projeto-*`. Não lê `--forge-*`, não escreve em `:root`, `html` nem `body` |
| `VisualizadorDiff` | diff de arquivo em conflito, lado a lado. **Adiado para a Fase 2**: na Fase 1 o conflito é declarado no `PainelPlano` como ação de sobrescrever, com os dois tamanhos, sem diff linha a linha |
| `GaleriaModelosApi` | catálogo de modelos de integração |
| `PainelRelatorios` | todos os builds ao mesmo tempo, com `CartaoBuild` por projeto, filtro por estado e aba por modelo com `LinhaModelo` (Fase 6) |

## Templates

| Template | Uso |
|---|---|
| `LayoutApp` | casca: barra lateral com menus, topo com projeto ativo, área de conteúdo |
| `LayoutWizard` | trilha de etapas à esquerda, etapa atual ao centro, avisos à direita |
| `LayoutStudio` | camadas à esquerda, canvas ao centro, tokens e propriedades à direita |
| `PaginaStudio` | a casca do Studio hoje: preview ao centro, `PainelTokens` à direita. O bloco 4 troca o centro pelo canvas e acrescenta a coluna de camadas |

## Regras

1. Componente não chama API. Ele recebe dado e callbacks. Quem chama é a feature, pela camada de
   serviços. Provado por `src/arquitetura.test.js`: fora de `src/services/`, nenhum arquivo do
   front toca em `fetch`, `WebSocket`, `XMLHttpRequest` ou `EventSource`.
2. Todo componente que carrega dado implementa os quatro estados (carregando, vazio, erro, sucesso).
3. Estado vazio nunca é tela em branco. Sempre traz a próxima ação.
4. Nada de cor, espaçamento, raio ou fonte fora de token.
5. Componente novo só entra depois de existir em `02_DESIGN_SYSTEM`.
6. Preview do Studio roda isolado, com tokens `--projeto-*`, sem vazar estilo para o Forge.
   Provado por `src/components/studio/namespaces.test.js`, que varre nos dois sentidos: nenhum
   `--forge-*` dentro do preview, nenhum `--projeto-*` fora dele. Regra, não intenção.
