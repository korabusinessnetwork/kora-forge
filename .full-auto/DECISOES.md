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

## D04 OmniRoute entra só como endpoint local compatível com OpenAI, restrito a provedores com tier gratuito oficial
- **Contexto:** o Matheus pediu "as APIs do repo OmniRoute pra rodar, como opção grátis de modelos". A pesquisa (github.com/diegosouzapw/OmniRoute, MIT, v3.8.50) mostrou que o OmniRoute mistura três origens: (A) chaves oficiais com tier gratuito, como Gemini API, Groq, Cerebras, OpenRouter `:free` e Mistral; (B) reaproveitamento de login de assinatura por OAuth ou cookie, como Claude Code `cc/`, Claude Web `cw`, Codex, Copilot, Cursor e Kiro, com guia próprio de disfarce de tráfego e detecção de banimento; (C) provedores anônimos por engenharia reversa. A Anthropic proíbe expressamente rotear credencial de plano Free, Pro ou Max por ferramenta de terceiros, e a conta pode ser banida.
- **Decisão:** o Forge ganha um adaptador de provedor compatível com OpenAI que só aceita URL de loopback (`127.0.0.1`, `localhost`, `::1`), com o OmniRoute como alvo documentado, desligado por padrão. O Forge lista os modelos (`GET /v1/models`), mostra o estado e faz uma chamada de teste. A documentação e a tela orientam a usar **só a categoria A**. O Forge não configura, não automatiza e não recomenda nenhum provedor da categoria B ou C.
- **Por quê:** a categoria A é legítima e realmente grátis. A B viola termos de uso e arrisca a conta do próprio Matheus, e isso cai no critério de questão legal. Construir o caminho legítimo não precisa de resposta dele; ele só é consultado se quiser a categoria B.
- **O que não fiz sozinho:** instalar e subir o OmniRoute na máquina. É software de terceiros que embute client IDs OAuth extraídos das CLIs oficiais, escuta em `0.0.0.0` com senha padrão `CHANGEME` segundo a própria documentação, e o pacote 3.8.47 chegou a quebrar no boot. Rodar isso é decisão dele, com o passo a passo seguro em P02. Os testes do adaptador usam um servidor falso compatível com OpenAI.
- **Segredo:** sem cofre ainda (Fase 3), o Forge não guarda chave nenhuma do OmniRoute. O caminho documentado é OmniRoute em `127.0.0.1` sem exigir chave, que só é aceitável porque não sai da máquina. A chave do OmniRoute passa a ser suportada quando o cofre existir.
- **Como reverter:** remover o módulo `provedores` e a seção em Configurações; o ADR fica como registro.

## D05 Autorização para instalar, e o que continua com o Matheus
- **Contexto:** durante o bloco 5 o Matheus escreveu "pode instalar tudo ta autorizado".
- **Decisão:** a autorização revoga a parte "não instala sozinho" da D04. Na T04 eu instalo o OmniRoute nesta máquina, configurado para `HOST=127.0.0.1` e com segredos gerados aleatoriamente num arquivo de ambiente fora do repositório. Continuam com o Matheus: definir a senha do dashboard que ele vai usar, criar contas e colar chaves de provedores, porque isso é credencial pessoal. A regra da categoria B (contas de assinatura) segue valendo, porque viola termos de serviço e a autorização não muda isso.
- **Alternativas consideradas:** continuar sem instalar (ignoraria a autorização); conectar provedores eu mesmo (exige credencial dele).
- **Como reverter:** `npm uninstall -g omniroute` e apagar a pasta de dados dele.

## D06 Repriorização: modelos gratuitos e Auto-Reforja antes do resto da Fase 2
- **Contexto:** no meio do bloco 6 o Matheus pediu, com prioridade, (1) conectar ao sistema as APIs gratuitas de melhor eficiência e (2) uma página de Auto-Reforja, onde o Forge melhora a própria forja, tudo em paralelo.
- **Decisão:** a T04 vira a T08, maior. A Auto-Reforja é a T09. As duas rodam em worktrees próprias ao mesmo tempo. O bloco 6 foi salvo em checkpoint (b79055b, suíte verde) e continua com o maestro durante a onda, porque mexe só em `gerador/` e `templates/`, que nenhuma frente toca. Os blocos 7 e o fechamento vêm depois.
- **Por quê:** é o pedido explícito, e as três trilhas não dividem arquivo.
- **Como reverter:** reordenar TAREFAS.md.

## D07 Chave de provedor fica no gateway local, não no Forge
- **Contexto:** Gemini, Groq, Cerebras, OpenRouter e Mistral exigem chave. A constituição proíbe chave em `.env`, no SQLite em claro e no front, e o cofre (ADR-006) é da Fase 3.
- **Decisão:** nesta rodada o Forge fala com **um** gateway compatível com OpenAI em loopback, o OmniRoute, e as chaves dos provedores ficam no próprio OmniRoute, cadastradas pelo Matheus no dashboard dele. O Forge não recebe, não guarda e não transmite chave de provedor. Conexão direta a cada provedor, com chave no cofre, entra quando o cofre existir.
- **Alternativas consideradas:** construir o cofre agora (antecipa a Fase 3 inteira e atrasa o pedido principal); chave em `.env` (proibido).
- **Por quê:** entrega o acesso gratuito já, sem abrir exceção de segurança.
- **Como reverter:** implementar o cofre e um adaptador direto por provedor atrás do mesmo contrato `completar()`.

## D08 Contratos da onda paralela
- **Arquivos compartilhados, só o maestro:** `server/app.js`, `src/App.jsx`, `src/mensagens.js`, `src/components/layout/LayoutApp.jsx`, `src/features/config/PaginaConfig.jsx`, `docs/04_MODELAGEM/schema.sql`, `server/db/migrations/`, `package.json`, lockfile, `docs/08_DECISOES/README.md`, `.full-auto/`. O andaime (stubs, rota `/reforja`, link no menu, migração `reforge_items`) foi commitado antes do fan-out.
- **Textos:** cada frente tem arquivo próprio de mensagens (`src/mensagens/modelos.js`, `src/mensagens/reforja.js`), espalhado em `mensagens.modelos` e `mensagens.reforja`. Assim ninguém edita o mesmo arquivo, e toda string continua centralizada sob `mensagens`.
- **Frente modelos (T08), dona de:** `server/modules/modelos/`, `server/modules/eficiencia/`, `shared/eficiencia/`, `shared/schemas/modelos.js`, `shared/schemas/eficiencia.js`, `src/features/config/SecaoModelosGratuitos.*`, `src/features/eficiencia/`, `src/services/modelos.js`, `src/services/eficiencia.js`, `src/mensagens/modelos.js`, `docs/08_DECISOES/adr-013-*`. Configuração guardada em chaves próprias `modelos.*` na tabela `settings`, sem migração.
- **Frente reforja (T09), dona de:** `server/modules/reforja/`, `shared/schemas/reforja.js`, `shared/reforja/`, `templates-reforja/`, `src/features/reforja/`, `src/services/reforja.js`, `src/mensagens/reforja.js`, `docs/08_DECISOES/adr-014-*`, `docs/05_FLUXOS/` só num arquivo novo dela.
- **Assinaturas:** `criarServicoModelos({ db, registrarEvento, eficiencia, fetch? })` e `criarServicoReforja({ db, registrarEvento, modelos, raizForge? })`. Rotas: plugin default `(app, { modelos })` e `(app, { reforja })`, todas com `schemaSaida`.
- **Contrato que a T09 consome e a T08 cumpre:** `modelos.estado()` devolve `{ ligado: boolean, conectado: boolean, modelos: string[] }` sem lançar; `modelos.completar({ intencao, mensagens: [{ papel: 'sistema'|'usuario', texto }], maxTokens? })` devolve `{ texto, modelo, duracaoMs }` ou lança `ErroForge` com `FORGE_MODELOS_DESLIGADO` ou `FORGE_MODELOS_INDISPONIVEL`. A T09 testa com um `modelos` falso.
