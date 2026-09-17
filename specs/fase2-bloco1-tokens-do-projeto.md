# Fase 2, bloco 1, os tokens do projeto

> Spec da rodada 10 do ciclo, e a primeira da Fase 2. Escopo da fase em
> `docs/09_BACKLOG/README.md`, decisão em **ADR-005**.

## 1. Escopo

O projeto passa a ter um documento de design versionado, com os tokens que hoje são fixos no
template. O usuário edita esses tokens na etapa Design do wizard, com preview ao vivo, e o
`tokens.css` gerado sai com o que ele escolheu.

## 2. Fora de escopo, e é a maior parte do Studio

- **Canvas, zoom, pan e snap.** Nada de montar página nesta rodada.
- **Páginas, regiões e componentes.** A coluna `paginas_json` nasce com um documento vazio e não é
  editada aqui. Serializar layout exige ADR próprio, que o ADR-005 já previu e que não é desta
  rodada.
- **Exportar rotas e esqueleto de JSX.**
- **Plano de diff ao alterar design de projeto já materializado.** Enquanto isso, vale a regra que
  já existe: mudar o blueprint depois do plano invalida o plano pelo hash.
- **Biblioteca de componentes do Studio.**
- Tema claro da UI do Forge, R-13 e os itens `[ASSUMIDO]`.

Esta rodada entrega a **primeira** das cinco linhas do escopo da Fase 2, e é de propósito a menor
que ainda muda o projeto gerado.

## 3. Origem e decisões que este item honra

- **ADR-005**, primeiro item da decisão: "Edita os tokens do projeto, com preview ao vivo".
- **`docs/09_BACKLOG/README.md`, Fase 2**: "Painel de tokens com preview ao vivo".
- **`docs/04_MODELAGEM/schema.sql`**: a tabela `design_documents` já existe, com `versao` e
  `UNIQUE (project_id, versao)`. Nenhuma migration nova.
- **P-03**: geração por template versionado. Os tokens entram como chave de template, e o
  `tokens.css` continua sendo um arquivo CSS legível, não uma casca preenchida por string montada
  em JavaScript.
- **P-06**: dois design systems, nunca misturados. Ver a seção 5, que aponta uma divergência entre
  o padrão escrito e o que o template gera.
- **Princípio nº 1**: nenhuma pergunta sem default. O documento nasce com os valores que o template
  já usa hoje, então quem não quiser mexer não mexe em nada.
- **Princípio nº 2**: o mesmo documento gera sempre o mesmo `tokens.css`, sem LLM no caminho.

## 4. O que muda para quem usa

Hoje a etapa Design é uma tela de espera que só marca a etapa como assumida. Depois desta rodada
ela mostra os tokens do projeto, agrupados, com preview ao vivo ao lado. Quem não mexer sai com
exatamente o que sai hoje.

## 5. Uma divergência entre o padrão escrito e o código, que preciso apontar

O **P-06** diz que os tokens do projeto vivem no namespace `--projeto-*`. O template gera
`--cor-fundo`, `--espaco-1`, `--raio-md` e assim por diante, **sem prefixo**.

Os dois não colidem com `--forge-*`, então o princípio do padrão, não misturar os dois sistemas,
está de pé. O que diverge é a letra.

**Esta rodada mantém os nomes que o template já usa**, por três motivos: são eles que estão em todo
projeto já gerado, o `global.css` do template os referencia, e renomear trinta e cinco tokens é
churn sem ganho. A divergência é registrada, e **corrigir o P-06 é decisão do dono**, porque
`memory/patterns.md` diz que padrão que afeta output gerado precisa do aval dele.

## 6. O documento de design

Uma linha em `design_documents` por versão, espelhando o que `blueprints` já faz:

- `tokens_json`: mapa de token para valor, validado por Zod contra o catálogo fechado da seção 7.
- `paginas_json`: `{"paginas": []}` nesta rodada, e não editável.
- Nova versão a cada mudança de conteúdo. Salvar igual não versiona, mesma regra do blueprint.
- Sem documento, valem os defaults. O documento só nasce quando alguém muda alguma coisa.

## 7. O catálogo de tokens é fechado

Token não é campo livre. O catálogo vive em `shared/schemas/design.js`, e cada token declara nome,
grupo, tipo e default. Tipo é um de `cor`, `medida`, `fonte` ou `texto`, e o tipo decide a
validação e o controle na tela.

Fechar o catálogo é o que permite três coisas: validar o que chega da API, gerar o CSS sem
condicional, e o preview saber o que renderizar. Token novo entra no catálogo e no template no
mesmo commit, nunca só num dos dois.

## 8. Arquivos afetados

Criados:

- `shared/schemas/design.js` e `design.test.js` — catálogo, defaults e schema.
- `server/modules/design/servico.js`, `rotas.js` e `servico.test.js`.
- `src/services/design.js` e `design.test.js`.
- `src/components/design/PainelTokens/` — o editor, com CSS e teste.
- `src/components/design/PreviewTokens/` — o preview isolado, com CSS e teste.
- `src/features/wizard/etapas/Design.jsx` — a etapa deixa de ser tela de espera.

Modificados:

- `server/app.js` — registra o módulo.
- `shared/valores.js` — os tokens viram chave de template.
- `templates/design-tokens/arquivos/src/styles/tokens.css` — placeholders no lugar dos literais.
- `server/modules/gerador/servico.js` — passa os tokens do projeto ao montar os valores.
- `src/mensagens.js`, `docs/06_COMPONENTES/README.md`, `docs/09_BACKLOG/README.md`.

## 9. Critérios de aceite

### Documento e API

1. `GET /api/projects/:id/design` devolve o documento ativo, ou os defaults do catálogo quando
   nenhum documento existe. Nunca 404 por não ter documento.
2. `PUT /api/projects/:id/design` valida contra o catálogo e grava versão nova.
3. Token fora do catálogo é recusado com `FORGE_VALIDATION` e o nome do token apontado.
4. Valor fora do tipo é recusado: cor precisa ser cor, medida precisa ter unidade.
5. Salvar conteúdo idêntico ao ativo **não** cria versão nova, e responde o documento atual.
6. Projeto arquivado ou inexistente responde como as demais rotas de projeto já respondem.
7. Salvar emite `design.alterado`, no passado e em `dot.case`, fire-and-forget.
8. Toda rota exige token de sessão e checa `Origin`, como as outras.

### Geração

9. O `tokens.css` gerado usa os valores do documento do projeto.
10. Sem documento, o `tokens.css` gerado é **byte a byte igual** ao de hoje. É o que garante que
    ninguém que já usa o Forge veja mudança sem ter pedido.
11. Todo token do catálogo tem chave no mapa de valores, e o `tokens.css` não tem nenhum literal de
    cor, medida ou fonte fora de placeholder.
12. Zero `{{...}}` sobrando no arquivo gerado, que é o critério da Fase 1 e continua valendo.
13. Mudar um token muda o hash do plano, então plano velho é recusado com `FORGE_PLAN_STALE`.

### Tela

14. A etapa Design mostra os tokens agrupados por cor, tipografia, espaçamento e forma, com o nome
    legível de cada um, não o nome da variável CSS.
15. Cada token tem o controle do seu tipo: cor abre seletor de cor, medida aceita número com
    unidade, fonte aceita texto.
16. O preview ao vivo reflete a mudança sem salvar, e mostra um pedaço de interface de verdade, com
    texto, botão, superfície e borda.
17. O preview é isolado: os tokens do projeto não vazam para a UI do Forge, e nada de `--forge-*`
    entra no preview.
18. Existe "voltar ao padrão Kora", por token e para tudo, porque o princípio nº 1 exige que o
    default seja sempre alcançável.
19. Salvar mostra carregando, sucesso e erro, e erro não perde o que foi editado.
20. Sair da etapa sem salvar não perde o que foi editado, do mesmo jeito que o resto do wizard.

### Sempre

21. Componente nunca chama `fetch`; tudo passa por `src/services/design.js`.
22. CSS em CSS Modules com tokens `--forge-*` na UI do Forge. Nenhuma cor hardcodada, nenhum estilo
    inline, exceto a injeção dos tokens do projeto no preview, que é dado e não estilo.
23. Todo texto visível sai de `src/mensagens.js`.
24. `npm test` verde, `npm run build` sem erro e `npm run verificar:fase1` com os oito itens
    passando, no Windows.
25. Sem `console.log` esquecido e sem `TODO` sem justificativa escrita ao lado.

## 10. Edge cases conhecidos

- **Projeto já materializado.** Mudar o design não reescreve nada sozinho: o plano é regerado e o
  hash muda, então a materialização exige aprovação nova. Plano de diff é rodada futura.
- **Documento com token faltando**, gravado por uma versão anterior do catálogo. O que falta cai
  para o default, e o que sobra é recusado.
- **Cor em formato exótico.** A validação aceita hexadecimal e as funções de cor do CSS; o que não
  casar é recusado com mensagem que diz o formato esperado.
- **Preview com contraste ruim.** Não é bloqueio nesta rodada. Avisar sobre contraste é candidato a
  regra do motor, não a validação de schema.
- **Dois projetos abertos.** O documento é por projeto, e a rota carrega o do id da URL.
- **Etapa Design desligada no preset.** O `criar-site` liga, o `criar-aplicacao-local` pode não
  ligar. Preset que não liga a etapa continua gerando com os defaults.

## 11. Definição de "aprovado sem ressalvas"

Os vinte e cinco critérios em sim, com `npm test` verde, `npm run build` sem erro e a prova da
Fase 1 passando, mais um projeto gerado de verdade com token alterado, conferindo no disco que o
`tokens.css` saiu com o valor escolhido.

## 12. Review (2026-09-09)

**Aprovado sem ressalvas.** Vinte e cinco de vinte e cinco critérios cobertos. `npm test` verde com
684 passando e 1 pulado, `npm run build` sem erro, e `npm run verificar:fase1` com os oito itens
passando, em Windows 11.

### O defeito que a validação no produto real pegou

O critério 13 pedia que mudar um token mudasse o hash do plano. **Não mudava.** O hash cobria
blueprint, preset e templates, e não os tokens. O efeito era grave e silencioso: o usuário gerava o
plano vendo um `tokens.css`, mudava o design, aprovava o plano antigo, e o runner regerava com os
tokens novos. O hash batia, porque o blueprint não tinha mudado, e ele recebia um arquivo que nunca
aprovou. É exatamente a garantia que o dry-run existe para dar, quebrada pela minha própria rodada.

Corrigido incluindo os tokens no hash, e coberto por dois testes em `gerador.test.js`.

Nenhum teste teria pego isso: os testes do gerador não conheciam design, e os do design não
conheciam plano. Só apareceu materializando um projeto de verdade e olhando o arquivo no disco.

### Corrigido durante a review

1. **O schema contradizia o próprio documento padrão.** `versao` exigia positivo e `criadoEm`
   exigia texto, mas documento não salvo tem versão zero e data nula. O schema passou a dizer isso,
   com o porquê ao lado: zero é estado legítimo, não buraco.
2. **A etapa Design deixou de ser futura**, e o teste que usava ela como exemplo de etapa futura
   passou a usar APIs, com preset próprio para não mexer na sequência que os outros testes usam. O
   texto de "futura" para design saiu, porque virou letra morta.
3. **Um teste do `PainelLog` estourava o tempo.** Ele emitia 520 linhas uma a uma, cada uma num
   `act`, o que renderiza o React por linha e vira trabalho quadrático. Passou a emitir em lote, e
   caiu de 5,8 s para menos de 1 s. Não era defeito desta rodada, mas passou a falhar com a suíte
   maior.

### O que ficou registrado e não foi corrigido

- **A suíte ficou lenta**: de 21 s para 75 s. A maior parte é legítima, porque o painel renderiza
  41 campos e a etapa Design é testada oito vezes. Fica como item de backlog.
- **Duas falhas apareceram uma vez**, numa execução concorrente com o build e a prova da Fase 1, e
  não reproduziram em quatro execuções seguidas depois. Os testes que rodam processo de verdade são
  sensíveis a disputa de CPU. Registrado junto com a lentidão, porque é o mesmo assunto.

### Pendente de decisão do dono

O **P-06** diz `--projeto-*` e o template gera nome sem prefixo. Mantive o que o template já usa, e
corrigir o padrão é decisão do dono, porque `memory/patterns.md` exige o aval dele para padrão que
afeta output gerado.
