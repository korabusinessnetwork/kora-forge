# Ratificação das capacidades próprias do Forge (ADR-009 e ADR-010)

> Spec da rodada 6 do ciclo. **Esta rodada não decide nada.** Ela prepara a decisão para o dono
> tomar, e para na pergunta. O que ela entrega é o ADR pronto para ratificação, no repositório,
> com Status `Proposto`.

## 1. Escopo

Transformar as duas propostas de ADR que hoje só existem em pasta temporária num documento
ratificável dentro do repositório, com Status `Proposto`, e apresentar ao dono a decisão que
falta: ratificar, recusar ou fundir.

## 2. Fora de escopo

- **Decidir.** Marcar `Aceito` é do dono, e o `README` de `docs/08_DECISOES` diz isso: "Status
  vira Aceito quando a decisão passa a valer".
- Escrever em `memory/decisions.md`, que só recebe decisão tomada.
- Mudar o código das duas capacidades. Elas estão construídas, testadas e em uso.
- Remover qualquer uma delas. Se o dono recusar, a remoção é rodada própria, com o roteiro que
  este ADR já traz.
- R-07, R-10, R-11 e os itens `[ASSUMIDO]`.

## 3. Origem

- **ADR-009**, proposto na rodada 2, sobre abrir a pasta do projeto no gerenciador de arquivos.
- **ADR-010**, proposto na rodada 5, sobre matar a árvore de processos com `taskkill`.
- **CLAUDE.md**: "Toda decisão de arquitetura vira ADR em `docs/08_DECISOES/`". Hoje o repositório
  tem duas capacidades arquiteturais **sem ADR nenhum**, e isso é a violação real que a rodada
  fecha, independentemente de qual for a decisão.
- **`docs/08_DECISOES/README.md`**, que já documenta ADR com Status `Proposto` como etapa normal,
  e tem o ADR-008 nesse estado desde 2026-09-02.

## 4. Por que fundir, e o que se perde

O dono levantou três saídas: ratificar as duas, recusar, ou fundir. A recomendação é **fundir**,
e a razão não é economia de arquivo.

As duas capacidades não são duas decisões. São a **mesma** decisão aplicada duas vezes: o Forge
pode executar processo por conta própria, fora da whitelist que governa o que um preset manda
executar, desde que o binário seja fixo em código e nenhum argumento venha de fora.

Fundido, o ADR estabelece o princípio e lista as duas instâncias. A terceira capacidade, quando
aparecer, não precisa de ADR novo: precisa satisfazer os critérios deste. Separado, cada
capacidade nova vira um ADR quase idêntico, e o princípio fica implícito em vez de escrito, que é
justamente como uma regra se perde.

**O que se perde ao fundir**: recusar só uma das duas fica menos direto, porque as duas moram no
mesmo documento. O ADR trata isso trazendo o roteiro de remoção de cada uma, separadamente.

## 5. Arquivos afetados

Criados:

- `docs/08_DECISOES/adr-009-capacidades-proprias-do-forge.md`, Status `Proposto`.

Modificados:

- `docs/08_DECISOES/README.md` — índice, e a linha de "decisões que ainda vão exigir ADR" se
  couber.
- `specs/_loop.md` — a pendência da rodada.

Não tocados, de propósito: `memory/decisions.md`, o código das duas capacidades, e qualquer ADR
já aceito.

## 6. Critérios de aceite

1. Existe **um** ADR em `docs/08_DECISOES/`, com Status `Proposto`, cobrindo as duas capacidades,
   no formato que os outros oito usam: Contexto, Decisão, Alternativas Consideradas, Consequências.
2. O ADR descreve o que o código **faz de verdade**, conferido arquivo por arquivo, e não o que a
   proposta original dizia que faria.
3. O ADR enuncia os controles que qualquer capacidade própria precisa cumprir, em lista
   verificável, para servir de critério à próxima.
4. O ADR mostra, com evidência, que `COMANDOS_PERMITIDOS` não foi ampliada.
5. O ADR traz o roteiro de remoção de cada capacidade, separadamente, para a recusa ser barata.
6. O ADR registra o que foi verificado em qual plataforma, sem maquiagem.
7. O índice de `docs/08_DECISOES/README.md` lista o ADR novo com o Status certo.
8. Nada é marcado `Aceito`, e `memory/decisions.md` não é tocado.
9. As duas propostas antigas, que só existiam em pasta temporária, ficam superadas pelo documento
   no repositório, e o ADR diz isso.
10. `npm test` verde e `npm run build` sem erro. A rodada não muda código, então qualquer mudança
    de resultado é regressão de outra origem.
11. A rodada termina com a pergunta específica que destrava, e sem `/aprender`, porque não houve
    decisão para aprender.

## 7. Edge cases conhecidos

- **O dono recusa uma e aceita a outra.** O ADR precisa permitir isso: os roteiros de remoção são
  separados, e o Status pode virar "Aceito em parte", com a parte recusada movida para um ADR
  próprio marcado `Recusado`.
- **O dono prefere dois ADRs.** O conteúdo já está separado por seção, então dividir é copiar duas
  seções para dois arquivos. O custo é baixo, e o ADR diz isso.
- **Numeração.** O ADR fundido fica como 009, e o número 010 não é usado. O documento registra que
  a proposta chamada de ADR-010 nas rodadas anteriores foi absorvida, para o ledger não apontar
  para o nada.

## 8. Definição de "aprovado sem ressalvas"

Os onze critérios em sim, com a suíte verde e o build sem erro, e a rodada terminando na pergunta
ao dono. **Rodada que termina em pergunta é resultado legítimo aqui**: o produto desta rodada é a
decisão ficar pronta para ser tomada, não ser tomada.

## 9. Review (2026-09-08)

**Aprovado sem ressalvas.** Onze de onze critérios cobertos. `npm test` verde com 595 passando e 1
pulado, `npm run build` sem erro. A rodada não tocou código, então os números batem com a rodada 5.

| # | Critério | Evidência |
|---|---|---|
| 1 | Um ADR, Proposto, no formato dos outros | `adr-009-capacidades-proprias-do-forge.md`, com Contexto, Decisão, Alternativas e Consequências |
| 2 | Descreve o que o código faz | conferido linha a linha: binários fixos, `garantirDentro`, `FORGE_PATH_FORBIDDEN`, `taskkill /T /F` |
| 3 | Controles em lista verificável | CP-1 a CP-5, e os dois arquivos passam nos cinco |
| 4 | Mostra a whitelist intacta | a linha de `shared/comandos.js` está citada no ADR |
| 5 | Roteiro de remoção separado por capacidade | seção "Se recusado", dois roteiros independentes |
| 6 | Diz o que foi verificado onde | tabela por plataforma, com POSIX marcado como não verificado |
| 7 | Índice atualizado | `docs/08_DECISOES/README.md`, com seção nova de propostos esperando ratificação |
| 8 | Nada Aceito, `decisions.md` intocado | Status `Proposto`; `git status` limpo em `memory/decisions.md` |
| 9 | Propostas antigas superadas | linha `Absorve:` no cabeçalho, dizendo que o número 010 fica livre |
| 10 | Suíte e build | 595 passando, build sem erro |
| 11 | Termina em pergunta, sem `/aprender` | é o resultado desta rodada |

### Nada foi corrigido durante a review

Primeira rodada do ciclo em que a auditoria não achou o que consertar. Faz sentido: a rodada não
produziu código, só documento, e o documento foi escrito conferindo o código em vez de a memória.

### Uma coisa deliberadamente não feita

O padrão P-09 manda transformar invariante de arquitetura em teste que varre a árvore, e os
controles CP-1 a CP-5 são exatamente isso. O teste **não** foi escrito, porque escrever guarda para
uma decisão ainda não ratificada seria presumir a ratificação. Se o dono aceitar, o teste é a
primeira coisa da rodada seguinte.

### Pendente de decisão do dono

É a rodada inteira. A pergunta está no resumo.
