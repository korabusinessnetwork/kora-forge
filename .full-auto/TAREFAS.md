# Tarefas

Legenda: `[ ]` pendente · `[~]` em andamento · `[x]` concluída e verificada · `[!]` bloqueada (com diagnóstico)

Formato: `- [ ] ID título | trilha: <nome> | depende: <IDs ou nenhum> | pronto quando: <critério>`

Cada tarefa roda pelo loop `spec → build → review` do projeto (`.claude/commands/`), com a auditoria
critério a critério como seção 7 da spec, e fecha com `npm test` e `npm run build` verdes.

## Fase 2 do Studio
- [~] T01 Bloco 5, etapa Design no wizard | trilha: wizard | depende: nenhum | pronto quando: a etapa design deixa de ser EtapaFutura, leva ao Studio e diz o que acontece depois; pular com o padrão Kora gera exatamente o mesmo plano de hoje, provado por teste de regressão; review sem ressalvas
- [ ] T02 Bloco 6, exportação do design para o gerador | trilha: gerador | depende: T01 | pronto quando: tokens.css sai com os valores do Studio, cada página vira rota e arquivo de esqueleto por template versionado, mesmo documento gera o mesmo plano; review sem ressalvas
- [ ] T03 Bloco 7, diff de design em projeto materializado | trilha: diff | depende: T02 | pronto quando: redesenhar projeto materializado gera plano de diff com VisualizadorDiff, e nada é escrito sem aprovação; review sem ressalvas

## Copiloto, opção gratuita
- [ ] T04 OmniRoute como provedor gratuito opcional de modelos | trilha: copiloto | depende: nenhum | pronto quando: ADR registrado, provedor configurável em Configurações apontando para o OmniRoute local, desligado por padrão, com teste; nenhum fluxo essencial depende dele

## Fechamento
- [ ] T05 Critério de aceite da Fase 2 | trilha: base | depende: T01, T02, T03 | pronto quando: scripts/verificar-fase2.mjs prova os itens do critério e o produto rodando materializa um projeto desenhado no Studio
- [ ] T06 Documentação e ledger | trilha: base | depende: T01 a T05 | pronto quando: fase2.md, specs/_loop.md, README e memory/ refletem o estado real
- [ ] T07 Relatório final e PR para a main | trilha: base | depende: todas | pronto quando: RELATORIO-FINAL.md escrito, PR aberto
