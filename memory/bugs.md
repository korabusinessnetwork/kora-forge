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

### R-08, `npm` e `npx` não nascem no Windows: `spawn npm ENOENT`

**Severidade**: crítica. **Status**: corrigido em 2026-09-03. **Registrado em**: 2026-09-03.

Materializando um projeto de verdade com `npm run forge`, o `git init` passava e o `npm install`
morria na largada com `spawn npm ENOENT`. Como todo preset roda `npm install`, nenhum projeto
conseguia nascer inteiro no Windows, que é o ambiente primário (T-02).

Repro, fora do Forge:

```js
spawnSync('npm', ['--version'], { shell: false });      // ENOENT
spawnSync('npm.cmd', ['--version'], { shell: false });  // EINVAL
```

**Causa**: no Windows o que existe no PATH é o shim `npm.cmd`. O `CreateProcess` só completa nome
com `.exe`, por isso `npm` dá ENOENT; e desde a correção do CVE-2024-27980 o Node recusa executar
`.cmd` e `.bat` sem shell, por isso `npm.cmd` dá EINVAL. `git`, `node` e `supabase` são `.exe` e
sempre funcionaram, o que escondeu o problema.

**Correção**: `resolverComando()` em `server/lib/processo.js` traduz, só no Windows, `npm` e `npx`
para `node <npm-cli.js>` / `node <npx-cli.js>`, usando o CLI que mora ao lado do `process.execPath`.
Continua `spawn` com array de argumentos e `shell: false`; a whitelist de `COMANDOS_PERMITIDOS` não
muda (C7), porque a tradução acontece depois de `validarComando`. Não encontrando o CLI, devolve o
comando original, e a falha aparece como falha do comando, com mensagem.

**Por que a suíte não pegou**: todos os testes de processo rodavam `node script.js`, que funciona em
qualquer sistema. Agora existe `executar comandos reais da whitelist`, que roda `npm`, `npx`, `node`
e `git --version` de verdade na plataforma que está executando o teste.

**Efeito colateral bom**: `spawn npm ENOENT` chegava cru na tela. `mensagemDeFalhaAoIniciar()`
troca ENOENT, EACCES e EINVAL por frase com próxima ação.

### R-07, atualização de 2026-09-03: não reproduz com npm 11.16.0

Na validação de ponta a ponta do bloco 8, com Node v24.18.0 e npm 11.16.0, o `npm install` do
projeto gerado **passou**, sem `--legacy-peer-deps`: `added 53 packages` e `exit 0`, seguido de
`npm run build` com sucesso. R-07 continua aberto porque é real no npm 10.9.7, mas parece ser bug
do resolvedor daquela versão, não do template. A decisão do dono (flag no preset ou fallback no
runner) segue pendente e agora tem uma terceira saída possível: exigir npm 11 nos requisitos do
preset em vez de afrouxar a resolução de peers.

### R-02, atualização de 2026-09-03: `npm ci` puro falha nesta máquina

`npm ci` tenta `node-gyp rebuild` do `better-sqlite3` 13.0.3 e morre com
`Could not find any Visual Studio installation`. A máquina não tem toolchain C++. O pacote não
declara script de `install`, mas tem `binding.gyp`, e o npm roda o rebuild por conta disso, mesmo
existindo o prebuild N-API em `prebuilds/win32-x64.node`.

**Workaround verificado**: `npm ci --ignore-scripts`. O `better-sqlite3` carrega e funciona pelo
prebuild, e o `forge:init` cria o banco normalmente.

