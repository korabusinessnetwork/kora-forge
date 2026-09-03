# ADR-008, Harness como sistema de operação de build e painel de relatórios

**Status**: Proposto
**Data**: 2026-09-02
**Decisores**: Matheus Bonato
**Supersede**: nenhum. Ajusta a leitura de dois não-objetivos de `memory/identity.md`, sem revogá-los

---

## Contexto

Pedido do dono em 2026-09-02, durante a Fase 1: "o sistema deve adotar o sistema de operação
harness" e "quero um painel de relatórios intuitivo onde eu vejo tudo que está buildando ao mesmo
tempo, uma estimativa de tempo para finalização, tudo que falta em cada aplicativo, planos e ciclo
de aprendizado de cada modelo, e barra de progresso".

O método que o Forge existe para codificar já tem um sistema de operação, mesmo que informal: as
skills `loop-spec-build-review` (especificar, construir, revisar contra a spec, corrigir até
limpar) e `multi-model-orchestrator` (planejar tudo antes, despachar por modelo com dono
exclusivo por arquivo, sintetizar e validar no fim). `CLAUDE.md` já exige esse processo em
"Processo de trabalho". Chamamos esse conjunto de **harness**.

Hoje o harness roda na cabeça do Matheus e em sessões avulsas do Claude Code. Quando vários
projetos constroem ao mesmo tempo, não existe um lugar que diga o que está rodando, quanto falta,
quanto tempo deve levar e o que cada modelo aprendeu na rodada anterior. É exatamente o pedágio
de memória que o Forge existe para eliminar, agora aplicado ao **depois** da materialização.

## Decisão

1. **O Forge adota o harness como seu sistema de operação de build.** Todo trabalho de
   construção, do próprio Forge e dos projetos que ele gera, segue o ciclo:
   `planejar → despachar (um modelo por papel, dono exclusivo por arquivo) → build → review
   contra a spec → aprender (achados viram learnings, padrões ou regras) → repetir até aprovar
   sem ressalvas`. Nada é despachado sem plano aprovado pelo dono.
2. **Na Fase 6 o harness vira software dentro do Forge.** O Forge passa a despachar sessões do
   Claude Code (binário `claude` pelo runner, na whitelist) por projeto e por papel, a observar o
   que cada uma faz e a registrar cada ciclo. O Forge **orquestra e observa**; quem constrói
   feature continua sendo o Claude Code. O Forge não ganha um agente próprio nem passa a escrever
   código de feature por conta própria.
3. **Painel de relatórios** como superfície de observação do harness, com:
   - tudo que está construindo ao mesmo tempo, em todos os projetos;
   - barra de progresso por build, sempre com "x de y" itens do plano;
   - estimativa de término, rotulada como estimativa e com a base de cálculo visível;
   - o que falta em cada aplicativo: itens do plano pendentes e bloqueios;
   - por modelo: o plano que ele está executando e o ciclo de aprendizado (rodadas de review,
     achados, correções, o que virou learning).
4. **Os princípios nº 1 e nº 2 continuam valendo.** O painel é determinístico: progresso e
   estimativa saem de dados gravados (itens, durações, ciclos), nunca de opinião de LLM. O
   copiloto pode redigir o resumo de um ciclo, com selo de IA, e só.

## Alternativas Consideradas

### 1. Manter o status quo, uma sessão de Claude Code por projeto, sem observação central
- **Prós**: nada a construir
- **Contras**: vários projetos ao mesmo tempo viram caos; o ciclo de aprendizado se perde entre sessões
- **Descartado porque**: é o pedágio de memória que o produto existe para eliminar

### 2. O Forge construir feature sozinho, com LLM embutido
- **Prós**: um produto só
- **Contras**: viola o ADR-004 (LLM fora do caminho crítico) e o não-objetivo "não é substituto do Claude Code"
- **Descartado porque**: o Claude Code já é o executor certo; o que falta é orquestração e observação

### 3. Painel em ferramenta externa (planilha, Notion, dashboard pronto)
- **Prós**: rápido de começar
- **Contras**: depende de nuvem, quebra o offline-first, não fala com o runner nem com o log de eventos
- **Descartado porque**: a fonte dos dados é o próprio Forge; o painel tem que morar nele

## Consequências

### Positivas
- O método vira software também na fase de construção, não só na fundação
- Progresso visível cedo, que é o que sustenta execução (aprendizado A-03)
- Cada ciclo de review deixa rastro: o ciclo de aprendizado vira ativo acumulável, como o catálogo de regras
- A estimativa de término deixa de ser chute: sai da duração real dos itens já concluídos

### Negativas e trade-offs
- O Forge ganha uma dependência de runtime opcional no binário `claude`. Sem ele, a Fase 6 mostra o estado dos builds manuais registrados, e nada mais
- Estimativa é estimativa. A UI precisa deixar isso claro sempre, senão vira promessa quebrada
- Mais tabelas e mais superfície de UI. Fica em fase própria, depois do copiloto, e não adianta nada da Fase 1
- Dois não-objetivos da identidade precisam de leitura mais precisa: "não é substituto do Claude Code" continua (o Forge orquestra, não constrói) e "não é agente autônomo" continua (nada roda sem plano aprovado). Este ADR registra essa leitura

## Notas de Implementação

- Entidades previstas em `docs/04_MODELAGEM/README.md`, seção "Extensão prevista": `builds`,
  `build_itens`, `build_ciclos`, `modelos`. Entram em `schema.sql` só quando este ADR for aceito
- Regras em `docs/03_REGRAS_DE_NEGOCIO/README.md`, RN-11 e RN-12
- Fluxos F-09 e F-10 em `docs/05_FLUXOS/README.md`
- Componentes em `docs/06_COMPONENTES/README.md`: `BarraProgresso`, `CartaoBuild`, `LinhaModelo`,
  `Estimativa`, `PainelRelatorios`
- Rotas em `docs/07_APIS/README.md`, marcadas Fase 6
- Backlog em `docs/09_BACKLOG/README.md`, Fase 6
- Estimativa: mediana da duração dos itens concluídos do mesmo build (ou do mesmo modelo e
  papel, quando o build ainda não concluiu nada) multiplicada pelos itens restantes, mostrada como
  faixa (P50 a P90). Sem histórico, mostra "sem base ainda", nunca um número inventado
- O binário `claude` entra na whitelist do runner com argumentos fixos por papel; o prompt de cada
  despacho é template versionado em `10_PROMPTS`, com o conteúdo do projeto delimitado como dado

## Referências

- `CLAUDE.md`, "Processo de trabalho"
- `memory/identity.md`, não-objetivos e roadmap
- `memory/learnings.md`, A-03
- ADR-002 (runner), ADR-004 (motor determinístico e copiloto)
- Skills `loop-spec-build-review` e `multi-model-orchestrator`
