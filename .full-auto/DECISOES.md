# Decisões tomadas no lugar do Matheus

Uma entrada por decisão. Ele revisa no final e pode reverter qualquer uma.

## D01 Loop do projeto no lugar do /ciclo
- **Contexto:** a skill manda executar toda tarefa pela skill `/ciclo`, que não está instalada nesta máquina.
- **Decisão:** cada tarefa roda pelo loop `spec → build → review` que o próprio projeto já adota (`.claude/commands/spec.md`, `build.md`, `review.md`, CLAUDE.md item 5), com a auditoria como seção 7 da spec.
- **Por quê:** é o mesmo ciclo de especificar, construir, revisar e corrigir até aprovar, e é o que a constituição do projeto exige.
- **Como reverter:** instalar o `/ciclo` e retomar com `/full-automatico continuar`.

## D02 Trabalho numa branch, PR no fim
- **Contexto:** o Matheus costuma pedir "manda pra main", mas a skill trata push para a main remota como ação de extrema necessidade.
- **Decisão:** tudo em `full-auto/fase2-studio`, com commits pequenos; no fim, PR para a main. O merge fica com ele, salvo pedido explícito.
- **Por quê:** execução sem supervisão precisa de botão de desfazer.
- **Como reverter:** mesclar o PR.

## D03 Sequencial, sem fan-out
- **Contexto:** a skill permite frentes paralelas.
- **Decisão:** os blocos 5, 6 e 7 rodam em sequência, porque o plano diz que o 6 depende do 5 e o 7 do 6. O OmniRoute (T04) é independente, mas toca `src/mensagens.js`, `server/app.js` e Configurações, arquivos de registro central que o bloco 5 também toca.
- **Por quê:** "dois agentes nunca tocam o mesmo arquivo" (CLAUDE.md, processo de trabalho).
- **Como reverter:** n/a.
