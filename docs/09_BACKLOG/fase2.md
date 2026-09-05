# Fase 2, Studio

## Objetivo da fase

Sair de "o projeto nasce com a cara padrão" e chegar a: **desenhar as páginas do projeto
dentro do Forge e ver essa escolha sair no disco**, em `tokens.css`, nas rotas e no esqueleto
de cada página. Nada além disso.

O Studio não é ferramenta de desenho livre. É um editor acoplado ao design system do projeto,
e o output dele é consumido pelo gerador (**ADR-005**). Se o design system não tem, o Studio
não desenha.

## Estado

| Bloco | Estado | Spec |
|---|---|---|
| 1, documento de design e contrato | **entregue** | [`fase2-bloco1-documento-de-design.md`](../../specs/fase2-bloco1-documento-de-design.md) |
| 2, painel de tokens com preview | próximo | |
| 3, catálogo de regiões e componentes | a fazer | |
| 4, canvas | a fazer | |
| 5, etapa Design no wizard | a fazer | |
| 6, exportação para o gerador | a fazer | |
| 7, diff de design em projeto materializado | a fazer | |

## Critério de aceite da fase inteira

- [ ] Criar um projeto, desenhar no Studio e materializar, sem tocar no terminal
- [ ] O `tokens.css` do projeto gerado tem os valores escolhidos no Studio, não os do template
- [ ] Cada página desenhada vira rota e arquivo de esqueleto no projeto gerado
- [ ] Zero elemento no canvas sem componente equivalente no catálogo
- [ ] O preview do Studio não vaza nenhum estilo para a UI do Forge, e nem o contrário (P-06)
- [ ] Redesenhar um projeto já materializado gera plano de diff, e nada é escrito sem aprovação
- [ ] Pular a etapa Design continua funcionando: o projeto sai com o padrão Kora, como hoje
- [ ] Tudo funciona com o copiloto desligado
- [ ] Do clique inicial ao dev server, com design: menos de 15 minutos

## Escopo, em ordem de construção

### 1. Documento de design e contrato

Sem UI. A camada que tudo o mais assume.

- **ADR-009, serialização do documento de design.** O backlog exige ADR próprio para isto, e ele
  é pré-requisito de todos os outros blocos. Precisa decidir: formato de página, região e
  componente; como a hierarquia é representada; como versão de catálogo entra no documento; e o
  que acontece quando um componente sai do catálogo depois de ter sido usado.
- `shared/schemas/design.js`: tokens e páginas em Zod, nas duas pontas.
- Serviço e rotas `GET`/`POST /projects/:id/design`, versionadas como o blueprint: salvar cria
  versão n+1 ativa e desativa a anterior.
- A tabela `design_documents` já existe em `schema.sql` e não é alterada, só usada.
- Documento de design entra no hash do plano, senão redesenhar não invalidaria o plano aprovado.

### 2. Painel de tokens com preview ao vivo

- `PainelTokens` edita os tokens do projeto, com preview que atualiza enquanto se digita.
- **Resolvido no bloco 1 (ADR-009)**: o vocabulário canônico é o do arquivo gerado
  (`--cor-fundo`, `--espaco-1`, `--fonte-ui`), `--projeto-*` é alias de preview, e a tradução é a
  tabela `listarTokens()` de `shared/schemas/design.js`, com teste de correspondência exata nas
  duas pontas contra o `tokens.css` do template.
- Preview roda em container isolado. Nenhum token de projeto vaza para a UI da ferramenta, e a
  regra vira teste de arquitetura, como o de `fetch` e `WebSocket` da Fase 1.
- Toda pergunta com default, e "usar o padrão Kora" primeiro, como manda o princípio nº 1.

### 3. Catálogo de regiões e componentes

- Catálogo declarativo, um arquivo por item, no mesmo padrão de `presets/` e `regras/`:
  carregado do repositório, validado por Zod, sincronizado no banco no `forge:init`.
- Cada item declara: o que é, quais propriedades aceita, e **qual template gera o código dele**.
  Sem essa amarração, o Studio permite desenhar o que o gerador não sabe escrever.
- Catálogo é versionado. Componente que sai do catálogo não pode quebrar documento antigo.

### 4. Canvas

- `CanvasStudio` com zoom, pan e snap, em DOM absoluto, sem canvas 2D (**ADR-005**).
- `LayoutStudio`: camadas à esquerda, canvas ao centro, tokens e propriedades à direita.
- Navegação por teclado de ponta a ponta, foco sempre visível (regra 9 do design system).
- Desfazer e refazer. Editor sem desfazer é editor que dá medo de usar.
- Nenhum elemento livre: só o que existe no catálogo do bloco 3.

### 5. Etapa Design no wizard

- Substitui o `EtapaFutura` da etapa `design`, que hoje só marca como assumida.
- Pular continua sendo primeira classe: assumir o padrão Kora tem que continuar levando ao mesmo
  resultado de hoje, e isso vira teste de regressão.
- A etapa diz o que acontece depois, como todas as outras.

### 6. Exportação para o gerador

- O documento de design vira entrada do gerador, ao lado do blueprint.
- `tokens.css` passa a sair com os valores do Studio; sem Studio, sai o default de hoje.
- Cada página vira rota e um arquivo de esqueleto, montado a partir do template de cada
  componente do catálogo. Nada de string montada solta: template versionado, como sempre.
- Determinismo continua valendo: mesmo documento, mesmo resultado, na mesma ordem.

### 7. Diff de design em projeto já materializado

- Redesenhar um projeto que já nasceu gera plano de diff, e nada é escrito sem aprovação.
- É aqui que entra o `VisualizadorDiff`, adiado da Fase 1 justamente por não ter caso de uso
  antes deste bloco: até agora todo conflito era pasta nova, sem conflito nenhum.

## Ordem e paralelismo

O bloco 1 é pré-requisito de todos. Os blocos 2 e 3 podem ser paralelos, porque não compartilham
arquivo. O 4 depende do 3. O 5 depende do 2 e do 4. O 6 depende do 1, do 3 e do 5. O 7 depende do 6.

Cada bloco é uma spec no loop `spec → build → review`, com auditoria critério a critério anexada
como seção 7 da própria spec, e validação com o produto rodando antes de declarar feito.

## Fora do escopo da Fase 2

Canvas 2D estilo Figma, elemento livre sem componente, animação, protótipo navegável, importação
de Figma, tema claro do Forge (Fase 5), responsividade além dos breakpoints declarados nos tokens.

## Riscos da fase

| Risco | Sinal de alerta | Resposta |
|---|---|---|
| O Studio virar Figma | vontade de "só um retângulo solto" | é não-objetivo explícito em `memory/identity.md` e no ADR-005. Registrar em Ideias e voltar |
| Catálogo e templates saírem de sincronia | componente que desenha e não gera | a amarração componente → template é obrigatória no schema do catálogo, e vira teste |
| Vazamento entre `--forge-*` e `--projeto-*` | preview mudando a cor da ferramenta | container isolado mais teste de arquitetura que varre os dois namespaces |
| Documento de design velho quebrar com catálogo novo | erro ao abrir projeto antigo | catálogo versionado e recusa com mensagem clara, nunca erro silencioso (mesma lição de R-04) |
| A fase inteira crescer sem fim | bloco 4 encostando em bloco 6 | escopo fechado aqui. Item novo vai para Ideias, não para a fase em andamento |
