# R-12, parar um comando mata a árvore de processos

> Spec da rodada 5 do ciclo. Defeito descoberto pela prova do critério de aceite da Fase 1.
> Registro em `memory/bugs.md`, R-12.

## 1. Escopo

Fazer o Parar do runner parar de verdade: matar o processo que o Forge criou **e** os que ele
criou, em qualquer profundidade, tanto no botão Parar quanto ao encerrar o Forge.

## 2. Fora de escopo

- R-11, log de comando de longa duração que não chega ao banco.
- Ampliar `COMANDOS_PERMITIDOS`, a whitelist de comando declarado por preset. Ela não é tocada.
- Timeout, que já mata e continua matando pelo mesmo caminho novo, sem mudança de contrato.
- Reiniciar comando parado, ou parar a fila inteira de uma vez.
- Dependência nova, nativa ou não.

## 3. Origem e decisões que este item honra

- **R-12 em `memory/bugs.md`**, com a medição que provou o defeito: filho morto, neto vivo.
- **`docs/09_BACKLOG/fase1-aceite.md`**, que registrou o achado na prova da fase.
- **ADR-002, controle C3**: sem shell, sem interpolação, array de argumentos. A correção obedece.
- **RN-05**, o comando de longa duração é destacado e **parável**. Hoje ele não é, e é essa
  promessa que a rodada cumpre.

## 4. A decisão de arquitetura, e por que ela não amplia a whitelist

Matar árvore de processos não é portátil. Foram testadas as alternativas na máquina do dono:

| Caminho | Resultado |
|---|---|
| `processo.kill()`, o de hoje | mata o `npm`, o `vite` sobrevive. É o defeito. |
| `spawn` com `detached` e `process.kill(-pid)` | no Windows não existe grupo de processo; não serve |
| Job Object do Windows | resolveria, mas o Node não expõe, e exigiria dependência nativa |
| `taskkill /T /F /PID` | **mata a árvore inteira**, verificado até bisneto |

**Decisão**: no Windows, `taskkill /T /F /PID <pid>`. Em POSIX, o filho passa a ser criado em
grupo próprio, com `detached`, e o grupo inteiro recebe o sinal por `process.kill(-pid, sinal)`.

**Isso não amplia a whitelist.** `COMANDOS_PERMITIDOS` existe para limitar o que um **preset** pode
mandar executar. `taskkill` não vem de preset, de blueprint nem de requisição: é capacidade do
próprio Forge, com binário fixo escolhido em código e um argumento só, que é um pid que o Forge
criou. É a mesma forma do abridor de pasta do bloco 8. **Vira proposta de ADR ao dono no passo
`/aprender`**, não decisão minha.

## 5. Assimetria deliberada entre as plataformas

- **Windows**: `taskkill /T /F` é forçado e imediato. Não existe equivalente gentil que funcione
  para processo de console, então parar é matar.
- **POSIX**: mantém os dois estágios de hoje, `SIGTERM` no grupo e `SIGKILL` no grupo depois de
  3 s, porque ali sinal gentil funciona e dá ao processo a chance de fechar arquivo.

A assimetria fica escrita no código, junto do porquê.

## 6. O que será provado em cada plataforma

**Windows, de verdade**: um comando que cria neto e bisneto é iniciado, parado, e nenhum
sobrevive. É a plataforma do dono e a que tinha o defeito.

**POSIX, por teste com dublê**: não há máquina POSIX nesta rodada. O que se prova é que o caminho
chama `process.kill(-pid, sinal)`, com o pid negativo do grupo, e nos dois estágios. Isso fica
escrito no relatório sem maquiagem.

## 7. Arquivos afetados

Criados:

- `server/lib/arvore.js` e `arvore.test.js` — parar árvore, por plataforma.

Modificados:

- `server/lib/processo.js` — `parar` e o timeout passam pela árvore; `detached` em POSIX.
- `server/lib/processo.test.js` — teste com processo que cria filho, e o caso do timeout.
- `scripts/verificar-fase1.mjs` — a limpeza de sobras deixa de ser necessária.
- `memory/bugs.md` — R-12 fechado, com a correção.

## 8. Critérios de aceite

1. No Windows, parar um comando que criou neto e bisneto não deixa nenhum vivo. Provado matando um
   `npm run dev` de verdade e conferindo cada pid.
2. `parar` continua devolvendo `true` na primeira chamada e `false` para processo já morto.
3. O comando parado continua terminando com estado `cancelado`, e não `falha`.
4. Encerrar o Forge mata a árvore de todo comando em andamento, pelo mesmo caminho.
5. Timeout também mata a árvore, e continua reportando `timeout`.
6. Em POSIX o filho nasce em grupo próprio, e o sinal vai para o grupo, `process.kill(-pid, ...)`,
   nos dois estágios. Provado com dublê.
7. No Windows nada muda nas opções de `spawn`: `detached` só entra em POSIX.
8. `taskkill` é chamado por `spawn`, com `shell: false` e array de argumentos, sem interpolação de
   string. O único argumento variável é o pid.
9. `COMANDOS_PERMITIDOS` não muda, e `validarComando` não é chamado para o `taskkill`.
10. Falha ao chamar o `taskkill`, se ele não existir, cai para o `kill` de hoje e **nunca** derruba
    o servidor nem vira exceção não tratada.
11. O teste de invariante "a única API de child_process usada é spawn" continua verde. Nada de
    `execSync`, `execFileSync` ou `shell: true`.
12. Nenhum pid, caminho ou ambiente é escrito em log.
13. `npm test` verde e `npm run build` sem erro, no Windows.
14. `npm run verificar:fase1` continua com os oito itens passando, e **sem** precisar matar sobras:
    a limpeza que existia só por causa do R-12 sai, e sobra vira sintoma de regressão.
15. Sem `console.log` esquecido e sem `TODO` sem justificativa escrita ao lado.

## 9. Edge cases conhecidos

- **Processo já morto quando o parar chega.** `taskkill` reclama e sai com código diferente de
  zero. Isso não é erro para o Forge: o resultado desejado já aconteece.
- **Pid reciclado.** Entre o processo morrer e o `taskkill` rodar, o sistema pode ter reusado o
  número. A janela é pequena e o Node só entrega o pid enquanto o handle vive, mas o `parar` já
  recusa processo com `exitCode` ou `signalCode` preenchido, e essa guarda continua valendo.
- **`taskkill` ausente**, em Windows enxuto ou PATH quebrado. Cai para o `kill` de hoje, que ao
  menos mata o filho direto, e segue.
- **Parar duas vezes.** A segunda devolve `false` e não dispara nada.
- **Encerrar o Forge no meio.** O `taskkill` é solto e sem stdio, então completa mesmo que o
  processo pai saia logo em seguida.
- **Comando folha**, sem filho nenhum, que é o caso do `git init`. Continua parando igual.

## 10. Definição de "aprovado sem ressalvas"

Os quinze critérios em sim, `npm test` verde e `npm run build` sem erro no Windows, a prova da
Fase 1 passando sem a limpeza de sobras, o defeito reproduzido e depois não reproduzido com
medição de pid, e a proposta de ADR apresentada ao dono em vez de aplicada.

## 11. Review (2026-09-08)

**Aprovado sem ressalvas.** Quinze de quinze critérios cobertos. `npm test` verde com 595 passando
e 1 pulado, `npm run build` sem erro, e `npm run verificar:fase1` com os oito itens passando sem a
limpeza de sobras, em Windows 11.

### A prova de que o teste é guarda de verdade

A primeira versão do teste usava um `node` criando outro `node`, e **passava mesmo com o defeito
presente**: nesse formato o filho morre junto com o pai no Windows. Medido lado a lado, só a forma
real reproduz o órfão:

| Forma | Neto depois de matar o pai |
|---|---|
| `node pai.js` → `node filho.js` | morre junto |
| `npm run dev` → `node servidor.js` | **sobrevive**, é o defeito |

O teste foi reescrito com a forma que quebra, e depois a correção foi revertida de propósito para
ver o teste ficar vermelho. Só então ele contou como guarda.

### Corrigido durante a review

Dois testes do runner quebraram, apagando a pasta temporária logo depois de encerrar. Não era
defeito da correção: matar árvore é assíncrono, e os processos ainda seguravam os arquivos. O
`maxRetries` do `fs.rmSync` não resolveu, porque a retentativa é síncrona e não cede tempo ao
sistema. Nasceu `apagarQuandoLiberar` em `server/testes/apoio.js`, que espera de verdade entre as
tentativas.

Vale notar o paradoxo: aqueles testes só passavam antes porque o produto deixava o neto vivo em
outra pasta, sem segurar a pasta que estava sendo apagada.

### Cobertura por plataforma, sem maquiagem

- **Windows**: verificado de verdade, com `npm run dev` e medição de pid, no Parar e no timeout.
- **POSIX**: verificado por teste com dublê, que prova a chamada `process.kill(-pid, sinal)` com o
  pid negativo do grupo, nos dois estágios. Não há máquina POSIX nesta rodada.

### Pendente de decisão do dono

**ADR-010**, proposto e não aplicado, sobre o Forge chamar `taskkill`, um binário do sistema fora
da whitelist. A whitelist de preset não foi tocada. É a segunda capacidade própria do Forge, depois
do abridor de pasta do ADR-009, e os dois compartilham o mesmo princípio. Se o dono preferir, viram
um ADR só.
