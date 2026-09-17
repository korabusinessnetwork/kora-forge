# R-11, o log persiste sem esperar o comando terminar

> Spec da rodada 7 do ciclo. Defeito descoberto pela prova do critério de aceite da Fase 1.
> Registro em `memory/bugs.md`, R-11.

## 1. Escopo

Fazer o log de comando chegar em `command_logs` enquanto o comando roda, sem depender de ele
terminar nem de acumular cinquenta linhas.

## 2. Fora de escopo

- Ler log gravado de volta na tela. Hoje o painel usa o WebSocket, e reabrir log de materialização
  antiga continua fora do escopo, como já estava no bloco 8.
- Rotacionar, podar ou limitar `command_logs`. A tabela cresce, e isso é item próprio.
- Mudar o contrato do evento do WebSocket, que já entrega linha a linha na hora.
- R-07, R-10, B-01 e B-02.
- Mexer no `processo.js` ou na árvore de processos.

## 3. Origem e decisões que este item honra

- **R-11 em `memory/bugs.md`**, com o sintoma: a prova da Fase 1 tentou ler a URL do dev server em
  `command_logs` e encontrou zero linhas para um comando visivelmente rodando.
- **`docs/09_BACKLOG/fase1-aceite.md`**, que registrou o achado.
- **ADR-002**: cada execução fica registrada em `command_runs`, com log. Registro que só existe se
  o comando terminar não é registro, é sorte.
- **CLAUDE.md**: "Log de atividade é fire-and-forget, nunca bloqueia a operação principal". A
  correção mantém isso: gravar continua podendo falhar sem derrubar nada.

## 4. A causa, em uma frase

`server/modules/runner/servico.js` acumula as linhas num array e só grava quando junta cinquenta
ou quando o comando termina. `npm run dev` cospe umas dez linhas e nunca termina, então nenhuma é
gravada, e o log daquele comando não existe no banco até alguém pará-lo.

## 5. A decisão de produto que a rodada toma

O R-11 ficou registrado dizendo que o intervalo é decisão de produto: gravar demais castiga o
disco, gravar de menos perde log. A escolha é **um segundo**, e a razão é que o intervalo não
governa a experiência de ninguém.

Quem olha o painel recebe pelo WebSocket, na hora, e não depende do banco. O banco serve para
depois: reabrir, auditar, entender o que aconteceu. Nesse uso, um segundo de atraso é invisível, e
o custo é uma escrita por segundo apenas enquanto há linha nova esperando. Em rajada, como o
`npm install`, o teto de cinquenta linhas continua mandando e o intervalo nem chega a disparar.

Os dois números viram constante nomeada, com o porquê ao lado, em vez de literal solto no meio do
código.

## 6. Arquivos afetados

Modificados:

- `server/modules/runner/servico.js` — despejo por tempo, além do por lote; despejo no
  encerramento; constantes nomeadas.
- `server/modules/runner/runner.test.js` — testes do comportamento novo.
- `memory/bugs.md` — R-11 fechado, com a correção.

Nenhum arquivo criado. Nenhum schema mudou: `command_logs` já existe e já é escrita.

## 7. Critérios de aceite

1. Linha de comando de longa duração chega em `command_logs` **enquanto o comando roda**, sem ele
   terminar e sem juntar cinquenta linhas.
2. O intervalo é de um segundo, em constante nomeada, com o porquê escrito ao lado.
3. O teto de cinquenta linhas continua valendo e continua sendo o que manda em rajada: cinquenta
   linhas de uma vez gravam na hora, sem esperar o intervalo.
4. Nenhum temporizador segura o processo vivo. Todo `setTimeout` criado aqui é `unref`.
5. Não existe temporizador ocioso: ele só é agendado quando há linha esperando, e é cancelado ao
   despejar.
6. Terminar o comando continua gravando o que sobrou, como hoje.
7. Encerrar o Forge grava o que está pendente antes de parar de gravar, em vez de descartar.
8. Gravar continua sendo fire-and-forget: falha ao gravar não derruba o comando, não interrompe a
   fila e não vira exceção não tratada.
9. Nenhuma linha é gravada duas vezes, nem perdida, quando o despejo por tempo e o por fim
   acontecem juntos.
10. A ordem das linhas no banco é a ordem em que chegaram, dentro de cada stream.
11. `npm test` verde e `npm run build` sem erro, no Windows.
12. `npm run verificar:fase1` continua com os oito itens passando.
13. Sem `console.log` esquecido e sem `TODO` sem justificativa escrita ao lado.

## 8. Edge cases conhecidos

- **Comando que não imprime nada.** Nenhum temporizador é agendado, e nada é gravado. Correto.
- **Última linha em cima do fim.** O despejo do fim e o do temporizador podem correr juntos. O
  despejo precisa ser atômico o suficiente para não duplicar nem perder: quem esvazia a fila leva
  tudo o que estava nela.
- **Banco já fechado.** É o caso de callback que chega depois do encerramento, e o
  `gravarComCuidado` já trata: registra aviso e segue.
- **Muitos comandos ao mesmo tempo.** Cada run tem sua fila e seu temporizador, e um não pode
  despejar a fila do outro.
- **Encerrar com dev server rodando.** É o caso comum, e é o que o critério 7 cobre.

## 9. Definição de "aprovado sem ressalvas"

Os treze critérios em sim, `npm test` verde e `npm run build` sem erro no Windows, a prova da
Fase 1 passando, e o defeito reproduzido e depois não reproduzido lendo `command_logs` de um
comando ainda em execução.

## 10. Review (2026-09-08)

**Aprovado sem ressalvas.** Treze de treze critérios cobertos. `npm test` verde com 599 passando e
1 pulado, `npm run build` sem erro, e `npm run verificar:fase1` com os oito itens passando, em
Windows 11.

| # | Critério | Evidência |
|---|---|---|
| 1 | Grava enquanto roda | teste com `longaDuracao`, uma linha só, comando ainda em `rodando`, e a linha no banco |
| 2 | Intervalo de 1 s, nomeado | `INTERVALO_DESPEJO_MS`, com o porquê no comentário acima |
| 3 | Lote continua mandando em rajada | teste com 60 linhas exige 50 no banco em menos de 900 ms, que o intervalo sozinho não daria |
| 4 | Nenhum temporizador segura o processo | `temporizadorDespejo.unref?.()` |
| 5 | Sem temporizador ocioso | `agendarDespejo` só agenda se não houver um, e `despejar` cancela sempre |
| 6 | Fim continua gravando o resto | teste do comando curto, uma linha, sem duplicar |
| 7 | Encerrar grava o pendente | teste que encerra dentro da janela e encontra a linha no banco |
| 8 | Fire-and-forget preservado | segue tudo por `gravarComCuidado` |
| 9 | Sem duplicar nem perder | `splice` esvazia numa tacada, e o teste do comando curto confirma uma linha só |
| 10 | Ordem preservada | `ORDER BY id` nos testes, e a fila é FIFO |
| 11 | Suíte e build | 599 passando, build sem erro |
| 12 | Prova da Fase 1 | oito itens passando, sem sobra |
| 13 | Sem `console.log` nem `TODO` | nenhum no arquivo tocado |

### A prova de que os testes são guarda

A correção foi revertida de propósito, e os dois testes centrais ficaram vermelhos: o de gravar
enquanto roda e o de encerrar gravando o pendente. Os outros dois seguiram verdes, o que também
está certo: eles cobrem caminhos que já funcionavam e existem para não os quebrar.

### Nada foi corrigido durante a review

A auditoria não achou o que consertar. O único ajuste no meio do build foi de sintaxe: uma quebra
de linha escapada virou quebra literal ao gerar o teste da rajada, e o arquivo não compilava.

### Fica para uma próxima rodada

- `command_logs` cresce sem limite, e agora cresce também para comando que nunca termina. Podar,
  rotacionar ou limitar por run é item próprio, e não urgente: um dev server imprime pouco.
- Reabrir na tela o log de uma materialização antiga continua fora do escopo, como no bloco 8. A
  diferença é que agora existe o dado no banco para isso ser possível.
