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

Abrir do Registry recarrega o blueprint ativo e volta na `etapa_atual`. Se o projeto já
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

## F-08, Criar preset novo

Duplicar um preset existente, editar o JSON no editor embutido, validar pelo schema,
salvar em `~/.kora-forge/presets/`. Preset inválido não é salvo, e o erro aponta o campo.
