# R-10, `mutationFn` encapsulada, para o serviço não receber o que não pediu

> Spec da rodada 9 do ciclo. Defeito latente descoberto na rodada 3, quando o mesmo padrão fez um
> teste falhar na gaveta de ideias. Registro em `memory/bugs.md`, R-10.

## 1. Escopo

Nenhuma `mutationFn` do front entrega uma função de serviço diretamente ao React Query, e um teste
passa a cobrar isso do código inteiro, não do arquivo que motivou a rodada.

## 2. Fora de escopo

- Mudar as funções de `src/services/` para tolerar argumento extra. O ponto é o contrário: elas
  recebem só o que pediram.
- Mexer em `queryFn`, que o React Query chama com um objeto de contexto por design, e onde os
  chamadores já passam função encapsulada.
- R-07, ADR-009 e os itens `[ASSUMIDO]`.
- Qualquer coisa da Fase 2.

## 3. Origem e decisões que este item honra

- **R-10 em `memory/bugs.md`**, registrado em 2026-09-08 na rodada 3.
- **A-11 em `memory/learnings.md`**, que já dizia o que muda: `mutationFn` sempre encapsulada.
- **CLAUDE.md**: "Todo acesso a dado passa pela camada de serviços". Uma camada só é camada se a
  fronteira dela for explícita, e receber contexto de uma biblioteca de tela por acidente é
  fronteira vazando.
- **P-09 em `memory/patterns.md`**: invariante de arquitetura vira teste que varre a árvore. Esta é
  a quarta ocorrência do padrão, e a que fecha o ciclo do próprio R-10.

## 4. O defeito é maior do que estava registrado

O R-10 foi escrito apontando um lugar, `pararRun` em `Materializar.jsx`. A varredura mostrou
**três**:

| Arquivo | Chamada |
|---|---|
| `src/features/config/FormularioConfig.jsx` | `mutationFn: atualizarSettings` |
| `src/features/registry/PaginaNovoProjeto.jsx` | `mutationFn: criarProjeto` |
| `src/features/wizard/etapas/Materializar.jsx` | `mutationFn: pararRun` |

O React Query chama a função com `(variaveis, contexto)`, e o contexto traz `client`, `meta` e
`mutationKey`. As três funções ignoram o segundo argumento hoje, então nada quebra. Vira defeito
silencioso no dia em que uma delas passar a aceitar opções, que é exatamente a forma que
`requisitar` já usa em `src/services/api.js`.

## 5. Arquivos afetados

Modificados:

- `src/features/config/FormularioConfig.jsx`
- `src/features/registry/PaginaNovoProjeto.jsx`
- `src/features/wizard/etapas/Materializar.jsx`
- `src/services/api.test.js` ou arquivo de teste equivalente, para a varredura
- `memory/bugs.md` — R-10 fechado

## 6. Critérios de aceite

1. As três ocorrências passam a encapsular: `mutationFn: (x) => servico(x)`, ou `() => servico()`
   quando não há variável.
2. Um teste varre `src/` e falha listando arquivo e linha de qualquer `mutationFn` que receba um
   identificador nu em vez de função encapsulada.
3. O teste ignora os próprios arquivos de teste, como as outras varreduras do projeto fazem.
4. O teste falha de verdade se alguém reintroduzir o padrão. Provado reintroduzindo de propósito.
5. Nenhuma função de `src/services/` muda de assinatura.
6. Comportamento na tela é idêntico: as mutações continuam recebendo as mesmas variáveis e
   disparando os mesmos `onSuccess`.
7. `queryFn` não é tocada.
8. `npm test` verde e `npm run build` sem erro, no Windows.
9. Sem `console.log` esquecido e sem `TODO` sem justificativa escrita ao lado.

## 7. Edge cases conhecidos

- **`mutationFn` sem variável.** `atualizarSettings` recebe o patch, `criarProjeto` recebe os
  dados, e `pararRun` recebe o `runId`. Todas têm variável; nenhuma é sem argumento.
- **Encapsular a mais.** Envolver função que já é arrow não muda nada e não é feito.
- **Varredura falso-positiva.** `mutationFn: async ({ payload, nome }) => {` em
  `ConteudoWizard.jsx` é função encapsulada e não pode acusar.
- **Quebra de linha.** A propriedade pode estar em linha própria, como em `Materializar.jsx`. A
  varredura precisa pegar os dois formatos.

## 8. Definição de "aprovado sem ressalvas"

Os nove critérios em sim, com `npm test` verde e `npm run build` sem erro, e a varredura vista
ficando vermelha com o padrão reintroduzido de propósito.

## 9. Review (2026-09-08)

**Aprovado sem ressalvas.** Nove de nove critérios cobertos. `npm test` verde com 619 passando e 1
pulado, `npm run build` sem erro, em Windows 11.

| # | Critério | Evidência |
|---|---|---|
| 1 | As três encapsuladas | uma linha alterada em cada um dos três arquivos |
| 2 | Varredura existe | `src/services/api.test.js`, "toda mutationFn é função encapsulada" |
| 3 | Ignora arquivo de teste | a varredura pula `.test.js` e `.test.jsx`, como as outras do projeto |
| 4 | Falha de verdade | padrão reintroduzido de propósito, e o teste acusou `Materializar.jsx:35` |
| 5 | Nenhuma assinatura de serviço mudou | `git diff` vazio em `src/services/settings.js`, `projetos.js` e `materializacao.js` |
| 6 | Comportamento idêntico | os testes de Configurações, Novo Projeto e do wizard seguem verdes |
| 7 | `queryFn` intocada | o diff tem quatro arquivos, e nenhum toca `queryFn` |
| 8 | Suíte e build | 619 passando, build sem erro |
| 9 | Sem `console.log` nem `TODO` | nenhum nos arquivos tocados |

### Nada foi corrigido durante a review

Segunda rodada do ciclo em que a auditoria não achou o que consertar. O diff é de três linhas mais
o teste, e a spec foi escrita depois da varredura, então não houve surpresa.

### O que a rodada mostrou além do previsto

O R-10 estava registrado apontando um lugar e eram três. Achar isso não custou nada: bastou varrer
antes de escrever a spec, em vez de confiar no registro. Vale como método, não como sorte.

### Fica para uma próxima rodada

Nada deste item. O R-10 fecha aqui, e com ele fecha todo defeito que dava para corrigir sem
decisão do dono.
