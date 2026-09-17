# ADR-009, Serialização do documento de design

**Status**: Proposto
**Data**: 2026-09-05
**Decisores**: Matheus Bonato
**Supersede**: nenhum

---

## Contexto

O **ADR-005** decidiu construir o Studio, um editor visual próprio, acoplado ao design system do
projeto, cujo output é consumido pelo gerador. O que ele não decidiu foi **em que formato esse
output é gravado**, e o backlog da Fase 2 registra que isso exige ADR próprio.

A decisão é necessária agora porque ela é pré-requisito de todos os outros seis blocos da fase:
o painel de tokens escreve nesse formato, o catálogo é referenciado por ele, o canvas o edita, o
gerador o lê e o diff o compara.

Três restrições vindas de decisões já tomadas apertam o formato:

1. **Determinismo é inegociável** (princípio nº 2). O mesmo documento tem que gerar o mesmo
   projeto, na mesma ordem. Formato com ambiguidade de ordenação quebra isso.
2. **O ADR-005 diz duas coisas que parecem brigar**: implementação com "DOM absoluto, zoom e pan",
   e "layout exportado é estrutura (regiões, componentes, hierarquia), não pixel-perfect". Se o
   documento guardar coordenada, o export para JSX volta a ser tradução perdida, que é exatamente
   o problema que o Studio existe para resolver.
3. **O `tokens.css` gerado já tem vocabulário próprio**, em uso pelos cinco templates:
   `--cor-fundo`, `--espaco-1`, `--fonte-ui`. O `docs/02` chama os tokens editáveis de
   `--projeto-*`. Sem decidir qual é o canônico, o Studio edita uma coisa e o projeto nasce com
   outra.

## Decisão

O documento de design é **dado declarativo versionado**, gravado em `design_documents`, com três
partes: `catalogo`, `tokens` e `paginas`.

**1. Hierarquia é árvore aninhada, não lista plana com `paiId`.**
Cada nó tem `filhos`, e a ordem dos irmãos é a ordem do array. Não existe campo de ordenação
separado, porque campo de ordenação é uma segunda fonte de verdade esperando dessincronizar. A
árvore serializa quase um para um no JSX que ela vai gerar.

**2. O documento não guarda coordenada.**
Nada de `x`, `y`, largura em pixel. Uma página é uma pilha de regiões em ordem de fluxo, e uma
região contém componentes em ordem de fluxo. O "DOM absoluto" do ADR-005 é técnica de
**renderização da superfície** do canvas, que é o que permite zoom e pan; o snap é à grade da
região, não a pixel livre. Assim o que se vê é o que exporta, e mover um componente é reordenar
um array, não arrastar um número.

**3. A versão do catálogo entra no documento.**
`catalogo: { versao }` é gravado junto. O documento é lido sempre contra a versão que o criou.

**4. Componente que sai do catálogo não corrompe documento antigo.**
O documento nunca é reescrito nem apagado por conta disso. Ao abrir, o Studio recusa com mensagem
que nomeia o componente e a versão, e oferece a próxima ação. No gerador, vira **pendência
declarada**, do mesmo jeito que template ausente já vira hoje. Nunca erro silencioso, nunca
"some do desenho sem avisar" (mesma lição do risco R-04).

**5. O vocabulário canônico dos tokens é o do arquivo gerado.**
O documento grava `tokens.cor.fundo`, `tokens.espaco[1]`, `tokens.fonte.ui`: os mesmos nomes que
o `tokens.css` já usa e que os templates já consomem. `--projeto-*` é **alias de preview dentro do
Forge**, existente só para o preview não colidir com `--forge-*` (padrão P-06), e o mapeamento
entre os dois é uma tabela explícita e testada, não convenção implícita.

**6. Documento de design entra no hash do plano.**
Junto com blueprint, preset e templates. Sem isso, redesenhar não invalidaria um plano já
aprovado, e o servidor executaria um plano diferente do que a pessoa viu, contra o ADR-002.

**7. Versionamento igual ao do blueprint.**
Salvar cria versão n+1 ativa e desativa a anterior. Projeto sem documento de design é estado
normal e válido, não erro: significa "usei o padrão Kora", que é o comportamento de hoje e
precisa continuar funcionando.

## Alternativas Consideradas

### 1. Lista plana de nós com `paiId` e `ordem`

- **Prós**: fácil de indexar, mover nó é trocar um campo, casa bem com tabela relacional
- **Contras**: duas fontes de verdade para a mesma coisa (a árvore e a ordem), e toda leitura
  precisa remontar a hierarquia antes de gerar qualquer coisa
- **Descartada porque**: ordem duplicada é convite a documento internamente inconsistente, e
  documento inconsistente quebra o determinismo, que é princípio inegociável

### 2. Guardar coordenada absoluta por elemento, estilo Figma

- **Prós**: liberdade total de posicionamento, canvas mais parecido com o que se espera de editor
- **Contras**: a exportação vira tradução de pixel para layout, que é o problema notoriamente mal
  resolvido que o ADR-005 recusou; e dois documentos visualmente iguais podem ter coordenadas
  diferentes, então o diff do bloco 7 acusaria mudança onde não houve
- **Descartada porque**: reintroduz exatamente o problema que o Studio existe para eliminar

### 3. Guardar HTML ou JSX direto como string

- **Prós**: exportação trivial, é copiar
- **Contras**: deixa de ser dado e vira código; não dá para validar com Zod de forma útil, não dá
  para diffar por estrutura, e abre a porta para conteúdo arbitrário virar código gerado
- **Descartada porque**: fere "toda geração passa por template versionado, nada de string montada
  solta", e transformaria conteúdo do documento em superfície de execução

### 4. Reaproveitar o blueprint, com o design dentro dele

- **Prós**: uma tabela a menos, uma rota a menos, versionamento já pronto
- **Contras**: o blueprint é conduzido pelo wizard e versiona a cada avanço de etapa; o design
  versiona a cada sessão de desenho. Juntar os dois faria cada arrastar de componente gravar uma
  versão de blueprint, e cada avanço de etapa sujar o histórico de design
- **Descartada porque**: são dois ciclos de vida diferentes, e a tabela `design_documents` já
  existe no schema justamente por isso

## Consequências

### Positivas

- O que está no documento tem correspondência direta no JSX gerado, sem camada de tradução
- Determinismo preservado: uma única ordenação possível, um único resultado
- Diff de design fica legível, porque compara estrutura e não coordenada
- Documento antigo continua abrindo, e a incompatibilidade aparece como pendência com nome
- Projeto sem design continua nascendo exatamente como hoje, então a Fase 1 não regride

### Negativas e trade-offs

- **Sem posicionamento livre.** Não dá para colocar um elemento "solto" em cima de outro. Isso é
  limitação de propósito, coerente com o ADR-005, mas vai frustrar em algum momento
- O canvas precisa comunicar bem que o snap é à região, senão a pessoa tenta arrastar para um
  lugar que o modelo não representa e não entende por que não vai
- A tabela de mapeamento token de preview para token exportado é trabalho de manutenção contínuo:
  token novo entra nos dois lados ou o preview mente
- Árvore aninhada é mais chata de editar em memória que lista plana, e o desfazer do bloco 4 vai
  precisar de cópia estrutural, não de patch de campo

## Referências

- [ADR-002, runner de comandos](./adr-002-runner-de-comandos.md), de onde vem a regra do hash
- [ADR-005, Studio, editor visual próprio](./adr-005-studio-editor-proprio.md), decisão que esta detalha
- [ADR-007, presets declarativos versionados](./adr-007-presets-declarativos.md), mesmo padrão de catálogo versionado
- `docs/02_DESIGN_SYSTEM/README.md`, os dois namespaces de token e o padrão P-06
- `docs/04_MODELAGEM/schema.sql`, tabela `design_documents`
- `docs/09_BACKLOG/fase2.md`, os sete blocos que dependem desta decisão

## Notas de Implementação

- Schemas em `shared/schemas/design.js`, estritos, usados nas duas pontas
- Serviço e rotas espelham `salvarBlueprint` e `GET /projects/:id/blueprint/versoes`
- O hash do plano passa a incluir `design: { versao }` mais o payload, via `serializarEstavel`
- Profundidade da árvore tem teto declarado, porque documento sem teto é caminho para estouro de
  pilha na renderização e no gerador
