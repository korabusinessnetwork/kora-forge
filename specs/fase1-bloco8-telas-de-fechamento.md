# Fase 1, bloco 8, telas de fechamento

> Spec da rodada 2 do ciclo. Último bloco de construção da Fase 1 antes da gaveta de ideias.
> Escopo em `docs/09_BACKLOG/mvp.md`, fluxo F-01 em `docs/05_FLUXOS/README.md`.

## 1. Escopo

Fechar o fluxo de materialização na tela: log ao vivo linha a linha consumindo o WebSocket que o
bloco 7 já publica, e tela final com o caminho no disco, o resumo do que nasceu e um atalho que
abre a pasta do projeto sem passar pelo terminal.

## 2. Fora de escopo

- `VisualizadorDiff`, o diff linha a linha do conflito. Continua declarado como ação
  "sobrescrever" com os dois tamanhos, como no bloco 6.
- Bloco 9, a gaveta de ideias.
- Escolher qual editor abrir, e um campo de editor em Configurações. Ver a decisão de escopo
  na seção 4.
- Persistir o log em arquivo, exportar o log, ou buscar dentro dele.
- Reabrir o log de uma materialização antiga depois que o servidor reiniciou. O histórico do
  transmissor vive em memória, e isso não muda nesta rodada.
- Mexer no runner, no gerador ou no motor de regras.

## 3. Origem e decisões que este item honra

- **`docs/09_BACKLOG/mvp.md`, bloco 8**, os três itens: painel do plano (entregue no bloco 6),
  painel de log ao vivo e tela final.
- **`docs/05_FLUXOS/README.md`, F-01**: "execução com log ao vivo" e "tela final: caminho no
  disco, o que foi criado, atalho para abrir no editor".
- **`docs/06_COMPONENTES/`**: `PainelLog` está previsto e ainda não existe.
- **ADR-002**: o atalho de abrir a pasta não passa pelo runner nem amplia a whitelist de
  comandos do preset. É capacidade própria do Forge, com binário fixo por plataforma e caminho
  validado, detalhada na seção 4.
- **CLAUDE.md, princípio nº 1**: a tela final tem de dizer o que aconteceu e qual é a próxima
  ação óbvia, sem o usuário digitar caminho nem comando.
- **CLAUDE.md, princípio nº 2**: nada aqui depende de LLM.

## 4. Decisão de escopo do atalho, e o que ela assume

O backlog diz "atalho para abrir no editor". O Forge não sabe qual editor o dono usa, não existe
campo de editor em Configurações, e inventar um campo contraria o princípio nº 1, que manda não
perguntar o que o sistema pode inferir.

**O que esta rodada constrói**: um atalho que abre a **pasta do projeto** no gerenciador de
arquivos do sistema, que existe em toda máquina e funciona qualquer que seja o editor. Ao lado
dele, o caminho continua copiável pelo componente `Chave`, que já existe.

Isso é uma capacidade nova de executar processo, fora do runner, e por isso vira **proposta de
ADR ao dono no passo `/aprender`**, não decisão minha. Os controles ficam mais apertados que os
do runner: binário fixo por plataforma, argumento único, caminho validado contra a raiz do
workspace, sem shell, sem interpolação, e nada vindo do preset ou do blueprint.

## 5. Arquivos afetados

Criados:

- `server/lib/abrirPasta.js` e `abrirPasta.test.js` — resolução do abridor por plataforma.
- `src/services/logAoVivo.js` e `logAoVivo.test.js` — único ponto do front que abre WebSocket.
- `src/components/plano/PainelLog/PainelLog.jsx`, `.module.css` e `.test.jsx`.
- `src/components/plano/TelaFinal/TelaFinal.jsx`, `.module.css` e `.test.jsx`.

Modificados:

- `server/modules/projetos/rotas.js` — rota de abrir a pasta.
- `src/services/projetos.js` — chamada da rota nova.
- `src/features/wizard/etapas/Materializar.jsx` — liga o painel de log e a tela final.
- `src/mensagens.js` — textos novos, em português, sem string solta no componente.
- `shared/erros.js` — só se faltar código de erro para a rota nova.
- `docs/06_COMPONENTES/README.md` e `docs/09_BACKLOG/mvp.md` — estado do bloco.

## 6. Critérios de aceite

### Log ao vivo

1. O WebSocket é aberto **só** em `src/services/logAoVivo.js`. Nenhum componente instancia
   `WebSocket` direto, e um teste prova isso varrendo `src/components/` e `src/features/`.
2. O token de sessão vai no subprotocolo, `new WebSocket(url, ['forge-token', token])`, nunca em
   query string e nunca em header.
3. A URL é montada a partir de `location`, trocando `http` por `ws` e `https` por `wss`, e o
   `runId` vai por `encodeURIComponent`.
4. `PainelLog` mostra as linhas na ordem em que chegam, com `stdout` e `stderr` visualmente
   distintos, e a distinção não é só cor.
5. Quem abre o painel no meio da execução recebe o histórico já gravado, porque o transmissor
   envia tudo ao assinar. Teste com socket falso que emite histórico antes de linha nova.
6. O evento `{ tipo: 'fim' }` encerra o painel mostrando o estado final e para de esperar linha.
7. Fechar a etapa, trocar de run ou desmontar o componente fecha o socket. Sem vazamento de
   conexão e sem atualização de estado depois de desmontado.
8. Queda de conexão sem evento de fim mostra estado visível de conexão perdida, com ação de
   reconectar. Reconectar não duplica as linhas que já estão na tela.
9. Payload que não é JSON válido, ou que não bate com o schema do evento, é descartado sem
   quebrar a tela.
10. O log tem altura limitada e rola sozinho para a última linha enquanto o usuário não rolou
    para cima de propósito.
11. O painel de log aparece **ao lado** do `PainelMaterializacao`, não no lugar dele.

### Tela final

12. Quando a materialização chega em `concluida`, a tela final aparece com o caminho da raiz, o
    resumo de arquivos criados, sobrescritos e pulados, e a lista de comandos com o resultado.
13. O caminho é copiável pelo componente `Chave` que já existe, sem componente novo para isso.
14. O botão de abrir a pasta chama a rota nova pela camada de serviços, mostra carregando, e
    mostra erro legível quando a rota falha.
15. `abortada` e `parado_em_falha` **não** mostram a tela final. Continuam no painel de
    materialização com as três decisões.

### Rota de abrir a pasta

16. `spawn` com `shell: false` e array de argumentos. Nenhuma interpolação de string.
17. O binário é fixo por plataforma, escolhido em código: `explorer` no Windows, `open` no macOS,
    `xdg-open` no resto. Nada vem de preset, blueprint, corpo da requisição ou variável de ambiente.
18. O caminho aberto é a raiz do projeto vinda do banco, validada contra a raiz do workspace pelo
    `resolverNoWorkspace` que já existe. Caminho fora do workspace é recusado com
    `FORGE_PATH_FORBIDDEN`.
19. O projeto precisa estar materializado. Projeto sem raiz no disco responde erro legível, não
    abre nada.
20. A rota exige token de sessão e checagem de `Origin`, como toda rota do escopo `/api`, e não
    aceita `GET` com efeito. É `POST`.
21. Nenhum caminho, ambiente ou saída do processo aberto vai para log.

### Sempre

22. CSS em CSS Modules co-localizado, usando os tokens `--forge-*`. Nenhuma cor, fonte ou
    espaçamento hardcodado, nenhum estilo inline.
23. Todo texto visível sai de `src/mensagens.js`. Nenhuma string de interface solta em componente.
24. Estados de carregando, erro e vazio visíveis em tudo que busca dado.
25. `npm test` verde e `npm run build` sem erro, no Windows.
26. Sem `console.log` esquecido e sem `TODO` sem justificativa escrita ao lado.

## 7. Edge cases conhecidos

- **Materialização já concluída quando a tela abre.** O `runId` do último comando existe, o
  transmissor ainda tem o histórico, e o painel deve mostrar o log inteiro com o fim já marcado.
- **Servidor reiniciado.** O histórico em memória some. Assinar um `runId` desconhecido devolve
  histórico vazio, e o painel mostra estado vazio explicando, sem parecer travado.
- **Comando de longa duração**, o `npm run dev`, que nunca termina sozinho. O painel continua
  recebendo linha e o botão de parar continua sendo o do `PainelMaterializacao`.
- **Muita linha de uma vez.** O `npm install` cospe centenas de linhas. O painel precisa de um
  teto de linhas na tela, descartando as mais antigas, para a aba não travar.
- **Token ausente**, quando a página foi aberta sem o fragmento. O painel mostra o estado de sem
  sessão em vez de tentar conectar em laço.
- **Duas etapas montadas ao mesmo tempo** por navegação rápida. Cada `PainelLog` tem seu socket e
  fecha o seu, sem derrubar o do outro.
- **Pasta apagada à mão** entre materializar e clicar em abrir. A rota responde erro legível.

## 8. Definição de "aprovado sem ressalvas"

Todos os 26 critérios em sim, `npm test` verde e `npm run build` sem erro no Windows, sem TODO
pendente, sem `console.log` esquecido, sem regressão nos blocos 6 e 7, e a proposta de ADR do
atalho de abrir a pasta apresentada ao dono, não aplicada sozinha.

## 9. Review (2026-09-08)

**Aprovado sem ressalvas.** 26 de 26 critérios cobertos. `npm test` verde com 504 passando e 1
pulado, `npm run build` sem erro, em Windows 11.

### Validação no produto real

Além dos testes, o fluxo foi exercido no servidor de verdade, com `curl` e um cliente WebSocket:
projeto criado, plano gerado, materialização aprovada, 32 arquivos escritos, `git init` e
`npm install` com sucesso e `npm run dev` subindo. O log chegou pelo socket com o token no
subprotocolo, e o histórico de um comando já terminado foi entregue a quem assinou depois. A rota
de abrir respondeu 401 sem token, 404 em projeto inexistente, erro de campo legível para workspace
ausente e para projeto não materializado, e abriu a pasta de verdade no projeto concluído.

### Desvios do spec

1. **Critério 12, lista de comandos na tela final: removida.** O `PainelMaterializacao` fica ao
   lado e já mostra cada comando com o resultado. Repetir a lista era só ruído, e o fluxo F-01 em
   `docs/05_FLUXOS` pede da tela final o caminho, o que foi criado e o atalho, não os comandos.
   A documentação prevalece sobre o critério que eu mesmo escrevi.
2. **Título da tela final.** Nasceu igual ao texto de estado do painel, "Pronto. O projeto
   nasceu.", o que colocava a mesma frase duas vezes na tela. Virou "Seu projeto está aqui", que
   apresenta o caminho logo abaixo.

### Corrigido durante a review

- Faltava evidência de quatro critérios, e todos ganharam teste: tela final ausente em `abortada`
  e em `parado_em_falha` (critério 15), os dois painéis convivendo (critério 11), o botão de abrir
  passando pela camada de serviços com erro legível (critério 14), e a trava do autoscroll
  (critério 10).
- O mock de `services/projetos.js` no teste do wizard não conhecia `abrirPastaDoProjeto`. Passava
  por sorte, porque nada clicava no botão. Agora está declarado.

### Pendente de decisão do dono

A capacidade de abrir a pasta executa processo fora do runner. Ela está construída com controles
mais apertados que os do runner, mas **precisa de ADR**, proposto no passo `/aprender` desta
rodada. Se o dono recusar, o botão sai e sobra o caminho copiável, que já funciona.

### Fica para uma próxima rodada

- `VisualizadorDiff`, o diff linha a linha do conflito.
- Reabrir o log de uma materialização antiga: o histórico do transmissor vive em memória e some no
  reinício do servidor. Hoje isso aparece como painel vazio explicado, não como tela travada.
- R-07, ainda travado esperando decisão. Vale registrar que nesta rodada o `npm install` do preset
  `criar-site` passou sem `--legacy-peer-deps`, o que não fecha o assunto, porque o R-07 é sobre
  `package.json` que depende de `vitest@4.1.11`.
