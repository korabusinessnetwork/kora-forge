# Continuar o KORA FORGE em sessão local

> Prompt de handoff gerado em 2026-09-03, ao fim do bloco 7 da Fase 1.
> Branch canônico: `main`.
> Cole o bloco "Prompt" abaixo na primeira mensagem da sessão local do Claude Code.

---

## Prompt

```
Estou retomando o KORA FORGE em sessão local. O repositório é korabusinessnetwork/kora-forge e
todo o trabalho está em main. Trabalhe direto na main.

  git clone https://github.com/korabusinessnetwork/kora-forge
  cd kora-forge

ANTES DE QUALQUER COISA, leia nesta ordem:
1. CLAUDE.md — a constituição. Os dois princípios inegociáveis são intuitividade e determinismo.
2. memory/identity.md, memory/restrictions.md, memory/patterns.md, memory/bugs.md
3. docs/09_BACKLOG/mvp.md — a seção "Estado" diz exatamente que bloco está entregue e qual é o próximo
4. specs/ — uma spec por bloco, cada uma com a auditoria na seção 7. Leia a do bloco 7 para
   entender onde parei e quais decisões ficaram abertas.

COMO RODAR (importante, tem uma armadilha):
  npm ci          # use ci, não install. Ver o bug R-07 em memory/bugs.md
  npm run forge:init
  npm run forge   # abre a URL que o terminal imprime; ela carrega o token de sessão

  npm test        # 435 testes, todos verdes no momento do handoff
  npm run build

MÉTODO DE TRABALHO, sem exceção:
Toda feature nova entra pelo loop spec → build → review, que é o harness descrito no CLAUDE.md
e no ADR-008. Os comandos /spec, /build e /review estão em .claude/commands/. Na prática:
  1. Escreva a spec em specs/fase1-blocoN-nome.md com critérios de aceite verificáveis e numerados
  2. Construa
  3. Audite critério por critério, com evidência (nome do teste, arquivo ou checagem rodada),
     e anexe a auditoria como seção 7 da própria spec
  4. Só declare "feito" quando todos os critérios estiverem cobertos, sem ressalvas
Além dos testes, valide rodando o produto de verdade. Os três defeitos mais sérios que apareceram
até aqui não foram pegos por teste, e sim rodando o servidor real com curl.

O QUE FAZER AGORA: bloco 8, telas de fechamento. É o último da Fase 1.
Escopo em docs/09_BACKLOG/mvp.md:
  - Painel do plano, agrupado por pasta, com conflitos no topo  [já existe, feito no bloco 6]
  - Painel de log ao vivo  [falta: consumir o WebSocket /api/ws/runs/:runId]
  - Tela final com caminho, resumo e atalho para abrir no editor  [falta]

Detalhes que o bloco 8 precisa saber:
  - O WebSocket já existe e funciona. O token vai no subprotocolo, não em header:
    new WebSocket(url, ['forge-token', token]). Ele envia o histórico já gravado ao conectar,
    então quem chega no meio não perde nada. Contrato dos eventos em docs/07_APIS.
  - O componente PainelLog está previsto em docs/06_COMPONENTES e ainda não existe.
  - VisualizadorDiff também está previsto e não existe; o conflito hoje é declarado como ação
    "sobrescrever" com os dois tamanhos, sem diff linha a linha.
  - PainelMaterializacao (bloco 7) já mostra a fila de comandos e as três decisões. O painel de
    log entra ao lado dele, não no lugar.

DEPOIS DO BLOCO 8, rode o critério de aceite da Fase 1 inteira, que está em
docs/09_BACKLOG/mvp.md. Ele exige criar um projeto do começo ao fim sem tocar no terminal, em
menos de 10 minutos.

DUAS COISAS ESPERAM DECISÃO MINHA. Não decida sozinho; me pergunte quando forem relevantes:
  1. R-07 em memory/bugs.md: npm install falha com npm 10.9.7 em qualquer package.json que dependa
     de vitest 4.1.11 (repro mínimo está lá). Atinge o próprio Forge, por isso npm ci. O projeto
     gerado herda o problema. O runner já lida bem: para a fila e oferece repetir, pular ou
     abortar. A decisão é se o preset passa a declarar --legacy-peer-deps ou se o runner tenta
     fallback. Isso afrouxa a resolução de peers em todo projeto gerado, então é escolha de padrão.
  2. Os itens marcados [ASSUMIDO] em respostas-intake.md (identidade visual e referências de
     design) nunca foram confirmados por mim. Eles alimentam docs/02_DESIGN_SYSTEM e a Fase 2.

REGRAS QUE NÃO SE QUEBRAM (estão no CLAUDE.md, repito as que mais pesam neste código):
  - Nada de eval, new Function ou shell: true. Comando roda com spawn e array de argumentos.
  - Todo caminho é validado contra a raiz do workspace antes de qualquer escrita.
  - Chave de API nunca em .env, nunca no SQLite em claro, nunca no front.
  - Componente nunca chama fetch direto; tudo passa por src/services/.
  - CSS separado do JSX, e nenhuma cor, fonte ou espaçamento fora de token.
  - Rode npm test e npm run build antes de commitar.
```

---

## Referência rápida (não precisa colar, é para você)

### Onde está cada coisa

| Pasta | O que é |
|---|---|
| `shared/` | Contrato compartilhado: schemas Zod, avaliador de regras, motor de template, ordenação determinística |
| `server/` | API local Fastify em `127.0.0.1:7337`. Módulos: presets, projetos, regras, gerador, runner |
| `src/` | Front React + Vite. `services/` é o único ponto que fala com a API |
| `presets/` | Os três menus, em JSON |
| `regras/` | As 16 regras do motor determinístico, uma por arquivo |
| `templates/` | Os cinco templates que o gerador escreve, um por pasta |
| `specs/` | Uma spec por bloco, com a auditoria na seção 7 |
| `docs/` | 00 visão a 11 segurança. `docs/08_DECISOES/` tem oito ADRs |
| `memory/` | Governança. `bugs.md` tem o R-07 |

### O que já funciona de ponta a ponta

Criar projeto a partir de um menu, responder o wizard etapa a etapa com trilha e retomada exata,
o motor de regras avisando junto do campo que causou e bloqueando a etapa Materializar, o plano
de arquivos e comandos com hash e conflitos, e a materialização de verdade: escreve os arquivos,
roda os comandos com log ao vivo, e para pedindo decisão quando um comando obrigatório falha.

### O que falta para fechar a Fase 1

Bloco 8 (telas de fechamento) e bloco 9 (gaveta de ideias). Depois, o critério de aceite da fase.

### Números no momento do handoff

| Item | Valor |
|---|---|
| Commits em `main` | 10 |
| Testes | 435, verdes |
| Blocos entregues | 1 a 7 de 9 |
| ADRs | 8, sendo o ADR-008 ainda Proposto |
