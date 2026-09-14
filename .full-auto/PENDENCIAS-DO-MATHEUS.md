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

## P02 Subir o OmniRoute com configuração segura [prioridade: média]
- **Por quê:** o Forge já sabe falar com ele (T04), mas não instala nem sobe software de terceiros sozinho (D04).
- **Contorno atual:** Configurações mostra o OmniRoute como "não encontrado em 127.0.0.1:20128", e nada do Forge depende dele.
- **Passo a passo:**
  1. Node 24 já está instalado nesta máquina, e atende o requisito dele.
  2. `npm install -g omniroute` (confira que o pacote é `omniroute`, do autor `diegosouzapw`; há forks com nome parecido).
  3. Antes de subir, defina `HOST=127.0.0.1`, uma `INITIAL_PASSWORD` sua no lugar de `CHANGEME`, e gere `JWT_SECRET` e `API_KEY_SECRET`.
  4. `omniroute` e abra o dashboard em `http://127.0.0.1:20128`.
  5. Adicione **só provedores com chave oficial de tier gratuito**: Gemini API (Google AI Studio), Groq, Cerebras, OpenRouter com modelos `:free`, Mistral. **Não** conecte Claude Code, Claude Web, Codex, ChatGPT Web, Copilot, Cursor, Kiro nem Antigravity: isso viola os termos desses serviços e pode banir a sua conta.
- **Onde colar o resultado:** nada. As chaves dos provedores ficam no OmniRoute, não no Forge.
- **Como confirmar que funcionou:** Configurações do Forge, seção Modelos gratuitos, mostra "conectado" e a lista de modelos; o botão Testar devolve resposta.
