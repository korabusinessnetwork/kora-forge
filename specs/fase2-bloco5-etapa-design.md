# Fase 2, bloco 5, etapa Design no wizard

> Spec do loop `spec → build → review`. A auditoria critério a critério vira a seção 7 deste
> mesmo arquivo, e o bloco só é declarado feito quando todos os critérios têm sim com evidência.
> Rodada conduzida em modo Full Automático (`.full-auto/`), sem o dono na tela: toda escolha que
> seria dele está registrada na seção 1 com o motivo.

## 1. Escopo

Os blocos 1 a 4 entregaram o Studio, mas a etapa `design` do wizard continua sendo o
`EtapaFutura`: um parágrafo que manda esperar a pasta existir, texto que deixou de ser verdade no
bloco 1. Este bloco troca esse parágrafo por uma etapa de verdade, com **uma pergunta só: de onde
vem o design do projeto**, e amarra a resposta ao plano.

1. **`Design.jsx`**, a etapa, no lugar do `EtapaFutura` para `design`. Pergunta com duas opções,
   "Usar o padrão Kora" primeiro e marcada, e "Usar o meu desenho do Studio". Mostra o estado do
   desenho salvo (nenhum, ou quantas páginas e qual versão), um link para abrir o Studio, e o que
   acontece depois.
2. **A escolha vive no estado da etapa, não em campo novo.** "Padrão Kora" é a etapa em
   `assumidas`; "desenho do Studio" é a etapa em `etapasConcluidas`. Avançar com o padrão faz o
   mesmo que Pular. Motivo: `respostas.design` é `strictObject({})`, e um campo novo com default
   mudaria a serialização de todo blueprint existente, e com ela o hash congelado da Fase 1
   (`sha256:175a2bf0…`). O par concluída/assumida já significa exatamente "respondeu" e "aceitou o
   padrão" (decisão de 2026-09-03 em `memory/decisions.md`), então não é preciso inventar nada.
3. **`designEfetivo()`**, função pura em `shared/`, e o gerador passa a usá-la: com a etapa
   `design` em `assumidas`, o documento salvo **não entra** no plano, nem no hash. É o que torna
   verdadeira a promessa da fase, "pular a etapa Design continua funcionando: o projeto sai com o
   padrão Kora, como hoje", mesmo quando alguém abriu o Studio e salvou algo antes de decidir.
   Sem isso, assumir o padrão com um desenho salvo mudaria o hash e, no bloco 6, os arquivos.
4. **Studio sabe de onde veio.** Aberto a partir da etapa (`?origem=wizard`), o link de voltar
   leva de volta à etapa Design, não à página do projeto. E quando o blueprint está com o padrão
   Kora, o Studio avisa que o que for salvo ali fica guardado mas não entra no projeto, com link
   para a etapa.
5. **Regressão provada**: blueprint com `design` assumida e documento salvo gera o hash congelado e
   os mesmos arquivos de um projeto que nunca abriu o Studio.

## 2. Fora de escopo

- **Exportar o desenho para arquivos** (`tokens.css` com os valores do Studio, rotas, esqueleto de
  página). É o bloco 6. Neste bloco o desenho escolhido muda o hash do plano, como já muda desde o
  bloco 1, e só.
- **Diff em projeto materializado**, bloco 7.
- **Guarda de "sair sem salvar" no Studio.** O Studio já diz que há mudança não salva e oferece
  descartar (bloco 2). O link de voltar deste bloco segue o mesmo comportamento do link que já
  existe. Uma guarda de navegação é assunto próprio.
- **Embutir o Studio dentro do wizard.** O Studio é tela cheia de três colunas (bloco 4) e não
  cabe numa etapa; a etapa cabe em uma tela, como manda o princípio nº 1, e leva até ele.
- Etapa `apis`, que continua `EtapaFutura` até a Fase 3.
- Mudar a regra `ux-tem-ui-exige-design-system`: ela já se resolve com a etapa concluída ou
  assumida, e continua assim.

## 3. Arquivos afetados

**Criados**
- `shared/designEfetivo.js` e `shared/designEfetivo.test.js`
- `src/features/wizard/etapas/Design.jsx` e `Design.module.css`
- `src/features/wizard/etapas/Design.test.jsx`

**Modificados**
- `server/modules/gerador/servico.js`: `gerarPlano` aplica `designEfetivo` antes do hash
- `server/modules/design/design.test.js`: fixture com a etapa concluída para os testes que provam
  que o design muda o hash, e o teste novo de regressão com a etapa assumida
- `src/features/wizard/ConteudoWizard.jsx`: registra `Design`, estado da escolha, avançar com o
  padrão assume a etapa
- `src/features/wizard/PaginaWizard.test.jsx`: o teste da etapa futura vira teste da etapa Design
- `src/features/studio/PaginaStudio.jsx`, `PaginaStudio.module.css` e `PaginaStudio.test.jsx`:
  voltar conforme a origem e aviso de padrão Kora
- `src/mensagens.js`: `wizard.passos.design` ganha a pergunta e os estados; sai
  `wizard.passos.futura.design`; `studio` ganha `voltarAoWizard` e o aviso
- `docs/05_FLUXOS/README.md`: F-05 descreve a etapa como ela é
- `docs/09_BACKLOG/fase2.md`: bloco 5 entregue

Sem rota nova, sem schema novo, sem migration.

## 4. Critérios de aceite

### Função pura

1. `designEfetivo(blueprintPayload, design)` devolve `null` quando `design` é `null`.
2. Devolve `null` quando `blueprintPayload.assumidas` contém `design`, mesmo com documento salvo.
3. Devolve o `design` recebido, sem cópia nem alteração, em qualquer outro caso.
4. Tem teste próprio cobrindo os três casos, e o teste não depende de banco nem de servidor.

### Gerador e hash

5. `gerarPlano` usa `designEfetivo` para decidir se `design` entra no insumo do hash. Existe um
   lugar só que toma essa decisão, e as rotas `plano` e `materializar` continuam passando o
   registro como hoje.
6. Blueprint `criar-site` com `design` assumida **e** documento salvo gera exatamente o hash
   congelado `sha256:175a2bf0d3df9f7513ac3f69cd13c2beedad33fca9073cb2b4c70a9c64edb7db`, e os mesmos
   caminhos e conteúdos de arquivo de um projeto sem documento.
7. O teste do hash congelado sem documento continua passando, sem mudar o valor.
8. Com `design` concluída, salvar documento muda o hash e o mesmo documento dá sempre o mesmo hash
   (o teste existente, com a fixture trocada para a etapa concluída).
9. Com `design` concluída, aprovar o plano e salvar design depois faz `materializar` responder 409
   `FORGE_PLAN_STALE` sem escrever nada (o teste existente, com a mesma troca).
10. Com `design` assumida, trocar o documento salvo **não** invalida um plano aprovado: o hash do
    plano gerado depois da troca é igual ao de antes. (Provado pelo hash, e não chamando
    `materializar`, que executaria a fila de comandos de verdade.)

### Etapa no wizard

11. A etapa `design` renderiza `Design`, não `EtapaFutura`. `EtapaFutura` continua servindo `apis`.
12. A pergunta usa o atom `Selecao`, com "Usar o padrão Kora" primeiro e com o selo de padrão.
13. Blueprint sem a etapa nem em concluídas nem em assumidas abre com o padrão Kora selecionado.
    Etapa em concluídas abre com o desenho do Studio; em assumidas, com o padrão.
14. Avançar com o padrão Kora salva a etapa em `assumidas` e fora de `etapasConcluidas`, igual ao
    Pular.
15. Avançar com o desenho do Studio salva a etapa em `etapasConcluidas` e fora de `assumidas`.
16. Pular continua visível e continua assumindo a etapa.
17. Sem documento salvo, a etapa diz que ainda não há desenho. Com documento, diz quantas páginas
    e qual a versão.
18. Com o desenho do Studio escolhido e nenhum documento salvo, a etapa avisa que o projeto sai com
    o padrão Kora até existir um desenho salvo.
19. Com o padrão Kora escolhido e um documento salvo, a etapa avisa que o desenho fica guardado e
    não entra no projeto.
20. A etapa tem um link "Abrir o Studio" para `/projetos/:id/studio?origem=wizard`.
21. O microtexto da etapa diz o que acontece depois da escolha, em linguagem humana.
22. Carregando e erro da consulta do design têm estado visível na etapa; erro não impede avançar
    nem pular, porque a escolha não depende do documento.
23. Mudar só a escolha sem avançar não grava a escolha: voltar ou navegar pela trilha salva só o
    que o wizard já salva ao navegar (`etapaAtual`), com `assumidas` e `etapasConcluidas` intactas.

### Studio

24. Com `?origem=wizard`, o link de voltar leva a `/projetos/:id/wizard/design` e diz "Voltar ao
    wizard". Sem a origem, continua levando à página do projeto.
25. Com a etapa `design` em `assumidas`, o Studio mostra um aviso de que o desenho não entra no
    projeto enquanto o padrão Kora estiver escolhido, com link para a etapa Design.
26. Sem a etapa em `assumidas`, o aviso não aparece.

### Padrões e verificação

27. Nenhum texto de interface fora de `src/mensagens.js`; `wizard.passos.futura.design` removida
    sem deixar referência.
28. CSS em módulo co-localizado, só com tokens `--forge-*`; nenhum estilo inline.
29. Componente não chama `fetch`: o design chega por `src/services/design.js` (a varredura de
    arquitetura continua verde).
30. `npm test` verde e `npm run build` verde, sem teste pulado novo.
31. Validado no produto rodando: criar projeto, chegar na etapa Design, abrir o Studio, voltar ao
    wizard pelo link, e avançar com cada uma das duas escolhas conferindo o blueprint salvo.

### Documentação

32. `docs/05_FLUXOS/README.md`, F-05, descreve a pergunta e o efeito de cada escolha, e deixa de
    dizer "arrastar".
33. `docs/09_BACKLOG/fase2.md` marca o bloco 5 como entregue, com link para esta spec, e o item
    "pular a etapa Design continua funcionando" do critério da fase aponta para o teste do
    critério 6.

## 5. Edge cases conhecidos

- **Documento salvo e padrão Kora escolhido.** O documento não é apagado nem alterado; só deixa
  de entrar no plano. Voltar a escolher o desenho do Studio o traz de volta, com o mesmo hash de
  antes (determinismo).
- **Desenho do Studio escolhido sem documento.** Vale: `designEfetivo` devolve `null` porque não
  há documento, e o plano sai igual ao padrão. A etapa avisa em vez de impedir, porque a pessoa
  pode estar indo desenhar agora.
- **Projeto arquivado.** O wizard e o Studio já tratam arquivado; nada muda aqui.
- **Preset sem a etapa `design`.** Nenhum builtin é assim hoje. `designEfetivo` não olha o preset:
  sem a etapa em `assumidas`, um documento salvo entra no plano, que é o comportamento de hoje.
- **Blueprint antigo com `design` em concluídas e sem documento** (quem clicou em Avançar no
  `EtapaFutura`). Abre com "desenho do Studio" selecionado e o aviso do critério 18, e o plano não
  muda, porque não há documento.
- **Falha ao consultar o design.** A etapa mostra o erro com "tentar de novo" no lugar do resumo, e
  os botões de navegação continuam funcionando.
- **Query string com outra origem** (`?origem=qualquer`). Tratada como ausente: só o valor exato
  `wizard` muda o link.

## 6. Definição de "aprovado sem ressalvas"

Todos os 33 critérios com sim e evidência na seção 7, o hash congelado da Fase 1 intacto com e sem
documento salvo, `npm test` e `npm run build` verdes, validação no produto rodando registrada, sem
TODO novo, sem `console.log` esquecido e sem regressão nos fluxos do wizard e do Studio.

## 7. Auditoria

> Feita depois do build, com a suíte inteira verde (97 arquivos, 1101 testes, nenhum pulado) e
> `npm run build` sem erro, em Windows 11, e com o produto rodando (`npm start`, 127.0.0.1:7337).

| # | Atende | Evidência |
|---|---|---|
| 1 | sim | `shared/designEfetivo.test.js` → "sem documento salvo, não há design, qualquer que seja a escolha" |
| 2 | sim | mesmo arquivo → "com o padrão Kora escolhido, o documento salvo não entra no plano" |
| 3 | sim | mesmo arquivo → "em qualquer outro caso, devolve o mesmo registro, sem cópia" (`toBe`) |
| 4 | sim | o teste importa só a função, sem banco nem servidor |
| 5 | sim | `server/modules/gerador/servico.js`, primeira linha de `gerarPlano`; as rotas não mudaram |
| 6 | sim | `design.test.js` → "padrão Kora escolhido na etapa Design" → "com documento salvo, gera o hash congelado e os mesmos arquivos de um projeto sem Studio" |
| 7 | sim | o teste do hash congelado sem documento passa sem mudança de valor |
| 8 | sim | "com o desenho do Studio escolhido, salvar design muda o hash, e o mesmo design gera sempre o mesmo hash" |
| 9 | sim | "aprovar o plano e depois salvar design faz materializar responder FORGE_PLAN_STALE…", com a fixture `comDesenho` |
| 10 | sim | "trocar o documento salvo não invalida o plano aprovado", e "voltar a escolher o desenho do Studio traz o documento de volta, com o mesmo hash de antes" cobre o edge case da seção 5 |
| 11 | sim | `ConteudoWizard.jsx` renderiza `Design` para `design`; `EtapaFutura` segue para `apis`. `PaginaWizard.test.jsx` → "mostra a pergunta com o padrão Kora primeiro e selecionado…" |
| 12 | sim | mesmo teste: primeira opção `padrao`, com o selo `mensagens.selecao.padraoKora` |
| 13 | sim | "mostra a pergunta…" (sem estado), "abre com a escolha que o blueprint guarda" (concluída) e "assumida abre com o padrão Kora" |
| 14 | sim | "avançar com o padrão Kora assume a etapa, igual a pular" |
| 15 | sim | "avançar com o desenho do Studio conclui a etapa" |
| 16 | sim | "pular continua visível e assume a etapa" |
| 17 | sim | "sem desenho salvo diz isso…" e "com desenho salvo diz páginas e versão…" |
| 18 | sim | "sem desenho salvo diz isso, e com o Studio escolhido avisa que sai o padrão" |
| 19 | sim | "com desenho salvo diz páginas e versão, e com o padrão avisa que fica guardado", que também confere que o aviso some ao trocar |
| 20 | sim | "o link abre o Studio marcando a origem" |
| 21 | sim | `wizard.passos.design.micro` diz o que sai com cada escolha, conferido no teste do critério 11 |
| 22 | sim | "carregando o desenho tem estado visível", "erro ao consultar o desenho aparece, tenta de novo…" e "com erro na consulta, avançar funciona" |
| 23 | sim | "trocar só a escolha e voltar não grava a escolha". O critério foi reescrito no build: voltar já grava `etapaAtual` em todo o wizard, e a primeira versão do texto dizia "não salva nada", o que contradiria esse comportamento existente |
| 24 | sim | `PaginaStudio.test.jsx` → "aberto pela etapa, o voltar leva de volta ao wizard" e "sem origem, ou com outra origem, o voltar continua levando ao projeto" |
| 25 | sim | "com o padrão Kora escolhido, avisa que o desenho não entra no projeto" |
| 26 | sim | "com o desenho do Studio escolhido, o aviso não aparece" |
| 27 | sim | busca por `futura.design` em `src`, `shared` e `server` sem resultado; textos novos só em `mensagens.js` |
| 28 | sim | `Design.module.css` só com `--forge-*`; nenhum `style=` em `Design.jsx` |
| 29 | sim | `Design.jsx` consulta por `services/design.js`; `camadaDeServicos.test.js` verde na suíte |
| 30 | sim | 1101 passando, nenhum pulado; build verde |
| 31 | sim | ver validação abaixo |
| 32 | sim | `docs/05_FLUXOS/README.md`, F-05 reescrito, sem "arrastar" |
| 33 | sim | `docs/09_BACKLOG/fase2.md`: bloco 5 entregue com link, bloco 6 próximo, e o item "pular a etapa Design" aponta para o teste do critério 6. Fica `[ ]` de propósito: o bloco 6 é o que faz o design mudar arquivos, e a promessa precisa ser reprovada lá |

**Desvio de arquivo**: a spec previa `Design.test.jsx` separado. Os testes da etapa ficaram em
`PaginaWizard.test.jsx`, porque a escolha mora no `ConteudoWizard` e só a página inteira exercita
avançar, pular e o blueprint salvo. Um teste só do componente repetiria metade dos casos sem cobrir
o que importa.

### Validação com o produto rodando

Servidor real (`npm start`), browser do app aberto pelo link com o token de sessão. Como o painel
não desenhava na tela, os cliques foram disparados por eventos de DOM na página real, e as leituras
foram feitas na mesma API que a UI usa.

1. Projeto "Validacao Bloco 5" criado pela tela Novo projeto, menu Criar Site.
2. Etapa Design abriu com a pergunta, "Usar o padrão Kora · padrão Kora" primeiro, "Ainda não há
   desenho salvo no Studio." e o link. O bloqueio `ux-tem-ui-exige-design-system` apareceu no topo,
   como antes.
3. "Abrir o Studio" levou a `/studio?origem=wizard`; "Voltar ao wizard" voltou para `/wizard/design`.
4. Avançar com o padrão: blueprint v2 com `assumidas: ["design"]`, `etapasConcluidas: []`. O Studio,
   aberto sem origem, mostrou o aviso de padrão escolhido e o voltar para o projeto.
5. Plano gerado (`sha256:319eca03…`), design salvo com uma página, plano gerado de novo: **mesmo
   hash**.
6. De volta à etapa: "Há um desenho salvo: 1 página, versão 1." e o aviso de guardado. Trocada a
   escolha para o Studio, o aviso sumiu; Avançar gravou `etapasConcluidas: ["design"]`,
   `assumidas: []`, e o hash do plano mudou (`sha256:0bb6f500…`).
7. De volta à etapa, abriu com "studio"; Pular gravou `assumidas: ["design"]` e o hash voltou a ser
   exatamente `sha256:319eca03…`.
8. O projeto de teste foi arquivado ao fim.

### Veredito

Aprovado sem ressalvas, 33 de 33. A aparência (espaçamento do resumo, contraste do aviso) não foi
conferida por olho, porque o painel do browser não desenhou nesta sessão.
