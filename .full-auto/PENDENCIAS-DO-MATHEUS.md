# Pendências do Matheus

Coisas que só você pode fazer. O app já funciona com contornos (mocks, local), estas tarefas trocam o contorno pelo real.
Ordem: da mais importante para a menos importante.

## P01 Instalar a skill /ciclo [prioridade: baixa]
- **Por quê:** o Full Automático prefere rodar cada tarefa por ela.
- **Contorno atual:** loop spec → build → review do próprio projeto (D01).
- **Passo a passo:**
  1. Instalar a skill `/ciclo` em `~/.claude/skills/`, sem `disable-model-invocation: true`.
- **Onde colar o resultado:** n/a
- **Como confirmar que funcionou:** `/ciclo` aparece na lista de skills.

## P02 Cadastrar provedores gratuitos no OmniRoute [prioridade: alta]
- **Por quê:** o OmniRoute já está instalado e o Forge já fala com ele, mas nenhum modelo responde enquanto não houver provedor cadastrado. Chave de provedor é credencial sua (D05 e D07).
- **Contorno atual:** a seção Modelos gratuitos em Configurações mostra o gateway conectado e avisa quando nenhum modelo da cadeia responde. Nada essencial do Forge depende disso.
- **Passo a passo:**
  1. Suba o gateway:  na pasta do Forge. Ele sobe só em 127.0.0.1:20128, com segredos gerados na primeira vez.
  2. Abra http://127.0.0.1:20128. A senha inicial está em , na linha INITIAL_PASSWORD. Troque a senha no primeiro acesso.
  3. Crie as chaves gratuitas: Google AI Studio (Gemini API), console.groq.com (Groq), cloud.cerebras.ai (Cerebras), openrouter.ai (use só modelos com :free) e console.mistral.ai (Mistral, plano Experiment).
  4. Cadastre cada chave em Providers no dashboard do OmniRoute.
  5. **Não** conecte Claude Code, Claude Web, Codex, ChatGPT Web, Copilot, Cursor, Kiro nem Antigravity: viola os termos desses serviços e pode banir a sua conta.
- **Onde colar o resultado:** só no dashboard do OmniRoute. O Forge nunca recebe essas chaves.
- **Como confirmar que funcionou:** em Configurações do Forge, ligue Modelos gratuitos e aperte Testar. A resposta vem com o nome do modelo que respondeu.

