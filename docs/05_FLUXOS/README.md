# 05, Fluxos

## F-01, Criar projeto novo (fluxo principal)

```
Registry
  └─ "Novo projeto"
       └─ escolhe o menu (Criar Site | Aplicação Web | Aplicação Local | preset seu)
            └─ WIZARD, uma etapa por tela, salvando rascunho a cada passo
                 1 Identidade      nome, essência, problema, valor
                 2 Escopo          público, personas, aha moment, não-objetivos
                 3 Arquitetura     modelo, stack, multi-tenant, deploy
                 4 Design          abre o Studio ou aceita o tema default
                 5 Dados           entidades e relações
                 6 APIs            escolhe modelos, conecta chaves pelo cofre
                 7 Segurança/custo dado sensível, compliance, tier gratuito
                 8 Fundação        revisão do que será gerado, ADRs pendentes
                 9 Materializar    plano de arquivos + comandos
            └─ motor de regras roda a cada mudança, avisos aparecem no campo
       └─ DRY-RUN: lista de arquivos com ação e conflito, lista de comandos
       └─ confirmação explícita
       └─ execução com log ao vivo
       └─ tela final: caminho no disco, o que foi criado, atalho para abrir no editor
```

Bloqueio pendente no motor de regras impede chegar na etapa 9.

### Estado da implementação (Fase 1, bloco 4)

O wizard já conduz as etapas que o preset liga, com trilha, navegação, pular e retomada exata.
As etapas 4 (Design) e 6 (APIs) existem no preset e mostram uma tela de espera que só marca a
etapa como assumida, porque Studio e API Hub chegam nas fases 2 e 3. A etapa 9 mostra o resumo e
diz que o plano e a execução chegam nos blocos 6 e 7.

Regra de versionamento: cada avanço, volta ou salto pela trilha grava uma versão nova do
blueprint **só quando o payload muda**. Navegar sem editar não versiona. Como `etapaAtual` faz
parte do blueprint, mudar de etapa versiona, e é isso que garante a retomada exata.

## F-02, Materialização (detalhe)

```
1. checar requisitos      node, git, e o que o preset exigir. Falta algo, para aqui
2. checar workspace       existe, é gravável, e o slug não colide
3. gerar plano            gerador resolve templates com o blueprint
4. mostrar plano          arquivos (criar/sobrescrever/pular) + comandos + tamanho total
5. aprovar                explícito, botão separado da navegação normal
6. escrever arquivos      ordem fixa: pastas → fundação → config → código
7. rodar comandos         um a um, na ordem, log em stream, botão parar
8. registrar              status materializado, evento projeto.materializado, log salvo
```

Falha em um comando para o fluxo e oferece: repetir, pular ou abortar. Arquivos já
escritos permanecem, e a tela diz exatamente em que ponto parou.

## F-03, Retomar projeto

Abrir do Registry recarrega o blueprint ativo e volta na `etapa_atual`. `/projetos/:id/wizard` sem etapa na URL redireciona para ela, e uma etapa que não existe no preset também. Se o projeto já
foi materializado, o wizard entra em modo revisão: alterações geram um **plano de diff**
contra o que existe no disco, nunca uma sobrescrita cega.

## F-04, Conectar uma API

```
API Hub → escolher modelo (Supabase, Stripe, Anthropic, WhatsApp, ...)
        → dar um alias  ("supabase-pessoal")
        → destrancar o cofre, se estiver trancado
        → colar a chave  (campo mascarado, valor vai direto para o cofre)
        → teste de conexão
             sucesso → status ativa
             falha   → status invalida, com o motivo, sem expor a chave no erro
```

A chave nunca volta para o front. Projeto que usa a conexão recebe `.env.example` com o
**nome** da variável e uma instrução de onde pegar o valor.

## F-05, Studio

```
Etapa Design → Studio abre com os tokens default do preset
             → editar tokens (cor, tipografia, raio, espaçamento), preview ao vivo
             → criar páginas, arrastar regiões e componentes do design system
             → salvar  → vira design_document versionado no blueprint
             → gerador transforma em tokens.css, rotas e esqueleto de JSX
```

Sair sem salvar mantém o default e marca a etapa como assumida.

## F-06, Copiloto (quando ligado)

```
Etapa qualquer → botão "sugerir"
              → monta prompt a partir do blueprint (conteúdo de arquivo vai rotulado como dado)
              → chama a API, com timeout
              → valida a saída pelo schema
                   válida    → mostra como sugestão, com selo de IA, aceitar ou descartar
                   inválida  → uma tentativa de reparo, depois cai no default determinístico
              → registra consumo em copilot_calls
```

Teto de custo atingido desliga o copiloto e avisa. Nenhuma etapa fica esperando.

## F-07, Capturar ideia sem perder o foco

Atalho global abre um campo com título e próximo passo, grava em `ideas` e devolve o
usuário exatamente para onde estava. Não abre projeto, não muda de tela, não pergunta
mais nada (RN-10).

## F-09, Despachar um build pelo harness (Fase 6, ADR-008)

```
Projeto → "Novo build"
        → escolher a spec (ou criar pelo loop /spec)
        → escolher o modelo por papel  (planejar, construir, revisar; default Kora primeiro)
        → o Forge monta o plano: itens da spec, dono exclusivo por arquivo, prompts versionados
        → aprovação explícita do plano
        → runner despacha o `claude` por papel, log em stream, botão parar
        → a cada item concluído: build_itens atualizado, progresso e estimativa recalculados
        → review contra a spec → achados → correções → novo ciclo, até aprovar sem ressalvas
        → ciclo registrado em build_ciclos; achado recorrente vira learning ou regra
```

Nada roda sem o plano aprovado. Falha em um item para o build e mostra exatamente onde parou.

## F-10, Acompanhar tudo no painel de relatórios (Fase 6, ADR-008)

```
Painel → lista de builds em andamento, todos os projetos, ordenados por atualização
       → cada build: barra "x de y", estimativa como faixa, o que falta, bloqueios
       → abrir build: itens do plano com estado, log ao vivo, ciclos de review
       → aba por modelo: plano em execução e ciclo de aprendizado (rodadas, achados, correções)
       → atualização ao vivo pelo WebSocket; sem build rodando, o vazio traz a próxima ação
```

## F-08, Criar preset novo

Duplicar um preset existente, editar o JSON no editor embutido, validar pelo schema,
salvar em `~/.kora-forge/presets/`. Preset inválido não é salvo, e o erro aponta o campo.
