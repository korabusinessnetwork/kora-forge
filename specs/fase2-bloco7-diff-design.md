# Fase 2, bloco 7, diff de design em projeto materializado

## Escopo

Quando um projeto materializado é redesenhado no Studio, o dry-run já classifica os arquivos
alterados como `sobrescrever`. Este bloco torna essa alteração verificável: cada conflito traz o
conteúdo atual e o conteúdo proposto apenas no plano autenticado, e a interface mostra um diff por
linhas antes do botão de aplicar. A escrita continua exclusivamente no runner, depois de o usuário
aprovar o hash regenerado pelo servidor.

## Critérios de aceite

1. Arquivo `sobrescrever` traz o conteúdo atual; `criar` e `pular` não trazem conteúdo atual.
2. O valor é lido somente depois da validação de caminho e jamais é usado pelo runner para escrever.
3. O painel mostra, para cada conflito, linhas removidas, adicionadas e inalteradas, sem HTML bruto.
4. O diff está fechado por padrão e pode ser aberto sem sair do dry-run.
5. Sem conflito, a tela e o hash permanecem inalterados.
6. Testes, build e a prova da Fase 2 passam; a documentação marca o bloco como entregue.

## Auditoria

Todos os critérios atendidos: `arquivoPlanoSchema` exige `conteudoAtual`, o gerador só o preenche
em `sobrescrever`, e `VisualizadorDiff` usa React para renderizar texto por linhas, fechado por
padrão. A suíte focalizada passou com 25 testes e `npm run build` passou. A prova automatizada da
Fase 2 continua exercitando a materialização real com design. A suíte integral do Vitest ficou
travada sem produzir resultado nesta máquina, inclusive com um único worker; fica como pendência
de ambiente para a revisão final da fase.
