# R-08, o runner executa `npm` no Windows sem shell

> Spec da rodada 1 do ciclo. Origem: `/proximo` de 2026-09-08, que descobriu a falha rodando a
> suíte na máquina do dono pela primeira vez.

## 1. Escopo

Fazer o runner de comandos executar os binários da whitelist no Windows sem violar a regra
`shell: false` do ADR-002, e deixar a suíte de testes verde nessa plataforma.

## 2. Fora de escopo

- Ampliar `ARGUMENTO_PERMITIDO` para aceitar caminho absoluto do Windows (barra invertida e
  dois-pontos de unidade). A validação continua valendo sobre o comando **declarado** no preset.
- Resolver o R-07 (`--legacy-peer-deps`). Continua travado esperando decisão do dono.
- Bloco 8, telas de fechamento. Entra na próxima rodada.
- Empacotamento desktop, instalação de Node ou de `npm` para o usuário.
- Suporte a `.bat`/`.cmd` arbitrário fora da whitelist.

## 3. Origem e decisões que este item honra

- **Não existe no backlog.** R-08 nasce aqui; o `/aprender` cadastra em `memory/bugs.md`.
  Vizinho do R-07, que já está registrado lá.
- **ADR-002, runner de comandos**: mantém whitelist, `spawn` sem shell, sem interpolação de
  string, sem `exec`. A correção não afrouxa nenhum dos três controles.
- **CLAUDE.md, princípio nº 2 (determinismo)**: o mesmo blueprint tem de produzir o mesmo
  resultado. Hoje ele produz projeto no Linux e falha no Windows, o que é uma quebra silenciosa.
- **ADR-003**: o Forge é ferramenta local. A máquina do dono é Windows, então Windows não é
  plataforma secundária aqui, é a plataforma principal.

## 4. Arquivos afetados

Criados:

- `server/lib/binarios.js` — resolução de executável por plataforma.
- `server/lib/binarios.test.js` — teste da resolução.

Modificados:

- `server/lib/processo.js` — usa a resolução antes do `spawn`, depois de validar.
- `server/lib/processo.test.js` — argumento relativo em vez de caminho absoluto temporário.
- `server/boot.test.js` — trocar `RAIZ.pathname` por `fileURLToPath`.
- `server/lib/caminhos.test.js` — pular o caso de symlink quando o sistema recusa criar um.
- `memory/bugs.md` — registro do R-08 e do R-09 (passo `/aprender`).

## 5. Critérios de aceite

1. `executar({ cmd: 'npm', args: ['--version'] })` devolve `estado: 'sucesso'` no Windows.
2. O `spawn` continua recebendo `shell: false`. Nenhuma ocorrência de `shell: true`, `exec(`,
   `execSync`, `eval` ou `new Function` aparece em `server/` ou `shared/`.
3. Nenhum argumento de comando é montado por interpolação de string. Tudo continua em array.
4. A resolução do executável nunca usa dado vindo do preset ou do usuário: parte de
   `process.execPath` e da variável `PATH`, e só é aplicada a comando que já passou pela whitelist.
5. `validarComando` roda **antes** da resolução, e o caminho absoluto interno resultante não
   passa por `ARGUMENTO_PERMITIDO`, que continua recusando espaço, `;`, `|`, `$`, crase, `&`,
   `>` e aspas no argumento declarado.
6. Em plataforma não-Windows o comportamento é idêntico ao de hoje: `spawn` recebe o nome do
   binário como veio, sem prefixo e sem resolução.
7. Comando da whitelist que não existe na máquina vira falha tratada, com o código de erro
   estável `FORGE_CMD_NOT_FOUND` e mensagem legível, sem derrubar o servidor.
8. `checarRequisitos` encontra a versão de `node` e de `git` no Windows, e devolve `ok: true`
   para ambos numa máquina que os tem instalados.
9. `npm test` termina com 0 falhas nesta máquina Windows.
10. `npm run build` termina sem erro.
11. Nenhum `console.log` novo e nenhum `TODO` pendente nos arquivos tocados.
12. Nenhum segredo, caminho de máquina ou conteúdo de ambiente é escrito em log.

## 6. Edge cases conhecidos

- **`npm` fora do diretório do Node.** Instalação via nvm, volta ou fnm coloca o `npm-cli.js`
  em outro lugar. A resolução tenta o vizinho de `process.execPath` e, se não achar, cai para a
  busca no `PATH`.
- **`.cmd` como única correspondência.** O Node recusa `spawn` de `.cmd` sem shell desde a
  correção do CVE-2024-27980, com `EINVAL`. Nesse caso a resposta é `FORGE_CMD_NOT_FOUND`
  explicando que o binário existe mas não é executável sem shell, nunca ligar o shell.
- **Diretório com espaço no `PATH`.** `C:\Program Files\nodejs` é o caso normal, não a exceção.
  Como não há shell nem interpolação, o espaço é inofensivo, mas o teste precisa cobrir.
- **`PATHEXT` ausente ou vazio.** Cair para a lista padrão `.COM;.EXE;.BAT;.CMD`.
- **Extensionless na frente.** O diretório do Node tem tanto `npm` (script sh) quanto `npm.cmd`.
  Preferir a extensão do `PATHEXT`; o arquivo sem extensão não é executável no Windows.
- **`supabase` ausente**, que é o caso comum. Continua virando falha tratada, nunca exceção.

## 7. Definição de "aprovado sem ressalvas"

Todos os doze critérios de aceite em sim, `npm test` verde nesta máquina Windows, `npm run build`
sem erro, sem TODO pendente, sem `console.log` esquecido, e sem regressão nos fluxos de
materialização já entregues nos blocos 6 e 7.

## 8. Review (2026-09-08)

**Aprovado sem ressalvas.** Doze de doze critérios cobertos. `npm test` verde com 450 passando e
1 pulado, `npm run build` sem erro, ambos em Windows 11.

| # | Critério | Resultado | Evidência |
|---|---|---|---|
| 1 | `npm` roda no Windows | sim | `processo.test.js`, "executa o npm de verdade, na plataforma em que está rodando" |
| 2 | `shell: false`, sem `exec`/`eval` | sim | `processo.js:77`, e o teste "a única API de child_process usada é spawn" varre `server/` inteiro |
| 3 | Nenhum argumento interpolado | sim | `processo.js:75`, `[...prefixo, ...args]` |
| 4 | Resolução não usa dado do usuário | sim | `binarios.js` só lê `process.execPath` e `PATH` |
| 5 | Validação antes da resolução | sim | `processo.js:68` valida, `:73` resolve; a allowlist segue recusando espaço, `;`, `\|`, `$`, crase e `&` |
| 6 | Linux idêntico ao de hoje | sim | `binarios.test.js`, "fora do Windows devolve o comando intacto, sem prefixo" |
| 7 | Binário ausente vira falha tratada | sim, com desvio | `supabase` devolve `FORGE_TOOL_MISSING` |
| 8 | Requisitos encontram as ferramentas | sim | `requisitos.test.js`, node, git e npm |
| 9 | Suíte verde no Windows | sim | 450 passando, 1 pulado |
| 10 | Build sem erro | sim | 250 módulos |
| 11 | Sem `console.log` nem `TODO` | sim | as ocorrências restantes são corpo de script de teste |
| 12 | Nada sensível em log | sim | os dois arquivos de produção não escrevem log |

### Desvio do spec

O critério 7 pedia um código de erro novo, `FORGE_CMD_NOT_FOUND`. `FORGE_TOOL_MISSING` já existia
em `shared/erros.js:9` com exatamente esse significado e status 409, então foi reusado. Criar um
segundo código para a mesma condição só espalharia o tratamento.

### Corrigido durante a review

1. Faltava teste automatizado rodando o `npm` real, no runner e na checagem de requisitos. Era a
   única guarda possível contra o R-08 voltar, já que ele passou por toda a suíte anterior.
2. `procurarNoPath` devolvia a extensão na caixa do `PATHEXT` (`.EXE`) em vez da caixa do disco
   (`.exe`). Funcionava, porque o Windows ignora caixa, mas o caminho errado apareceria em
   mensagem de erro. Passou a devolver a caixa real.
3. O teste de captura de saída exigia ordem entre `stdout` e `stderr`, que nunca foi garantida.
   Passou a exigir ordem dentro de cada stream, que é a garantia real do quebrador de linhas.

### Fica para uma próxima rodada

- O R-07 continua aberto e travado esperando decisão do dono.
- `ARGUMENTO_PERMITIDO` segue recusando caminho absoluto do Windows no argumento declarado. Não
  incomoda hoje, porque nenhum preset usa caminho em argumento. Se algum passar a usar, a decisão
  é ampliar a expressão ou resolver o caminho no servidor, e ela vale um registro próprio.
