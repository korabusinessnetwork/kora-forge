# ADR-009, Capacidades próprias do Forge, fora da whitelist de preset

**Status**: Proposto
**Data**: 2026-09-08
**Decisores**: Matheus Bonato
**Supersede**: nenhum. Complementa o ADR-002, sem alterar nenhum dos seus quatro controles
**Absorve**: as duas propostas soltas das rodadas 2 e 5, uma sobre abrir a pasta do projeto e
outra sobre matar árvore de processos, que chegaram a ser chamadas de ADR-009 e ADR-010. Este
documento substitui as duas, e o número 010 fica livre

---

## Contexto

O ADR-002 fixou que o runner só executa comando declarado no preset e presente em
`COMANDOS_PERMITIDOS`. Essa lista é curta de propósito: `git`, `npm`, `npx`, `node`, `supabase`.
Comando novo entrando nela é atrito deliberado, porque quem escolhe o comando é um arquivo de
preset, que é dado, e dado pode vir de fora um dia.

A Fase 1 esbarrou duas vezes em algo que a whitelist não cobre, porque não é a mesma coisa:

1. **Bloco 8, tela final.** O fluxo F-01 termina com "atalho para abrir no editor", e o critério
   de aceite da fase exige criar um projeto sem tocar no terminal. Chegar na pasta que nasceu
   significa abrir o gerenciador de arquivos do sistema.
2. **R-12, parar não parava.** O ADR-002 e a RN-05 prometem que comando de longa duração é
   parável. Não era: matar o `npm` deixava o `vite` vivo, segurando porta e arquivos. Matar a
   árvore no Windows exige `taskkill`.

Nos dois casos a saída óbvia seria colocar o binário em `COMANDOS_PERMITIDOS`. Nos dois casos
isso seria errado pelo mesmo motivo: **a whitelist limita o que um preset manda executar, e
nenhum dos dois vem de preset.** Ampliá-la afrouxaria o controle para todo preset, presente e
futuro, em troca de uma ação que o Forge dispara sozinho, sobre um alvo que ele mesmo produziu.

Hoje as duas capacidades estão construídas, testadas e em uso, e **sem ADR nenhum**. É essa
lacuna que este documento fecha.

## Decisão

O Forge tem **capacidades próprias**: ações que ele executa por conta própria, fora da whitelist
de preset, sujeitas a controles mais apertados que os do runner, justamente porque ali não existe
preset para justificar flexibilidade.

Uma capacidade própria só é legítima se cumprir **todos** os cinco controles abaixo. A lista é o
critério para a próxima, e não só a descrição das duas atuais.

| # | Controle | Por quê |
|---|---|---|
| CP-1 | O binário é fixo e escolhido em código, nunca em preset, blueprint, settings, requisição ou variável de ambiente | não existe alvo variável para injetar |
| CP-2 | `spawn` com `shell: false` e array de argumentos, sem interpolação de string | mesma regra do ADR-002, controle C3 |
| CP-3 | Todo argumento é produzido pelo próprio Forge, ou validado antes contra a raiz do workspace | não há superfície vinda de fora |
| CP-4 | Falha ao executar nunca derruba o servidor nem vira exceção não tratada | capacidade acessória não pode matar o produto |
| CP-5 | Nem o argumento, nem o ambiente, nem a saída vão para log | o argumento pode ser caminho de disco |

`COMANDOS_PERMITIDOS` **não** muda. Continua com os cinco de sempre:

```js
export const COMANDOS_PERMITIDOS = Object.freeze(['git', 'npm', 'npx', 'node', 'supabase']);
```

### Capacidade 1, abrir a pasta do projeto

`server/lib/abrirPasta.js`, exposta por `POST /api/projects/:id/abrir`, usada pela tela final do
bloco 8.

- **Binário por plataforma, em código**: `explorer` no Windows, `open` no macOS, `xdg-open` no
  resto.
- **Argumento único**: a raiz do projeto lida do banco e validada com `garantirDentro` contra a
  raiz do workspace. Caminho fora do workspace é `FORGE_PATH_FORBIDDEN`.
- **Estado exigido**: projeto sem `caminhoDisco`, ou com a pasta apagada à mão, responde erro de
  campo legível em vez de tentar abrir.
- **Processo solto**, com `detached` e stdio ignorado, porque o gerenciador de arquivos vive além
  do Forge.

Abre a **pasta**, não um editor. O Forge não sabe qual editor o dono usa, não existe campo para
isso em Configurações, e criar a pergunta contraria o princípio nº 1, que manda não perguntar o
que o sistema pode inferir. O gerenciador de arquivos existe em toda máquina e leva ao projeto
qualquer que seja o editor.

### Capacidade 2, matar a árvore de processos

`server/lib/arvore.js`, usada pelo botão Parar, pelo timeout e pelo encerramento do Forge.

- **Windows**: `taskkill /T /F /PID <pid>`, por `spawn`, solto e sem stdio, para completar mesmo
  que o Forge saia em seguida. Se o `taskkill` não existir, cai para o `kill` de sempre.
- **POSIX**: nenhum binário externo. O filho nasce com `detached`, liderando o próprio grupo, e o
  sinal vai para o grupo por `process.kill(-pid, sinal)`, mantendo os dois estágios, `SIGTERM` e
  `SIGKILL` três segundos depois.
- **Argumento único**: um pid que o próprio Forge criou.

A assimetria é deliberada. No Windows não existe grupo de processo e `SIGTERM` não é sinal de
verdade, então parar é matar. Em POSIX sinal gentil funciona e vale dar ao processo a chance de
fechar arquivo.

## Alternativas Consideradas

**Colocar `explorer` e `taskkill` em `COMANDOS_PERMITIDOS`.**
Descartado porque confunde duas coisas diferentes: o que um preset pode mandar rodar, e o que o
Forge faz sozinho. Afrouxaria o controle para todo preset em troca de duas ações internas.

**Não abrir a pasta, só mostrar o caminho copiável.**
O componente `Chave` já faz isso e continua na tela. Descartado como solução única porque copiar e
colar num terminal é exatamente o que o critério de aceite da Fase 1 proíbe.

**Abrir o editor, com um campo em Configurações.**
Descartado por ora: cria uma pergunta que o princípio nº 1 manda evitar, e seria a única entrada
do produto onde o dono digita um binário a ser executado. Se um dia o Forge aprender o editor por
detecção, sem perguntar, isso vira ADR próprio.

**Grupo de processo no Windows, com `detached` e `process.kill(-pid)`.**
Descartado porque o Windows não tem grupo de processo. O Node aceita a chamada e ela não faz o que
se espera.

**Job Object do Windows.**
É a solução idiomática do sistema e mataria a árvore sem binário externo. Descartado porque o Node
não expõe a API e usá-la exigiria dependência nativa. Fica registrado como o caminho a considerar
se o Forge for empacotado como desktop.

**Não corrigir o R-12 e documentar a limitação.**
Descartado: "parável" está escrito no ADR-002 e na RN-05, e um produto que deixa processo órfão
segurando porta é um produto que o dono não consegue fechar em paz.

**Dois ADRs separados, um por capacidade.**
Descartado porque não são duas decisões, são a mesma aplicada duas vezes. Separado, cada
capacidade nova viraria um ADR quase idêntico e o princípio ficaria implícito. Se o dono preferir
dois, o conteúdo já está separado por seção e dividir é copiar duas seções.

## Consequências

- O Forge passa a ter uma segunda superfície que executa processo, além do runner. Toda revisão de
  segurança precisa olhar as duas. Em compensação, esta não tem entrada variável nenhuma.
- Existe agora um critério escrito, CP-1 a CP-5, para julgar a próxima capacidade sem reabrir a
  discussão.
- Matar árvore é assíncrono. Quem apaga pasta logo depois de parar um comando precisa esperar, e
  foi por isso que nasceu `apagarQuandoLiberar` em `server/testes/apoio.js`.
- Em POSIX o filho vira líder de grupo. Se o Forge morrer sem encerrar, o grupo sobrevive. Em
  troca, passa a ser matável de uma vez, que é o objetivo.
- O botão da tela final diz "Abrir a pasta", não "Abrir no editor". O fluxo F-01 em
  `docs/05_FLUXOS` e o bloco 8 em `docs/09_BACKLOG/mvp.md` ainda dizem "editor" e precisam ser
  corrigidos quando este ADR for aceito.

## O que foi verificado, e onde

| Capacidade | Windows | POSIX |
|---|---|---|
| Abrir a pasta | verificado de verdade: 401 sem token, erro legível para workspace ausente e projeto não materializado, e a pasta abrindo num projeto concluído | não verificado; binário escolhido por plataforma, coberto por teste com dublê |
| Matar a árvore | verificado de verdade, com `npm run dev` e medição de pid, no Parar e no timeout | não verificado; coberto por teste com dublê que prova a chamada ao grupo, `process.kill(-pid, sinal)`, nos dois estágios |

Não há máquina POSIX no ciclo até aqui. Isso está escrito aqui em vez de escondido.

## Se recusado

Os roteiros são independentes, e recusar uma não obriga a recusar a outra.

**Recusar a capacidade 1**: apagar `server/lib/abrirPasta.js` e seu teste, remover a rota
`POST /api/projects/:id/abrir`, remover `abrirPastaDoProjeto` de `src/services/projetos.js` e o
botão da `TelaFinal`. Sobra o caminho copiável, que já funciona. O critério de aceite da Fase 1
sobre não tocar no terminal fica parcialmente descoberto.

**Recusar a capacidade 2**: apagar `server/lib/arvore.js` e seu teste, e voltar `parar` a matar só
o processo direto. O R-12 reabre: o botão Parar volta a não parar o dev server e o Forge volta a
deixar processo órfão ao fechar. A prova da Fase 1 volta a precisar caçar sobras.
