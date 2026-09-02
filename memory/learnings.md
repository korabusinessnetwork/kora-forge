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
