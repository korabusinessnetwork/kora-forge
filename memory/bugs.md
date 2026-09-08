# Bugs Conhecidos, KORA FORGE

## Objetivo
Registrar bugs conhecidos, não resolvidos ou resolvidos com gambiarra, para que não
sejam redescobertos do zero nem "corrigidos" por acidente sem entender o trade-off.

## Contexto
Projeto na Fase 0, sem código, portanto sem bug. Este arquivo nasce estruturado para ser
usado a partir da Fase 1, e já registra os riscos técnicos previstos, que viram bug
assim que aparecerem.

## Regras Gerais
- Entrada tem: id, título, severidade (crítica, alta, média, baixa), como reproduzir, workaround, status.
- Bug com workaround em produção fica aberto até a correção real, nunca é fechado por gambiarra.
- Bug recorrente que revele lição maior é promovido para `learnings.md`.

## Validações
- Severidade crítica exige registro no mesmo dia e workaround documentado.

## Permissões
- Aberto a qualquer dev ou agente.

## Exceções
- Bug em spike descartável não precisa de registro formal.

## Auditoria
- Data de abertura, autor e status atual.

## Eventos
- `bug.registrado`, `bug.corrigido`, `bug.promovido_para_learning`

## Configurações Futuras
- Sincronizar com issues do GitHub quando o repositório existir.

## Casos de Uso
- Antes de investigar comportamento estranho, ler aqui primeiro.

## Critérios de Aceite
- [ ] Id, severidade e status
- [ ] Reprodução ou condição de ocorrência
- [ ] Workaround, se houver

---

## Bugs abertos

Nenhum. Projeto ainda sem código.

## Riscos técnicos previstos (viram bug quando ocorrerem)

| Id | Risco | Severidade prevista | Mitigação já planejada |
|---|---|---|---|
| R-01 | Caminho do Windows com espaço ou acento quebrando o runner | alta | argumentos sempre em array, testes com `C:\Users\Meu Usuário\` |
| R-02 | `better-sqlite3` exigindo build nativo e falhando no Windows | alta | fixar versão com binário pré-compilado, documentar fallback em `INSTALACAO.md` |
| R-03 | Comando de dev server não termina, travando o runner | média | processo de longa duração roda destacado, com log em stream e botão de parar |
| R-04 | Preset antigo incompatível com motor novo | média | preset versionado, migração explícita, recusa com mensagem clara em vez de erro silencioso |
| R-05 | Cofre trancado no meio do fluxo, quebrando a etapa de APIs | média | etapa detecta cofre trancado antes de começar e pede a senha uma vez só |
| R-06 | Copiloto devolvendo JSON inválido | baixa | saída validada por schema, uma tentativa de reparo, depois fallback determinístico |

## Bugs e riscos registrados

### R-07, `npm install` do projeto gerado falha com npm 10.9.7

**Severidade**: alta. **Status**: aberto, com workaround. **Registrado em**: 2026-09-03.

`npm install` falha com `Cannot read properties of null (reading 'edgesOut')` em qualquer
`package.json` que dependa de `vitest@4.1.11`. Repro mínimo, sem nada do Forge:

```json
{ "name": "t", "version": "1.0.0", "devDependencies": { "vitest": "4.1.11" } }
```

Atinge o **próprio Forge** do mesmo jeito: um `npm install` do zero, sem lockfile, falha. O
repositório só instala porque o `package-lock.json` está versionado, e `npm ci` funciona.

O projeto gerado ainda não tem lockfile, então herda o problema no primeiro `npm install`, que é
justamente o comando que o runner (bloco 7) vai executar.

**Workaround**: `npm install --legacy-peer-deps`. Com ele o projeto gerado instala, `npm run build`
passa e `npm run dev` responde 200, verificado em 2026-09-03.

**Causa provável**: bug do resolvedor do npm 10.9.7 com os doze peers opcionais que o vitest 4
declara. Não é defeito do template: o `package.json` gerado é válido e a mesma falha atinge o
Forge.

**O que fazer no bloco 7**: decidir se o runner detecta a falha e tenta o fallback, ou se o preset
passa a declarar a flag. Nenhuma das duas foi decidida, e a decisão é do dono, porque
`--legacy-peer-deps` afrouxa a resolução de peers em todo projeto gerado.

### R-08, o runner não executava `npm` no Windows

**Severidade**: crítica. **Status**: corrigido em 2026-09-08. **Registrado em**: 2026-09-08.

`server/lib/processo.js` fazia `spawn('npm', args, { shell: false })`. No Windows isso falha com
`ENOENT`, porque `npm` é `npm.cmd` e o Node não consulta o `PATHEXT` quando o shell está
desligado. `git` e `node` funcionavam, porque são `.exe`. Resultado: o bloco 7 rodava a fila
inteira no Linux e não rodava nada na máquina do dono, que é Windows, o que derrubava três itens
do critério de aceite da Fase 1 sem nenhum teste ficar vermelho.

Duas saídas foram testadas e descartadas: `shell: true` viola o controle C3 do ADR-002, e apontar
o `spawn` direto para `npm.cmd` falha com `EINVAL`, porque o Node recusa executar `.cmd` e `.bat`
sem shell desde a correção do CVE-2024-27980.

**Correção**: `server/lib/binarios.js` resolve o executável antes do `spawn`. Para `npm` e `npx`
executa o próprio Node apontando para o CLI em JavaScript (`npm-cli.js`), que é o que o `.cmd` faz
por dentro. Para o resto procura no `PATH` respeitando o `PATHEXT` e aceitando só `.com` e `.exe`.
Fora do Windows nada muda. A resolução roda **depois** de `validarComando`, e por isso a allowlist
de argumento continua estrita: o caminho absoluto que ela produz é interno, nunca declarado.

**Guarda de regressão**: `server/lib/processo.test.js` executa o `npm` de verdade, e
`server/modules/runner/requisitos.test.js` exige que a checagem encontre o npm. Sem isso o bug
volta invisível, que foi exatamente como ele entrou.

### R-09, oito testes verdes no Linux falhavam no Windows

**Severidade**: média. **Status**: corrigido em 2026-09-08. **Registrado em**: 2026-09-08.

O handoff do bloco 7 registrou 435 testes verdes. Na primeira execução em Windows, oito falharam,
por quatro causas independentes:

1. Seis eram o R-08 acima, com o agravante de que o teste passava o caminho absoluto do arquivo
   temporário como argumento, e caminho absoluto do Windows tem barra invertida e dois-pontos de
   unidade, que a allowlist recusa de propósito. Corrigido passando o nome relativo, resolvido
   pelo `cwd`, sem afrouxar a allowlist.
2. `server/boot.test.js` usava `RAIZ.pathname`, que em Windows devolve `/C:/...` e produz
   `C:\C:\Users\...` depois do `path.join`. O código de produção já usava `fileURLToPath`
   corretamente; era defeito só do teste.
3. `server/lib/caminhos.test.js` criava symlink, que no Windows exige modo desenvolvedor ou
   privilégio de administrador e falha com `EPERM`. O caso passou a ser pulado quando o sistema
   recusa, em vez de falhar.
4. A captura de saída exigia ordem entre `stdout` e `stderr`. São canos separados e essa ordem
   nunca foi garantida; no Linux ela só era estável por acaso. O teste passou a exigir ordem
   dentro de cada stream.

**O que muda na próxima vez**: suíte verde em uma plataforma não diz nada sobre a outra. O Forge é
ferramenta local que roda em Windows, então Windows é a plataforma principal, não a secundária.

### R-10, `mutationFn` do bloco 7 passa contexto do React Query para o serviço

**Severidade**: baixa, latente. **Status**: aberto. **Registrado em**: 2026-09-08.

`src/features/wizard/etapas/Materializar.jsx` faz `useMutation({ mutationFn: pararRun })`. O React
Query chama a função com `(variaveis, contexto)`, então `pararRun` recebe um segundo argumento com
`client`, `meta` e `mutationKey`, que ela não pediu e ignora.

Hoje não causa nada, porque nenhum serviço lê o segundo parâmetro. Vira defeito silencioso no dia
em que algum ler, por exemplo para receber opções.

**Descoberto** na rodada 3, quando o mesmo padrão em `GavetaIdeias.jsx` fez um teste falhar com
`toHaveBeenCalledWith('i1')` recebendo dois argumentos. Lá já foi corrigido.

**Correção**: encapsular, `mutationFn: (runId) => pararRun(runId)`. Não foi feita nesta rodada por
estar fora do escopo do bloco 9, que não toca o wizard. Vale corrigir quando alguém encostar no
arquivo. Ver A-11 em `memory/learnings.md`.

### R-11, log de comando de longa duração nunca chega ao banco

**Severidade**: média. **Status**: corrigido em 2026-09-08. **Registrado em**: 2026-09-08.

`server/modules/runner/servico.js` acumula as linhas em `pendentes` e só grava em `command_logs`
quando junta 50 ou quando o comando termina. Um `npm run dev`, que por definição não termina,
cospe umas dez linhas e nenhuma é gravada.

O painel não sofre: ele recebe pelo WebSocket, e o transmissor guarda o histórico em memória. O
que se perde é a persistência. Reiniciar o Forge apaga o log daquele comando, e a tabela
`command_logs` mente sobre o que aconteceu.

**Descoberto** na prova do critério de aceite da Fase 1, que tentou ler a URL do dev server em
`command_logs` e encontrou zero linhas para um comando visivelmente rodando.

**Correção**: a fila passou a esvaziar também por tempo, com `INTERVALO_DESPEJO_MS` de um segundo,
agendado só quando há linha esperando e cancelado ao despejar, sempre com `unref` para não segurar
o processo vivo. O teto de cinquenta linhas virou `LOTE_MAXIMO` e continua mandando em rajada.
`encerrarTudo` passou a gravar o que está na fila **antes** de marcar encerrado, porque depois
disso `gravarComCuidado` recusa escrever e as linhas seriam descartadas.

**O intervalo, e por quê um segundo**: ele não governa a experiência de ninguém. Quem olha o painel
recebe pelo WebSocket, na hora. O banco serve para depois, e ali um segundo é invisível. Em rajada
o lote dispara antes e o temporizador nem chega a ser usado.

**Guarda de regressão**: quatro testes em `server/modules/runner/runner.test.js`, sob "log persiste
sem esperar o comando terminar". Os dois centrais foram vistos ficando vermelhos com a correção
revertida de propósito.

**Fica em aberto**: `command_logs` cresce sem limite, e agora cresce também para comando que nunca
termina. Podar ou limitar por run é item próprio, e não urgente.

### R-12, parar um comando deixa o processo real vivo no Windows

**Severidade**: alta. **Status**: corrigido em 2026-09-08. **Registrado em**: 2026-09-08.

`parar()` em `server/lib/processo.js` mata o processo que o Forge criou. No Windows isso não mata
os filhos dele. Como `npm run dev` é `node npm-cli.js` que cria o `vite`, matar o npm deixa o vite
rodando, segurando a porta e os arquivos da pasta.

Medido diretamente: filho morto, neto vivo.

```
pid do npm (filho): 6600
pids dos netos: [ 8548, 13416 ]
chamando parar()...
filho vivo depois do parar: false
  neto 8548 vivo depois do parar: true
```

**Consequência para quem usa**: o botão Parar do bloco 7 não para o dev server, e fechar o Forge
também não. O processo fica órfão até a máquina reiniciar. Confirmado no mundo real: o dev server
de um teste da rodada 2 ainda estava vivo horas depois, ocupando a porta 5173.

**Por que não foi corrigido aqui**: matar árvore de processos no Windows pede `taskkill /T`, que
seria um binário novo executando com privilégio, ou objeto de Job do Windows, que é mudança
estrutural no runner. As duas mexem no ADR-002 e no controle C3. É decisão do dono, não minha.

**Correção**: `server/lib/arvore.js`. No Windows, `taskkill /T /F /PID`, chamado por `spawn` com
array de argumentos, solto e sem stdio, para completar mesmo se o Forge sair em seguida. Em POSIX o
filho passa a nascer com `detached`, liderando o próprio grupo, e o sinal vai para o grupo por
`process.kill(-pid, sinal)`, mantendo os dois estágios. Vale para o botão Parar, para o timeout e
para o encerramento do Forge, que passam todos pelo mesmo caminho.

A whitelist **não** foi ampliada. `COMANDOS_PERMITIDOS` limita o que um preset manda executar, e o
`taskkill` é capacidade do próprio Forge, com binário fixo em código e um argumento só, que é um
pid que o Forge criou. Mesma forma do abridor de pasta do bloco 8. Proposto como ADR-010.

**Guarda de regressão**: `server/lib/processo.test.js` roda um `npm run dev` de verdade, captura o
pid do processo que o npm criou, chama `parar` e exige que ele morra. Um teste com pai `node`
simples **não** serviria: nesse formato o filho morre junto, e o teste passaria mesmo com o defeito.
Medido antes de escrever, e confirmado revertendo a correção para ver o teste ficar vermelho.

**Alternativas descartadas**: grupo de processo com `detached` não existe no Windows; Job Object
resolveria mas o Node não expõe e exigiria dependência nativa.
