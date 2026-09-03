# Spec, Fase 1, Bloco 5: Motor de regras

> Origem: `docs/09_BACKLOG/mvp.md`, bloco 5. Loop `spec → build → review`.
> Data: 2026-09-03. Status: **aprovado sem ressalvas** (review em 2026-09-03, seção 7).

## 1. Escopo

O "IA sem ser IA" (**ADR-004**): um avaliador determinístico de regras declarativas que lê o
blueprint, o preset e o projeto, dispara os hits, registra cada disparo em `rule_hits`, mostra o
aviso junto do campo que o causou e impede a etapa Materializar enquanto houver bloqueio aberto.
Catálogo inicial de 16 regras como dado versionado no repositório, no mesmo padrão dos presets.

## 2. Fora de escopo

- Gerador (bloco 6). Os efeitos que mexem no plano (`adicionar_arquivo`, `remover_arquivo`,
  `adicionar_dependencia`, `adicionar_comando`, `exigir_adr`) são **declarados e persistidos**,
  não executados. O gerador os consome no bloco 6.
- Runner (7), painéis (8), gaveta de ideias (9), Studio, API Hub, copiloto.
- Editor de regras na UI (Fase 5). Regra nova é arquivo novo em `regras/`.

## 3. Arquivos afetados

`shared/`: `schemas/regra.js` (contrato da regra e do hit), `contexto.js` (monta o contexto de
avaliação a partir de projeto, preset e blueprint), `avaliador.js` (operadores e avaliação, puro).

`regras/`: `README.md` e 16 arquivos `*.json`, um por regra.

`server/`: `modules/regras/{servico,rotas}.js`, `app.js`, `index.js`, `cli/init.js` (sincronizar),
`db/migrations/20260903_rule_hits_unicidade.sql`, `docs/04_MODELAGEM/schema.sql` (índice único),
`modules/projetos/servico.js` (blueprint salvo reavalia), testes.

`src/`: `services/regras.js`, `components/wizard/AvisoRegra/`, `features/wizard/ConteudoWizard.jsx`
(avisos da etapa e bloqueio), `features/wizard/PaginaWizard.jsx`, `features/registry/PaginaProjeto.jsx`
(resumo de pendências), `mensagens.js`, testes.

Docs: `docs/03_REGRAS_DE_NEGOCIO/motor-de-regras.md` (contrato real, `resolucao`, catálogo
corrigido), `README.md` RN-04, `docs/07_APIS/README.md`, `docs/04_MODELAGEM/README.md`,
`docs/06_COMPONENTES/README.md`, `docs/09_BACKLOG/mvp.md`, `README.md`, `memory/decisions.md`,
`memory/patterns.md` (P-08 com o contrato real).

## 4. Critérios de aceite

### Contrato da regra
1. `shared/schemas/regra.js` valida a regra como objeto estrito: `id` slug, `versao` inteiro ≥ 1, `severidade` ∈ {info, aviso, bloqueio}, `titulo`, `explicacao`, `quando`, `efeitos[]`, `dispensavel` boolean, `resolucao` ∈ {automatica, humana}, e os opcionais `etapa` (onde o aviso aparece) e `campo` (qual campo o causou).
2. `quando` é recursivo: folha `{ campo, operador, valor? }` com operador ∈ {igual, diferente, contem, nao_contem, maior_que, menor_que, existe, vazio}, ou nó `{ operador: 'e' | 'ou', condicoes: [...] }` com ao menos duas condições. Nada além disso, e nenhuma expressão avaliada em runtime.
3. `efeitos[].tipo` ∈ {avisar, exigir_adr, adicionar_arquivo, remover_arquivo, sugerir_valor, adicionar_dependencia, adicionar_comando, adicionar_item_backlog, marcar_seguranca, bloquear}. Efeito `bloquear` só é aceito em regra de severidade `bloqueio`.
4. `resolucao: 'automatica'` só é aceita quando `dispensavel` é `false`, e significa que o hit nasce `resolvido`: o efeito é aplicado pelo gerador, não pelo usuário. `resolucao: 'humana'` nasce `aberto`.
5. `etapa`, quando presente, pertence ao catálogo de etapas; `campo` é um caminho em ponto.

### Avaliador
6. `shared/avaliador.js` expõe `lerCampo(contexto, caminho)` que resolve caminho em ponto sem `eval`, sem `Function` e sem acessar protótipo (`__proto__`, `constructor` e `prototype` devolvem `undefined`).
7. `avaliarCondicao(condicao, contexto)` implementa os oito operadores de folha: `igual` e `diferente` comparam por valor; `contem` e `nao_contem` funcionam em lista e em texto; `maior_que` e `menor_que` só comparam número e devolvem `false` para não-número; `existe` é verdadeiro para valor diferente de `undefined` e `null`; `vazio` é verdadeiro para `''`, `[]`, `{}`, `null` e `undefined`.
8. `e` exige todas as condições, `ou` exige ao menos uma. Aninhamento funciona em qualquer profundidade.
9. `avaliar(regras, contexto)` devolve os hits em ordem estável (severidade `bloqueio`, depois `aviso`, depois `info`; dentro da severidade, ordem alfabética do id) e é **determinístico**: mesmo contexto, mesmo resultado, sem depender de LLM, rede ou relógio.
10. `shared/contexto.js` `montarContexto({ projeto, preset, blueprint })` devolve objeto raso e documentado com pelo menos: `preset.id`, `preset.categoria`, `preset.etapas`, `projeto.status`, `arquitetura.*` (modelo, stack, multiTenant, whiteLabel, auth, deploy), `dados.entidades`, `seguranca.*`, `escopo.*`, `identidade.*`, `etapasConcluidas`, `assumidas`, `temUi`, `integracoes` (vazio até a Fase 3) e `ferramentasAusentes` (vazio até o bloco 7).
11. Contexto nunca lança com blueprint parcial: etapa sem resposta vira o default do schema.

### Catálogo
12. `regras/` tem os 16 ids do catálogo em `docs/03_REGRAS_DE_NEGOCIO/motor-de-regras.md`, um arquivo por regra, todos passando no schema (teste lê os arquivos).
13. **Cada regra tem dois testes**: um contexto que a dispara e um que não a dispara (RN-04 e ADR-004, "regra sem teste não entra no catálogo").
14. `carregarRegrasBuiltin()` lê `regras/*.json` em ordem de nome; regra inválida lança `FORGE_VALIDATION` citando o arquivo e derruba o boot.
15. `sincronizarRegras(db, lista)` faz upsert por `id` em `rules`, é idempotente e atualiza quando o JSON muda.

### Persistência dos hits
16. `docs/04_MODELAGEM/schema.sql` ganha índice único em `rule_hits(project_id, rule_id)`, e a migration `20260903_rule_hits_unicidade.sql` espelha isso. O teste que compara schema documentado com migrations continua verde.
17. Reavaliar não duplica hit: o mesmo `(project_id, rule_id)` é atualizado, preservando `criado_em`, `estado` e `justificativa` quando o hit já existia e continua disparando.
18. Regra que parou de disparar tem o hit marcado `resolvido` (auto-resolução por mudança de blueprint), e volta a `aberto` se disparar de novo, salvo se estiver `dispensado`.
19. Hit de regra com `resolucao: 'automatica'` nasce `resolvido`.

### Rotas
20. `POST /projects/:id/regras/avaliar` reavalia tudo e devolve `{ hits, bloqueios, podeMaterializar }`, com `hits[]` de `{ id, regraId, severidade, estado, titulo, explicacao, etapa, campo, dispensavel, efeitos, justificativa }`. Projeto inexistente responde 404.
21. `GET /projects/:id/regras` devolve os hits gravados sem reavaliar.
22. `PATCH /projects/:id/regras/:hitId` aceita `{ estado, justificativa? }` com `estado` ∈ {aberto, resolvido, dispensado, ignorado}: `dispensado` exige `justificativa` de ao menos 10 caracteres, senão 400 apontando o campo; `dispensado` em regra com `dispensavel: false` responde 400; hit de outro projeto responde 404.
23. Salvar blueprint reavalia as regras na mesma transação lógica e emite `regra.disparou` por hit novo aberto, mais `regra.dispensada` no PATCH correspondente. Eventos com `project_id`.
24. `podeMaterializar` é falso enquanto existir hit de severidade `bloqueio` em estado `aberto`.

### Front
25. `AvisoRegra` (molecule) mostra severidade, título, explicação e a ação disponível: dispensar com justificativa quando `dispensavel`, marcar como resolvido quando cabe, e nada além disso quando `resolucao` é automática.
26. O `PassoWizard` recebe em `avisos` os hits da etapa atual, e eles aparecem **junto do campo que os causou** quando a regra declara `campo`, no topo da etapa quando não declara.
27. Etapa `materializar` fica inacessível enquanto `podeMaterializar` é falso: a trilha desabilita a etapa, avançar da etapa anterior mostra o motivo e não navega, e a URL direta redireciona para a etapa do primeiro bloqueio.
28. Dispensar pede justificativa em um campo com microtexto, valida no cliente antes de enviar e mostra o erro do servidor junto do campo.
29. A tela do projeto mostra quantos bloqueios abertos existem e o caminho para resolvê-los.
30. Sem hits, nenhuma região de avisos é renderizada (o vazio não vira ruído).

### Padrões e verificação
31. Sem `fetch` fora de `api.js`; sem `style=` inline; sem cor ou fonte literal fora de `tokens.css`; sem `console.log` fora do CLI; sem `TODO`; um componente por arquivo; nenhum `eval`, `new Function` ou template de expressão no avaliador.
32. `npm test` e `npm run build` verdes, com os testes por regra do critério 13.

### Documentação
33. `motor-de-regras.md` passa a descrever o contrato real: campos da regra, `resolucao`, operadores implementados e a tabela do catálogo corrigida onde o "quando" descrito não era o que a regra avalia.
34. `README.md` de `docs/03` RN-04 ganha a auto-resolução e a regra de `resolucao`. `docs/07` documenta as três rotas. `docs/04` registra o índice único. `docs/06` ganha `AvisoRegra`. `memory/patterns.md` P-08 aponta para o contrato real. `mvp.md`, `README.md` e `memory/decisions.md` atualizados.

## 5. Edge cases conhecidos

- Regra que referencia campo inexistente no contexto: `lerCampo` devolve `undefined`, `existe` dá falso, `vazio` dá verdadeiro, e nada quebra.
- `maior_que` com texto: falso, nunca coerção silenciosa.
- Hit `dispensado` continua dispensado em reavaliações seguintes, mesmo com o blueprint mudando, até o usuário reabrir.
- Regra removida do catálogo: hits órfãos não aparecem na avaliação e não bloqueiam.
- Projeto arquivado: avaliação segue funcionando em leitura, PATCH de hit responde 400.
- Blueprint sem nenhuma resposta: contexto vem todo com defaults, e só as regras que dependem do preset disparam.
- Dois hits na mesma etapa e no mesmo campo: os dois aparecem, na ordem de severidade.

## 6. Definição de "aprovado sem ressalvas"

Os 34 critérios com sim e evidência, dois testes por regra do catálogo, `npm test` e `npm run build`
verdes, sem `TODO`, sem `console.log` fora do CLI, sem `fetch` fora da camada de serviços, e
`docs/03`, `docs/04`, `docs/06` e `docs/07` batendo com o código.

## 7. Review (2026-09-03)

Auditoria do build contra os 34 critérios. Suíte: `npm test`, 40 arquivos, 302 testes, tudo verde.
`npm run build` verde. Smoke test com o servidor real percorreu o ciclo inteiro: projeto web novo
com bloqueio aberto, correção do blueprint resolvendo o hit sozinho, dispensa recusada sem
justificativa e aceita com ela, cinco hits para cinco regras (nenhuma duplicata) e os eventos
`regra.disparou` e `regra.dispensada` gravados.

| # | Sim? | Evidência |
|---|---|---|
| 1 | sim | `shared/schemas/regra.js`; `regras.test.js` "toda regra passa no contrato" |
| 2 | sim | `condicaoSchema` recursivo com `z.lazy`; `avaliador.test.js` "e, ou e aninhamento" |
| 3 | sim | `TIPOS_EFEITO` mais `superRefine`; `regras.test.js` "bloquear exige severidade bloqueio" |
| 4 | sim | `superRefine`; `regras.test.js` "resolução automática nunca é dispensável"; servidor: hit automático nasce `resolvido` |
| 5 | sim | `etapa: z.enum(ETAPAS).optional()`, `campo` como string; usados por `AvisosDoCampo` |
| 6 | sim | `avaliador.test.js` "lerCampo" e "não atravessa o protótipo" (`__proto__`, `constructor`, `prototype`, `length`) |
| 7 | sim | `avaliador.test.js` "operadores de folha", quatro blocos, incluindo `maior_que` sem coerção |
| 8 | sim | `avaliador.test.js` "e exige todas, ou exige uma, em qualquer profundidade" |
| 9 | sim | `avaliador.test.js` "ordem estável de severidade e id" e "é determinístico" |
| 10 | sim | `shared/contexto.js`; `contexto.test.js` "achata projeto, preset e blueprint" |
| 11 | sim | `contexto.test.js` "etapa sem resposta entra com o default" e "resposta corrompida cai no default" |
| 12 | sim | `regras/` com 16 arquivos; `regras.test.js` "tem os 16 ids do catálogo documentado" |
| 13 | sim | `regras.test.js` `describe.each` com os dois casos por regra, mais o teste que falha se o catálogo crescer sem par |
| 14 | sim | `servico.js` `carregarRegrasBuiltin`; `regras.test.js` (servidor) "regra inválida lança FORGE_VALIDATION citando o arquivo" |
| 15 | sim | `regras.test.js` (servidor) "sincronizar é idempotente e atualiza quando o JSON muda" |
| 16 | sim | `20260903_rule_hits_unicidade.sql` e `docs/04_MODELAGEM/schema.sql`; `migrar.test.js` "espelha docs/04_MODELAGEM/schema.sql" continua verde |
| 17 | sim | `regras.test.js` "reavaliar não duplica hit e preserva criado_em"; smoke: 5 hits, 5 regras distintas |
| 18 | sim | `regras.test.js` "corrigir o blueprint resolve o hit sozinho, e o problema de volta reabre"; "dispensa sobrevive à reavaliação" |
| 19 | sim | `regras.test.js` "hit de resolução automática nasce resolvido e não bloqueia" |
| 20 | sim | `rotas.js` com `avaliacaoSchema`; `regras.test.js` "projeto web novo tem bloqueios abertos"; 404 testado |
| 21 | sim | `regras.test.js` "devolve os hits gravados sem reavaliar" |
| 22 | sim | `regras.test.js` "dispensar exige justificativa", "regra não dispensável recusa a dispensa", "hit de outro projeto responde 404" |
| 23 | sim | `rotas.js` de projetos reavalia após salvar; `regras.test.js` "salvar blueprint já reavalia"; eventos verificados no smoke |
| 24 | sim | `montar()` conta bloqueios abertos; testado em quase todos os casos de rota |
| 25 | sim | `AvisoRegra.test.jsx` (7 casos: automática sem ação, bloqueio não dispensável, info ignorável, reabrir, erro do servidor) |
| 26 | sim | `PaginaWizard.test.jsx` "hit com campo aparece junto do campo" (compara posição no DOM) e "hit sem campo aparece no topo da etapa" |
| 27 | sim | `PaginaWizard.test.jsx` "desabilita a etapa Materializar na trilha", "avançar explica o bloqueio, salva e não navega", "URL direta cai na etapa do bloqueio", mais o caso sem bloqueio |
| 28 | sim | `AvisoRegra.test.jsx` "só envia com o mínimo de caracteres" e "erro do servidor aparece junto do campo"; `PaginaWizard.test.jsx` "dispensar pelo wizard manda a justificativa" |
| 29 | sim | `PaginaProjeto.test.jsx` "sem bloqueio diz que está livre, com bloqueio mostra a contagem" |
| 30 | sim | `AvisosDoCampo` devolve `null` sem hits; `PaginaWizard.test.jsx` "sem hits nenhuma região de avisos é renderizada" |
| 31 | sim | greps: nenhum `eval`/`new Function` (só a menção em comentário), nenhum `fetch` fora da camada, nenhum `style=`, nenhuma cor literal, nenhum `console.log` fora do CLI, nenhum `TODO`, nenhum componente definido dentro de componente |
| 32 | sim | 302 testes em 40 arquivos; build verde |
| 33 | sim | `motor-de-regras.md` reescrito: contrato real, seção "Por que existe resolucao", operadores implementados, tabela do contexto, catálogo com o "quando" que a regra avalia de verdade |
| 34 | sim | `docs/03` RN-04.5 a RN-04.8; `docs/07` três rotas; `docs/04` invariante 6; `docs/06` `AvisoRegra` e `AvisosDoCampo`; `memory/patterns.md` P-08; `mvp.md`, `README.md` e `memory/decisions.md` com três entradas |

### Desvios do spec, todos registrados

- Um componente a mais que o previsto: `AvisosDoCampo`, que agrupa os hits de um campo e some
  quando não há nenhum. Sem ele, cada etapa repetiria a mesma verificação de lista vazia.
- O catálogo documentado descrevia o "quando" de cada regra pelo assunto ("usa Supabase"), e a
  implementação descreve o problema ("aplicação com modelo A e multi-tenant desligado"). A tabela
  em `motor-de-regras.md` foi corrigida para dizer o que as regras avaliam, conforme o `CLAUDE.md`
  manda fazer quando doc e código divergem.
- Três regras dependem de dado que só existe em fases futuras (`seg-service-role-no-front` e
  `seg-pagamento-exige-edge-function` pelas integrações da Fase 3, `seg-runner-ferramenta-ausente`
  pelo runner do bloco 7). Elas existem, são testadas, e os campos do contexto nascem vazios em
  vez de ausentes, para que não haja mudança de contrato depois.

### Correções feitas durante o review

- **Bug real, pego antes dos testes**: os componentes de aviso ancorados em campo estavam sendo
  criados por uma função declarada dentro da etapa (`const Avisos = ...`). Isso dá identidade nova
  a cada render do pai, e o React remontaria a subárvore, apagando o que o usuário tivesse digitado
  no campo de justificativa. Trocado por chamada direta, e um grep na verificação estática passou a
  cobrir esse padrão.

### Pendências que exigem decisão do Matheus

Nenhuma. Duas observações:

- `POST /regras/avaliar` com `Content-Type: application/json` e corpo vazio responde 400, que é o
  comportamento padrão do Fastify. O front sempre manda `{}` e funciona; sem o cabeçalho também
  funciona. Deixei como está: mexer no parser de corpo global para acomodar `curl` enfraqueceria a
  validação de entrada em todas as rotas, e isso é fronteira de segurança.
- Um projeto "Criar Aplicação Web" recém-criado nasce com dois bloqueios (multi-tenant e design),
  porque o blueprint ainda não tem respostas. Eles somem quando o usuário passa pelas etapas, que
  é exatamente o que o wizard conduz. É o comportamento pretendido, mas vale ver na tela antes de
  fechar a fase.

✅ feito. Todos os 34 critérios de aceite cobertos, sem ressalvas.
