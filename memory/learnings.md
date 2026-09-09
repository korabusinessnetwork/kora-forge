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

### A-11, `mutationFn` recebendo a função de serviço direto entrega contexto para ela
Em `GavetaIdeias.jsx`, `useMutation({ mutationFn: descartarIdeia })` fez o serviço ser chamado com
`('i1', { client, meta, mutationKey })`. O React Query passa o contexto como segundo argumento, e
o serviço engoliu em silêncio. O sintoma só apareceu porque um teste afirmava
`toHaveBeenCalledWith('i1')`. Hoje é inofensivo, porque nenhum serviço lê o segundo parâmetro; no
dia em que um ler, quebra sem erro. O que muda: `mutationFn` sempre encapsulada,
`mutationFn: (id) => descartarIdeia(id)`. `Materializar.jsx` do bloco 7 ainda tem o padrão antigo
com `pararRun`, e vale corrigir quando alguém encostar naquele arquivo.

### A-12, atom sem forwardRef não aceita ref, e mexer no atom é caro
A gaveta precisava focar o campo de título ao abrir, e `Campo` não encaminha ref. Alterar o atom
significaria mexer numa peça que todo o wizard usa. A saída foi a forma com children, que o
próprio `Campo` já oferecia para controle vindo de fora. O que muda: antes de alterar um atom
compartilhado por causa de um caso novo, verificar se ele já tem uma porta de saída; e ao escrever
spec que depende de foco programático, conferir se o componente aceita ref, porque isso muda o
desenho e não é detalhe de implementação.

### A-13, saída de ferramenta de terminal não é texto, é texto com ANSI dentro
O `PainelLog` do bloco 8 passou por 26 critérios de aceite e por uma review sem ressalvas, e ainda
assim mostrava `\u001b[32m` na tela, porque todo teste usava linha fabricada em vez da saída de uma
ferramenta de verdade. O caso pior não era o lixo visual: a sequência partia o número da porta, e
`http://localhost:` mais `5175` viravam dois pedaços separados, escondendo a URL do projeto que
tinha acabado de nascer. O que muda: quando um componente mostra saída de processo, pelo menos um
teste usa saída real capturada, e a limpeza acontece onde o byte vira linha, não na tela.

### A-14, matar processo no Windows não mata os filhos dele
`parar()` mandava matar o processo criado pelo Forge e dava por encerrado. No Windows não existe
grupo de processos como no Unix, então o `vite` criado pelo `npm` sobreviveu, segurando porta e
arquivos. O defeito ficou invisível por semanas porque o teste do runner usava um script `node`
folha, sem filhos, o único formato que a implementação atendia. O que muda: teste de "parar"
precisa de um processo que crie outro processo, senão prova só o caso fácil. Detalhes no R-12.

### A-15, rodada de verificação vale mesmo quando tudo passa
Esta rodada não construiu recurso nenhum: só provou os oito itens do critério da Fase 1. Ainda
assim achou três defeitos que nove blocos de construção e quatro reviews não acharam, dois deles
em código já aprovado. O que muda: fechar fase tem um passo próprio, com prova executável e
repetível, e ele não é formalidade. `npm run verificar:fase1` é o exemplo, e o padrão vale para as
fases seguintes.

### A-16, teste de regressão precisa reproduzir a forma que quebrou, não uma parecida
Para provar o R-12 escrevi um teste com um `node` criando outro `node`, e ele passou **mesmo com o
defeito presente**: nesse formato o filho morre junto com o pai no Windows. A forma que quebra é
`npm run dev`, porque o npm cria o processo de um jeito que o desliga do pai. O teste só virou
guarda depois de usar a forma real, e eu só soube disso medindo os dois formatos lado a lado. O que
muda: teste de regressão nasce com a pergunta "isto fica vermelho sem a correção?", e a resposta se
obtém revertendo a correção de propósito, não por raciocínio.

### A-17, corrigir vazamento de processo torna a limpeza de teste assíncrona
Depois que o `parar` passou a matar árvore, dois testes do runner quebraram apagando a pasta
temporária: `taskkill` é assíncrono e os processos ainda seguravam os arquivos. O `maxRetries` do
`fs.rmSync` não resolveu, porque a retentativa é síncrona e não cede tempo ao sistema. A saída foi
`apagarQuandoLiberar` em `server/testes/apoio.js`, que espera de verdade entre as tentativas. O que
muda: teste que roda processo e apaga pasta em seguida precisa esperar o processo morrer, e o
paradoxo é que ele só passava antes porque o produto deixava o neto vivo, sem segurar a pasta pai.

### A-18, proposta de ADR que não entra no repositório desaparece
O passo `/aprender` manda propor ADR ao dono e esperar o aval. Nas rodadas 2 e 5 eu escrevi as
duas propostas em pasta temporária da sessão e mostrei o texto no resumo. Resultado: por quatro
rodadas o repositório teve duas capacidades arquiteturais em produção, `abrirPasta` e `arvore`,
**sem ADR nenhum**, contrariando o CLAUDE.md, e as propostas iam sumir com a pasta.

O erro foi confundir "não decidir" com "não registrar". O próprio
`docs/08_DECISOES/README.md` já resolve isso: "Status vira Aceito quando a decisão passa a valer",
e o ADR-008 está commitado como `Proposto` desde o começo do projeto.

**O que muda**: proposta de ADR nasce em `docs/08_DECISOES/` com Status `Proposto`, no mesmo
commit do código que ela justifica. Esperar o aval é sobre o Status, não sobre o arquivo existir.
Assim quem abrir o repositório vê o que está em uso e ainda não foi ratificado.

### A-19, escrita em lote sem gatilho de tempo perde tudo de quem nunca termina
O runner gravava `command_logs` a cada cinquenta linhas ou no fim do comando. Parecia razoável até
aparecer o caso que não se encaixa em nenhum dos dois: um dev server imprime meia dúzia de linhas e
não termina nunca, então o log dele não existia no banco enquanto rodasse. O padrão de lote assume
que todo produtor ou é volumoso ou acaba, e comando de longa duração não é nem um nem outro. O que
muda: acumulador com gatilho por quantidade nasce também com gatilho por tempo, e o teste que prova
isso usa um produtor que fica vivo, não um que termina.

### A-20, antes de mandar o sistema abrir algo, ver se a tela já sabe abrir
Para mostrar a URL do projeto novo, o caminho por inércia era repetir o abridor de pasta do bloco 8
com a URL no lugar do caminho. Seria mandar o sistema operacional abrir um browser que já estava
aberto, já que a interface do Forge roda dentro de um. Um `<a href target="_blank">` faz o mesmo
sem processo nenhum. E tem um ganho de segurança que não é acessório: a URL vem da saída de um
processo, ou seja, de fora, e passá-la a um binário promoveria dado a instrução, que é justamente o
que o CLAUDE.md proíbe. O que muda: quando a ação é "levar o usuário a algum lugar", perguntar
primeiro se o meio onde a interface já vive resolve, antes de recorrer ao sistema.

### A-21, schema estrito acusa mudança de contrato, e é para ele acusar mesmo
Adicionar `url` ao comando deixou três testes de serviço vermelhos, porque os fixtures não tinham o
campo e `z.strictObject` com `nullable` exige presença. A tentação é afrouxar para `optional`. Foi
o contrário: os fixtures foram atualizados, porque o servidor sempre preenche o campo e o estado da
materialização nem é persistido, então não existe dado velho para tolerar. O que muda: quando um
schema estrito quebra teste ao ganhar campo, a pergunta é se existe de verdade um produtor que não
preenche. Se não existe, afrouxar só esconde o contrato.

### A-22, bug registrado aponta onde doeu, não onde existe
O R-10 foi registrado na rodada 3 apontando um lugar, `pararRun` em `Materializar.jsx`, porque foi
ali que o sintoma apareceu. Ao abrir a rodada para corrigi-lo, uma varredura de trinta segundos
achou mais dois: `atualizarSettings` e `criarProjeto`. Nada de errado com o registro, ele conta o
que se sabia; o erro seria tratá-lo como inventário. O que muda: rodada que abre um bug registrado
começa varrendo o padrão no código inteiro, antes de escrever a spec, e a spec já nasce com o
número real de ocorrências.

### A-23, hash de aprovação precisa cobrir tudo que muda o conteúdo aprovado
O plano do Forge é aprovado por hash, e o hash cobria blueprint, preset e templates. Ao fazer o
`tokens.css` sair do documento de design, criei um quarto insumo e não o incluí. O efeito era
silencioso e grave: o usuário via um plano, mudava o design, aprovava o plano antigo, e o runner
regerava com os tokens novos. O hash batia, e ele recebia um arquivo que nunca aprovou, que é
exatamente o que o dry-run existe para impedir. O que muda: insumo novo na geração entra no hash no
mesmo commit, e a pergunta ao adicionar qualquer fonte de dado ao gerador é "isto muda o que vai
para o disco?". Se sim, entra.

### A-24, teste de módulo não vê defeito que mora entre dois módulos
O defeito acima passou por 25 critérios e por testes de catálogo, de serviço, de painel, de preview
e de etapa, todos verdes. Nenhum poderia tê-lo pego: o teste do gerador não conhecia design, e o do
design não conhecia plano. Ele apareceu materializando um projeto de verdade e olhando o arquivo no
disco. O que muda: quando uma rodada liga dois módulos que não se conheciam, o critério de aceite
inclui um caminho que atravessa os dois, e a validação no produto real deixa de ser conferência
final para ser o teste principal.

### A-25, `act` por evento vira trabalho quadrático
Um teste do `PainelLog` emitia 520 linhas, cada uma dentro do próprio `act`, o que renderiza o React
por linha sobre uma lista que cresce. Passava em 21 s de suíte e estourou o tempo quando a suíte
chegou a 75 s. Emitir tudo num `act` só derrubou de 5,8 s para menos de 1 s, provando a mesma coisa.
O que muda: teste que simula rajada emite a rajada de uma vez; um `act` por evento só faz sentido
quando o que se testa é o passo a passo.

### A-26, ADR aceito pode carregar ambiguidade que só aparece na implementação
O ADR-005 diz "implementação com DOM absoluto" e justifica com "o que é DOM exporta para JSX quase
um para um". As duas frases convivem em paz enquanto ninguém implementa, e brigam no instante em que
alguém pergunta o que é guardado: elemento absoluto exporta para desenho, não para esqueleto. Não é
defeito de quem escreveu, é o limite do que uma decisão consegue antecipar. O que muda: quando uma
rodada cumpre uma pendência deixada por um ADR aceito, ela relê o ADR inteiro procurando frase que
só faz sentido de um jeito depois de escolhida, e o ADR novo declara a leitura que adotou em vez de
assumir que era óbvia.

### A-27, o que um formato não pode expressar é decisão de produto, não detalhe técnico
Ao desenhar a serialização do Studio, a parte que mais custou não foi escolher árvore ou coordenada:
foi listar o que o formato **não** pode dizer. Vínculo com dado, evento, condicional e estado por nó
são exatamente o que separa "gera esqueleto" de "é low-code", e low-code é não-objetivo escrito em
`memory/identity.md`. Sem essa lista, o formato cresceria por pedido razoável até virar outra coisa.
O que muda: formato novo nasce com a seção do que ele recusa expressar, e cada recusa aponta a
decisão ou o não-objetivo que a sustenta.
