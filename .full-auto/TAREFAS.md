# Tarefas

Legenda: `[ ]` pendente · `[~]` em andamento · `[x]` concluída e verificada · `[!]` bloqueada (com diagnóstico)

Formato: `- [ ] ID título | trilha: <nome> | depende: <IDs ou nenhum> | pronto quando: <critério>`

Cada tarefa roda pelo loop `spec → build → review` do projeto (`.claude/commands/`), com a auditoria
critério a critério como seção 7 da spec, e fecha com `npm test` e `npm run build` verdes.

## Prioridade 1 e 2, pedido de 2026-09-14 (D06)
Onda paralela: T08 e T09 em worktrees próprias, T02 continua com o maestro. Contratos na D08.

- [~] T08 Modelos gratuitos de melhor eficiência conectados ao Forge | trilha: modelos | depende: nenhum | pronto quando: ADR-013 registrado; módulo `modelos` fala com gateway compatível com OpenAI só em loopback (OmniRoute como alvo), desligado por padrão; catálogo versionado dos modelos gratuitos com ranking de eficiência e cadeia de fallback determinística; seção Modelos gratuitos em Configurações com estado, lista de modelos e botão Testar; chamadas registradas em copilot_calls com custo zero e visíveis no painel de Eficiência; contrato `estado()` e `completar()` da D08 cumprido; testes contra servidor falso; review sem ressalvas
- [x] T08b OmniRoute instalado e rodando em 127.0.0.1 | trilha: maestro | depende: nenhum | pronto quando: `omniroute` instalado, sobe só em 127.0.0.1 com segredos aleatórios fora do repositório, `/v1/models` responde localmente, e o passo a passo das chaves de provedor está em P02
- [~] T09 Página Auto-Reforja, o Forge melhorando a própria forja | trilha: reforja | depende: nenhum | pronto quando: ADR-014 registrado; rota /reforja com diagnóstico determinístico só de leitura do repositório do Forge, backlog de melhorias com o ciclo proposta → especificada → em construção → em revisão → concluída, gerar spec por template versionado com prévia antes de escrever em specs/, e sugestão opcional por modelo gratuito que nunca é engrenagem; testes; review sem ressalvas
- [ ] T10 Integração das frentes e validação no produto rodando | trilha: maestro | depende: T08, T09, T08b | pronto quando: merges feitos um por vez com suíte verde, a Auto-Reforja usa `modelos.completar` quando ligado, produto rodando mostra as duas telas funcionando e, com o OmniRoute no ar, o Testar responde

## Fase 2 do Studio
- [x] T01 Bloco 5, etapa Design no wizard | trilha: wizard | depende: nenhum | pronto quando: a etapa design deixa de ser EtapaFutura, leva ao Studio e diz o que acontece depois; pular com o padrão Kora gera exatamente o mesmo plano de hoje, provado por teste de regressão; review sem ressalvas
- [~] T02 Bloco 6, exportação do design para o gerador | trilha: gerador | depende: T01 | pronto quando: tokens.css sai com os valores do Studio, cada página vira rota e arquivo de esqueleto por template versionado, mesmo documento gera o mesmo plano; review sem ressalvas
- [ ] T03 Bloco 7, diff de design em projeto materializado | trilha: diff | depende: T02 | pronto quando: redesenhar projeto materializado gera plano de diff com VisualizadorDiff, e nada é escrito sem aprovação; review sem ressalvas

## Copiloto, opção gratuita
- T04 absorvida pela T08 (D06). Mantida aqui só como registro, sem checkbox.

## Fechamento
- [ ] T05 Critério de aceite da Fase 2 | trilha: base | depende: T01, T02, T03 | pronto quando: scripts/verificar-fase2.mjs prova os itens do critério e o produto rodando materializa um projeto desenhado no Studio
- [ ] T06 Documentação e ledger | trilha: base | depende: T01 a T10 | pronto quando: fase2.md, specs/_loop.md, README, índice de ADRs e memory/ refletem o estado real
- [ ] T07 Relatório final e PR para a main | trilha: base | depende: todas | pronto quando: RELATORIO-FINAL.md escrito, PR aberto
