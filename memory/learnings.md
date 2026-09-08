# Aprendizados, KORA FORGE

## Objetivo
Memória viva do projeto: erros, surpresas e insights, registrados enquanto ainda doem,
para não serem redescobertos do zero.

## Contexto
O Forge nasce de um método já rodado várias vezes à mão. Boa parte do que se sabe hoje
veio de projeto que travou. Este arquivo guarda o porquê das escolhas que parecem
excesso de cuidado.

## Regras Gerais
- Entrada tem: o que aconteceu, o que se esperava, o que se aprendeu, o que muda a partir de agora.
- Aprendizado validado (2 ou mais casos reais) é promovido para `patterns.md`, copiado e não apenas referenciado. O original fica como histórico, marcado como promovido.

## Validações
- Aprendizado pós-incidente exige referência ao bug ou ao ADR relacionado.

## Permissões
- Aberto a qualquer dev ou agente.

## Exceções
- Aprendizado que envolva dado sensível é anonimizado antes de registrar.

## Auditoria
- Autor, data e origem.

## Eventos
- `learning.adicionado`, `learning.promovido`

## Configurações Futuras
- Ritual de retrospectiva ao fim de cada fase, alimentando este arquivo.

## Casos de Uso
- Pós-incidente, fim de fase, quando uma decisão antiga parecer sem sentido.

## Critérios de Aceite
- [ ] O que aconteceu e o que se esperava
- [ ] O que muda a partir de agora

---

## Aprendizados que originaram este projeto

### A-01, o custo de partida é o que mata projeto, não a dificuldade técnica
Observado em várias ventures da Kora. A parte difícil raramente é o código, é montar de
novo a estrutura e relembrar as decisões. O que muda: o Forge otimiza para reduzir o
tempo até o primeiro progresso visível, não para gerar o código mais elegante.

### A-02, projeto sem governança na linha 1 não ganha governança depois
Adicionar `memory/`, ADRs e plano de segurança em projeto já rodando quase nunca
acontece. O que muda: a fundação governada é a **primeira** coisa que o Forge gera, antes
de qualquer `src/`. Um projeto materializado sem `memory/` preenchido é considerado uma
materialização falha.

### A-03, ideia nova compete com tarefa em andamento e vence
Padrão de execução conhecido: entusiasmo migra para a ideia mais recente e a anterior
esfria. O que muda: o Forge tem uma gaveta de ideias embutida no fluxo (capturar sem sair
do projeto atual) e mostra progresso visível cedo, porque progresso visível é o que
sustenta a execução.

### A-04, documentação que nasce vazia morre vazia
Template com página em branco não é preenchido. O que muda: todo arquivo gerado nasce com
estrutura, exemplo-guia e conteúdo real vindo do blueprint. Placeholder `{{...}}` que
sobrar na saída é bug, não pendência.

### A-05, o que parece automatizável só fica claro fazendo à mão a última vez
Por isso a fundação deste projeto foi escrita manualmente, apesar de o produto existir
justamente para automatizar isso. O que muda: cada etapa manual escrita aqui virou item
de escopo da Fase 1.

### A-06, teste verde em uma plataforma não diz nada sobre a outra
`server/lib/processo.js` fazia `spawn('npm', ..., { shell: false })` e passou por 435 testes
verdes, uma spec e uma auditoria de bloco, todos rodados em Linux. Na máquina do dono, que é
Windows, o runner não executava nenhum comando `npm`, porque `npm` é `npm.cmd` e o Node só
consulta o `PATHEXT` com shell ligado. O que muda: o Forge é ferramenta local e Windows é a
plataforma principal dele, então nenhum bloco que toca processo, caminho ou sistema de arquivos
fecha sem rodar a suíte no Windows.

### A-07, o teste que prova o comando é o que roda o comando de verdade
O bug do R-08 sobreviveu porque todo teste do runner usava `node` com um script temporário, e
`node` é `.exe`, o único caso que já funcionava. A cobertura parecia alta e não tocava o caminho
que quebrava. O que muda: quando o valor de uma função é falar com o sistema operacional, existe
pelo menos um teste que fala com o sistema operacional de verdade, mesmo que custe um segundo.
Vale para runner, para escrita em disco e para a checagem de requisitos.

### A-08, contornar uma trava de segurança é sinal de que a saída certa é outra
Diante do `ENOENT` do `npm`, as duas saídas óbvias eram ligar `shell: true` ou apontar o `spawn`
para o `npm.cmd`. A primeira quebra o controle C3 do ADR-002. A segunda o Node bloqueia com
`EINVAL`, porque executar `.cmd` sem shell foi fechado na correção do CVE-2024-27980. A saída que
funcionou respeita as duas travas: executar o Node apontando para o `npm-cli.js`, que é o que o
`.cmd` faz por dentro. O que muda: quando a correção pede para afrouxar um controle registrado em
ADR, o caminho é procurar a terceira saída antes, não negociar o controle.

### A-09, o texto repetido em dois componentes vizinhos é bug de produto, não colisão de teste
`mensagens.materializacao.estado.concluida` e o título da `TelaFinal` nasceram com a mesma frase,
"Pronto. O projeto nasceu.", e como os dois componentes aparecem juntos na etapa Materializar, a
tela mostrava a frase duas vezes. O sintoma chegou como teste vermelho, `getByText` achando dois
elementos, e a tentação era trocar por `getAllByText`. O que muda: quando um seletor de teste
passa a achar mais de um elemento, a primeira pergunta é se a tela está repetindo informação, e
não como fazer o seletor tolerar a repetição.

### A-10, painéis vizinhos duplicam conteúdo quando cada um é especificado sozinho
A spec do bloco 8 pediu, no critério 12, a lista de comandos com resultado na `TelaFinal`. Só que
o `PainelMaterializacao` fica ao lado e já mostra exatamente isso. A duplicação só ficou visível
quando um teste contou o mesmo comando quatro vezes na tela. O que muda: critério de aceite de
componente que divide tela com outro precisa dizer o que ele **não** mostra, porque quem escreve
a spec de um componente por vez não enxerga a tela montada.
