# Fase 1, critério de aceite da fase inteira

> Spec da rodada 4 do ciclo. Não é rodada de construção: é a prova de que os nove blocos entregues
> formam um produto que funciona de ponta a ponta. Critério em `docs/09_BACKLOG/mvp.md`.

## 1. Escopo

Provar, com evidência reproduzível, os oito itens do critério de aceite da Fase 1, criando um
projeto de verdade em disco pelo mesmo caminho que a interface usa, e corrigir o que a prova
encontrar quebrado.

## 2. Fora de escopo

- Fase 2 em diante: Studio, API Hub, cofre, copiloto.
- Recursos novos de produto. Se a prova revelar falta de recurso, isso vira item de backlog, não
  código nesta rodada.
- Instalar driver de browser, Playwright ou equivalente. Ver a seção 4.
- Empacotamento desktop.
- Refatorar o que já passa.

## 3. Origem

- **`docs/09_BACKLOG/mvp.md`, "Critério de aceite da fase inteira"**, os oito itens.
- **`docs/05_FLUXOS/README.md`, F-01**, o fluxo que precisa rodar inteiro.
- **CLAUDE.md, princípio nº 2**: o mesmo blueprint gera sempre o mesmo projeto. A prova roda com o
  copiloto inexistente, que é o estado atual.
- **A-07 em `memory/learnings.md`**: quando o valor está em falar com o sistema operacional, o
  teste fala com o sistema operacional de verdade.

## 4. O que "sem tocar no terminal" será provado, e o que não será

O critério existe para garantir que o **usuário** não precise de terminal: cada passo do fluxo tem
que ser alcançável pelas superfícies do produto. Ele não exige que a prova seja um clique humano.

**O que a prova faz**: dirige as funções de `src/services/`, que são o único ponto do front que
fala com a API, contra um servidor Fastify real, escrevendo em disco de verdade. É exatamente o
código que o componente executa quando o usuário clica, uma camada abaixo do clique, com os mesmos
schemas Zod nas duas pontas.

**O que a prova não faz**: clicar num browser de verdade. Instalar Playwright traria centenas de
megabytes de binário e uma dependência nova, e a decisão é do dono, não minha. A ligação entre o
clique e a chamada de serviço já está coberta pelos testes de componente existentes, que usam
`fireEvent` sobre os componentes reais.

Isso fica escrito no relatório, sem maquiagem: o item 1 é provado como "todo passo do fluxo tem
controle na interface e chamada de serviço que funciona", não como "um humano clicou".

## 5. Isolamento, porque a prova escreve em disco

A prova **não** pode tocar o banco nem o workspace do dono. Ela roda com `FORGE_HOME` e workspace
próprios, em pasta temporária, e porta própria. Ao terminar, limpa o que criou.

## 6. Arquivos afetados

Criados:

- `scripts/verificar-fase1.mjs` — a prova, executável e repetível.
- `docs/09_BACKLOG/fase1-aceite.md` — o relatório, item por item, com a evidência.

Modificados:

- `package.json` — script `verificar:fase1`.
- `docs/09_BACKLOG/mvp.md` — as caixas do critério de aceite marcadas, com a data.
- O que a prova encontrar quebrado, dentro do escopo de correção da seção 8.

## 7. Critérios de aceite

Cada item abaixo é um item do critério da fase, mais o que conta como evidência.

1. **Criar um projeto do começo ao fim sem tocar no terminal.** Todo passo do fluxo F-01, do
   registro à materialização, roda pelas funções de `src/services/` contra o servidor real, sem
   nenhuma chamada a comando de sistema fora do runner do próprio Forge.
2. **O projeto gerado tem `CLAUDE.md`, `memory/` com 6 arquivos preenchidos e `docs/00` a `11`.**
   A prova lista os arquivos no disco, conta os de `memory/`, confere as doze pastas de `docs/` e
   verifica que nenhum arquivo de `memory/` está vazio ou só com título.
3. **Zero placeholder `{{...}}` sobrando.** A prova varre todo arquivo de texto gerado e falha
   listando arquivo e linha de cada ocorrência.
4. **ADR-001 do projeto gerado registra a stack escolhida no wizard.** A prova lê o ADR-001 gerado
   e confere que cada item da stack respondida no blueprint aparece nele.
5. **`npm run dev` do projeto gerado sobe sem erro.** A prova sobe o dev server do projeto gerado
   e confere resposta HTTP 200, depois derruba.
6. **Nenhuma escrita em disco sem dry-run aprovado.** A prova confere que a pasta não existe antes
   do plano, que o plano não escreveu nada, e que a materialização só aceita o hash do plano
   aprovado, recusando hash divergente com `FORGE_PLAN_STALE`.
7. **Tudo funciona com o copiloto desligado.** A prova roda com `FORGE_COPILOT=off` e sem chave de
   API no ambiente, e o fluxo inteiro completa.
8. **Do começo ao dev server: menos de 10 minutos.** A prova mede o tempo de parede e reporta,
   separando quanto foi `npm install`.

Além dos oito:

9. A prova é repetível: rodar duas vezes seguidas dá o mesmo resultado, e a segunda não é
   contaminada pela primeira.
10. A prova não toca o `FORGE_HOME` nem o workspace do dono, e limpa o que criou.
11. `npm test` continua verde e `npm run build` sem erro depois de qualquer correção.
12. O relatório em `docs/09_BACKLOG/fase1-aceite.md` diz, item por item, o resultado e a
    evidência, incluindo o que **não** foi provado.

## 8. Escopo de correção

Se a prova falhar, o que pode ser corrigido nesta rodada:

- Defeito em template, gerador, runner ou rota que impeça um dos oito itens.
- Placeholder não substituído, arquivo faltando, conteúdo vazio em `memory/`.

O que **não** pode, e vira item de backlog com a evidência:

- Falta de recurso que o bloco nunca prometeu.
- Qualquer coisa que exija decisão de produto ou de arquitetura nova.
- Mudança em ADR aceito.

## 9. Edge cases conhecidos

- **`npm install` do projeto gerado**, que é o R-07. Se falhar, a prova registra e segue, porque o
  R-07 está travado esperando decisão do dono, e o item 5 pode passar mesmo assim se as
  dependências instalarem.
- **Porta ocupada.** A prova escolhe porta livre e falha com mensagem clara se não conseguir.
- **Processo do dev server sobrando.** A prova mata o que subiu, inclusive em falha.
- **Windows.** É a plataforma do dono, e a prova roda nela. Caminho com espaço e barra invertida
  precisa funcionar.

## 10. Definição de "aprovado sem ressalvas"

Os oito itens do critério da fase provados com evidência, mais os quatro itens 9 a 12, com
`npm test` verde e `npm run build` sem erro. Item que não passar e não puder ser corrigido dentro
da seção 8 é pendência escrita, e nesse caso a review é parcial, não aprovada.

## 11. Review (2026-09-08)

**Aprovado sem ressalvas.** Os oito itens do critério da fase passaram, mais os quatro itens 9 a
12 desta spec. `npm test` verde com 580 passando e 1 pulado, `npm run build` sem erro, em
Windows 11. Relatório com a evidência item por item em `docs/09_BACKLOG/fase1-aceite.md`.

| Item | Resultado |
|---|---|
| 1 a 8, o critério da fase | passaram, três execuções seguidas |
| 9, repetível | duas execuções consecutivas com o mesmo resultado, sem contaminação |
| 10, isolada | banco do dono com o mesmo conteúdo antes e depois; nenhuma pasta temporária sobrando |
| 11, suíte e build | 580 passando, build sem erro |
| 12, relatório honesto | `fase1-aceite.md`, com uma seção dizendo o que **não** foi provado |

### Defeitos encontrados

Nenhum impede os oito itens. Um foi corrigido, dois viraram registro.

1. **Sequência ANSI crua no log, corrigido aqui.** Cabe na seção 8, defeito no runner, e a
   correção é segura e não-ambígua: limpar onde pedaço de stream vira linha. Com teste que fica
   vermelho se o caractere de escape se perder numa edição futura.
2. **R-11, log de comando longo não chega ao banco.** Não impede nenhum item, e o intervalo de
   gravação é decisão de produto.
3. **R-12, parar deixa o processo real vivo no Windows.** Sério, e fora da seção 8: a correção
   mexe no ADR-002 e no controle C3, então é decisão do dono.

### Corrigido durante a review

A própria prova montava um comando PowerShell por interpolação de string, para achar processos
sobrando. O CLAUDE.md proíbe isso, e a regra vale para código de prova também. O caminho e o pid
passaram a ir por variável de ambiente, com `execFileSync` e array de argumentos.

### Uma dívida que a prova carrega

`matarSobrasEm` existe só porque o R-12 está aberto: a prova limpa processos que o produto deveria
ter matado. Quando o R-12 for corrigido, essa função sai, e a sobra passa a ser sintoma de
regressão em vez de rotina.

### O que fica registrado como item de backlog

- A porta 5173 do projeto gerado é a mesma do dev server do Forge, e os dois brigam.
- A tela final não mostra a URL do dev server, só o caminho no disco. O último passo até o projeto
  no browser ainda depende de ler o log.
