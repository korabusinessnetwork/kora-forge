# Auto-Reforja, o Forge melhorando a própria forja

> Spec da frente T09 da onda paralela (D06 e D08 em `.full-auto/DECISOES.md`). Pedido do dono,
> prioridade 2: "uma page onde a gente vai fazer auto-reforge no próprio aplicativo, um lugar onde
> vamos melhorar a nossa própria forja". Decisão de arquitetura em
> `docs/08_DECISOES/adr-014-auto-reforja.md`. Fluxo em `docs/05_FLUXOS/f-11-auto-reforja.md`.

## 1. Escopo

A página `/reforja` diagnostica o repositório do próprio Forge de forma determinística, mantém um
backlog de melhorias que anda pelo ciclo do harness (spec, build, review), gera a spec de uma
melhoria por template versionado com prévia antes de gravar, e, só quando o gateway de modelos
gratuitos está ligado e conectado, pede sugestões a um modelo, que o dono aceita uma a uma.

## 2. Fora de escopo

- Executar o build ou o review de uma melhoria. O Forge registra em que ponto do ciclo o item está;
  quem constrói continua sendo o Claude Code (ADR-008, decisão 2).
- Editar título, descrição ou prioridade de um item já criado. Descartar e criar outro resolve.
- Apagar item. Item é descartado, e descartado pode ser restaurado.
- Sinal de "texto de UI fora de `mensagens`". Não há detecção confiável sem um parser de JSX, e um
  sinal que acusa errado ensina o dono a ignorar o painel.
- Diagnóstico de projeto gerado. A varredura olha só o repositório do Forge.
- Aplicar a sugestão do modelo a arquivo. Sugestão vira item de backlog, nunca escrita em disco.
- Registro de código de erro novo em `server/lib/erro.js` e `shared/erros.js`. É arquivo
  compartilhado; a frente usa os códigos existentes e o pedido vai no relatório.
- Mexer em `server/app.js`, `src/App.jsx`, `src/mensagens.js`, migrations ou `schema.sql`.

## 3. Arquivos afetados

Criados:

- `shared/reforja/estados.js`, `sinais.js`, `propostas.js`, `spec.js`, `resumo.js` e testes.
- `shared/schemas/reforja.js` e teste.
- `server/modules/reforja/varredura.js`, `templates.js` e testes; `servico.js` e `rotas.js`
  substituem os stubs; `servico.test.js`, `rotas.test.js`, `sugestoes.test.js`.
- `templates-reforja/spec/manifesto.json` e `spec.md`.
- `templates-reforja/sugestao/manifesto.json`, `sistema.md` e `usuario.md`.
- `src/services/reforja.js` e teste.
- `src/features/reforja/`: `PaginaReforja.jsx` substitui o stub, mais `PainelDiagnostico`,
  `CartaoSinal`, `CicloDoBacklog`, `CartaoItem`, `FormNovaMelhoria`, `PreviaSpec`,
  `PainelSugestoes`, `SeloSeveridade`, cada um com CSS Module, e `PaginaReforja.test.jsx`.
- `src/mensagens/reforja.js` recebe todos os textos, mantendo a chave `titulo`.
- `docs/08_DECISOES/adr-014-auto-reforja.md` e `docs/05_FLUXOS/f-11-auto-reforja.md`.

Nenhum arquivo compartilhado é modificado.

## 4. Critérios de aceite

### Diagnóstico

1. `varrerForge(raiz)` lê só `src`, `server`, `shared`, `specs` e `docs/09_BACKLOG`, ignora
   `node_modules`, `dist`, `.git`, `.claude`, `worktrees` e `coverage` em qualquer nível, e devolve
   os arquivos ordenados por caminho relativo com barra normal.
2. A varredura nunca segue symlink de pasta, e ignora symlink de arquivo cujo caminho real está
   fora da raiz. Provado com fixture em pasta temporária.
3. Arquivo acima de `LIMITE_BYTES_ARQUIVO` não é lido: entra com conteúdo nulo e só pode aparecer
   como arquivo grande, com contagem nula.
4. `calcularSinais` é função pura, sem `fs`, e produz no máximo sete sinais, cada um com `id`
   estável, `titulo`, `severidade` (`alta`, `media`, `baixa`), `sugestao`, `unidade`, `total` de
   arquivos, `ocorrencias` e `evidencias` (`arquivo`, `contagem`), limitadas a 20 com
   `evidenciasOcultas` dizendo quantas ficaram de fora.
5. Sinal `marcadores-pendentes`: marcador TODO, FIXME ou XXX logo depois de abertura de comentário,
   em código de produto (`.js` e `.jsx` de `src`, `server` e `shared`, fora de teste, `testes/` e
   `fixtures/`).
6. Sinal `console-log-em-produto`: chamada a `console.log` em código de produto, sem contar
   comentário.
7. Sinal `sem-teste-colocalizado`: `.js` de `shared/` ou `server/` fora de teste sem
   `<nome>.test.js` na mesma pasta e sem nenhum teste da mesma pasta que importe `./<nome>.js`.
8. Sinal `arquivos-grandes`: código de produto com mais linhas que `LIMITE_LINHAS` (400), com o
   limite exportado e documentado no ADR-014.
9. Sinais `specs-sem-auditoria` e `specs-com-criterio-pendente`: spec em `specs/` (fora de `_*.md`)
   sem seção de nível 2 chamada Auditoria, Review ou Revisão; ou com essa seção contendo linha de
   tabela numerada cuja coluna de aprovação (Sim, Atende, Aprovado ou Resultado) não começa com
   "sim".
10. Sinal `backlog-nao-entregue`: linha de tabela Bloco/Estado em `docs/09_BACKLOG/*.md` cujo estado
    não diz "entregue" nem "provado".
11. Sinais saem ordenados por severidade (alta, media, baixa) e depois por `id`; evidências por
    contagem decrescente e depois por arquivo. Sinal sem evidência não aparece.
12. Diagnosticar duas vezes a mesma árvore dá resultado idêntico (`toEqual`), provado com fixture.
13. `GET /api/reforja/diagnostico` devolve `{ sinais, resumo, arquivosLidos, limites }` validado
    por `diagnosticoSchema`, sem escrever nada.

### Backlog e ciclo

14. A máquina de estados em `shared/reforja/estados.js` é pura e aceita só: proposta para
    especificada; especificada para em_construcao ou proposta; em_construcao para em_revisao ou
    especificada; em_revisao para concluida ou em_construcao; concluida para em_revisao; qualquer
    estado aberto para descartada; descartada para proposta. Testada transição a transição.
15. `POST /api/reforja/itens` cria item manual com título obrigatório (até 120), descrição opcional
    (até 2000) e prioridade opcional (`media` por padrão). Entrada fora do contrato é
    `FORGE_VALIDATION` com o campo apontado.
16. `POST /api/reforja/itens/do-sinal` com `{ sinalId }` recalcula o diagnóstico no servidor, cria
    item com origem `diagnostico`, título e sugestão do sinal, e prioridade derivada da severidade.
    Sinal que não existe no diagnóstico atual é `FORGE_NOT_FOUND`.
17. Transformar o mesmo sinal com item aberto (fora de concluida e descartada) não duplica: devolve
    o item existente com `criado: false`. Com o item anterior descartado ou concluído, cria outro.
18. `PATCH /api/reforja/itens/:id/estado` com `{ para }` só aplica transição válida; inválida é
    `FORGE_CONFLICT` com `de` e `para` no detalhe; o mesmo estado é idempotente e não emite evento;
    item inexistente é `FORGE_NOT_FOUND`.
19. Nenhuma rota apaga item. Não existe `DELETE`.
20. `GET /api/reforja/itens` devolve todos os itens, com prioridade alta primeiro e mais antigos
    primeiro dentro da prioridade, e `contagem` com os seis estados, zero incluído.
21. Eventos `reforja.item_criado`, `reforja.estado_mudou`, `reforja.spec_gerada` e
    `reforja.sugestoes_recebidas` são emitidos por `registrarEvento`, sem texto livre no payload.

### Spec por template

22. O template da spec vive em `templates-reforja/spec/`, com `manifesto.json` versionado e
    validado por Zod, e é renderizado com `renderizar()` de `shared/template.js`. Nenhum trecho da
    spec é montado por concatenação no código.
23. A spec gerada tem as seções Escopo, Fora de escopo, Arquivos afetados, Critérios de aceite, Edge
    cases e Definição de aprovado, com "_a definir_" onde o item não tem informação, e nenhum
    placeholder sobrando.
24. O caminho é `specs/reforja-<slug>.md`, com slug de `gerarSlug` e fallback pelo id quando o título
    não tem letra nem número. Resolvido por `resolverNoWorkspace` contra `raizForge`; `..`, caminho
    absoluto ou symlink da pasta `specs` para fora da raiz é `FORGE_PATH_FORBIDDEN`.
25. `POST /api/reforja/itens/:id/spec/previa` não escreve nada e devolve `caminho`, `conteudo`,
    `existe` e `versaoTemplate`. O conteúdo é o mesmo em duas chamadas.
26. `POST /api/reforja/itens/:id/spec` grava o arquivo; se ele já existe e `sobrescrever` não é
    `true`, responde `FORGE_CONFLICT` sem tocar no arquivo.
27. Depois de gravar, o item guarda `specCaminho`, e um item em `proposta` passa para
    `especificada`. Item em estado posterior mantém o estado. Item descartado é `FORGE_CONFLICT`.

### Sugestão por modelo gratuito

28. Com `modelos` ausente, sem `estado()`, desligado ou desconectado,
    `GET /api/reforja/sugestoes/estado` devolve `disponivel: false` com o motivo
    (`sem_modelos`, `desligado`, `desconectado`), e `POST /api/reforja/sugestoes` recusa sem chamar
    `completar`.
29. A mensagem enviada ao modelo sai de templates versionados em `templates-reforja/sugestao/` e
    carrega só título, severidade, total e ocorrências de cada sinal, nunca conteúdo nem caminho de
    arquivo, e declara que o resumo é dado e não instrução.
30. `interpretarPropostas` é pura e tolerante: aceita JSON puro, em bloco de código ou cercado de
    texto, como lista ou como `{ propostas }`; descarta item sem título utilizável; remove
    caractere de controle; corta título em 120 e descrição em 600; ignora título repetido; aceita
    no máximo 5 e conta o resto em `descartadas`. Resposta sem JSON reconhecível devolve lista
    vazia com `formatoReconhecido: false`.
31. Erro de `completar` com código `FORGE_MODELOS_DESLIGADO` ou `FORGE_MODELOS_INDISPONIVEL` chega
    ao cliente como erro com código e mensagem legível; erro desconhecido nunca vaza a mensagem
    original.
32. Nenhuma proposta é gravada pelo servidor ao receber a resposta. O texto da resposta não vai
    para log nem para evento.

### Página

33. `PaginaReforja` substitui o stub, com subcomponentes em arquivos próprios, CSS Module
    co-localizado, nenhum estilo inline e nenhum texto de interface fora de `mensagens.reforja`.
34. Diagnóstico, backlog e sugestões mostram carregando, erro com tentar de novo, vazio com a
    próxima ação e sucesso com feedback humano em `role="status"`.
35. O backlog aparece como trilho do ciclo com as cinco colunas (proposta a concluída), contagem por
    coluna, o que acontece depois em linguagem humana, e as descartadas num grupo recolhido.
36. Cada cartão oferece só as ações que a máquina de estados permite. Descartar pede confirmação na
    própria linha antes de enviar.
37. "Transformar em melhoria" num sinal que já tem item aberto aparece desabilitado com o texto "já
    está no backlog".
38. Gerar spec abre a prévia com caminho em fonte mono e conteúdo; gravar só acontece depois do
    clique em confirmar; arquivo existente mostra aviso e só grava com a caixa de sobrescrita
    marcada.
39. Com sugestões indisponíveis, a ação aparece desabilitada com o motivo e link para
    Configurações, e todo o resto da página funciona.
40. Propostas do modelo aparecem com aceitar e dispensar por proposta; aceitar cria item com origem
    `modelo`; nada é aceito sem clique.
41. O front fala com a API só por `src/services/reforja.js`, com toda resposta validada por Zod, e
    toda `mutationFn` é função encapsulada (R-10).

### Qualidade

42. Sem `console.log`, sem marcador pendente, sem travessão em texto português dos arquivos da
    frente.
43. `npx vitest run` inteiro verde e `npm run build` sem erro, na worktree.

## 5. Edge cases conhecidos

- Pasta `specs/` ausente na raiz: a gravação cria a pasta, depois de validar o caminho.
- Arquivo criado entre a prévia e a gravação: a gravação usa `wx` e responde `FORGE_CONFLICT`.
- Duas abas mudando o mesmo estado: repetir a mesma transição é idempotente.
- Título do item só com símbolos: o slug cai para `item-<8 primeiros do id>`.
- Resposta do modelo gigante: só os primeiros 20 mil caracteres são considerados.
- Modelo devolve `sinal`, `caminho` ou qualquer campo extra: é ignorado, proposta tem só título e
  descrição.
- `modelos.estado()` lança, apesar do contrato: tratado como desconectado.
- Diagnóstico sobre repositório sem `docs/09_BACKLOG` ou sem `specs`: sem erro, só sem esses sinais.

## 6. Definição de "aprovado sem ressalvas"

Os 43 critérios em sim, com `npx vitest run` verde, `npm run build` sem erro, nenhum arquivo fora
da lista de propriedade da frente alterado, e nenhum `console.log` ou marcador pendente nos arquivos
da frente.
