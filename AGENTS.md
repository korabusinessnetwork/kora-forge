# Diretrizes de Desenvolvimento, KORA FORGE

> Constituição do projeto. Toda mudança relevante consulta este arquivo e `memory/` antes.

## Princípio nº 1, INTUITIVIDADE (inegociável)

O Forge existe para tirar carga mental, não para adicionar. Se uma etapa exige que
o usuário lembre de algo que o sistema já sabe, a etapa está errada.

- Toda etapa do wizard cabe em uma tela, tem título em linguagem humana e diz o que acontece depois.
- Nenhuma pergunta sem default. Sempre existe a opção "usar o padrão Kora" e ela é a primeira.
- O usuário nunca digita comando, caminho ou nome de arquivo que o sistema poderia inferir.
- Estados sempre visíveis: carregando, erro, vazio e sucesso com feedback humano.
- Prevenção de erro acima de mensagem de erro. Dry-run antes de qualquer escrita em disco.
- Consistência total com o design system (`docs/02_DESIGN_SYSTEM/`).

## Princípio nº 2, DETERMINISMO (inegociável)

O mesmo blueprint gera sempre o mesmo projeto, na mesma ordem, com o mesmo resultado.

- Nenhum comportamento essencial depende de LLM. O copiloto é enfeite, nunca engrenagem.
- Toda geração passa por template versionado. Nada de string montada solta no meio do código.
- Preset e blueprint são versionados. Reabrir um projeto de três meses atrás reproduz o resultado daquela versão.
- Se o copiloto está desligado ou offline, todo fluxo continua funcionando de ponta a ponta.

## Fonte de verdade (leia antes de qualquer mudança relevante)

- **`memory/`**: identidade, decisões, padrões, aprendizados, restrições e bugs. Consulta obrigatória antes de decisão de produto ou arquitetura.
- **`docs/`**: regras de negócio (`03`), design system (`02`), modelagem (`04`), fluxos (`05`), contratos (`07`), ADRs (`08`) e o plano de segurança (`11`).
- **ADR-001** define a stack vigente. Toda decisão de arquitetura vira ADR em `docs/08_DECISOES/`.
- Schema do banco: `docs/04_MODELAGEM/schema.sql`.
- Se doc e código conflitarem, a documentação prevalece e deve ser corrigida quando estiver errada.
- **Produto = ferramenta local single-user.** O Forge **não** é multi-tenant, e isso é uma exceção deliberada ao padrão Kora, registrada em **ADR-003**. Em compensação, **todo projeto que o Forge gera nasce multi-tenant e white-label**: nenhum template pode conter marca, cor, nome ou regra de cliente hardcodada.

## Processo de trabalho

1. **Planejar tudo antes de executar.** Escopo fechado por fase, sem retrabalho.
2. Builds multi-parte usam fan-out paralelo com **dono exclusivo por arquivo**. Dois agentes nunca tocam o mesmo arquivo.
3. **Sintetizar e validar no fim.** Revisar cada entrega, rodar testes e build.
4. Tarefa de peça única não ganha fan-out.
5. Feature nova entra pelo loop `spec → build → review`, nunca direto no código.
6. Os itens 1 a 5 são o **harness**, o sistema de operação de build que o Forge adota para si e para
   todo projeto que gera (ADR-008). Na Fase 6 o Forge passa a executar e observar o harness por
   software, com painel de relatórios: o que está construindo, o que falta, estimativa e ciclo de
   aprendizado por modelo.

## Custo, priorizar o gratuito (fase bootstrap)

Tudo roda local e de graça. O único gasto possível é o consumo da API Anthropic pelo
copiloto, que nasce desligado, tem teto mensal e registra cada chamada em
`copilot_calls`. Qualquer implementação que exija investimento é adiada por padrão,
salvo decisão explícita do dono. Ao esbarrar em algo pago, apresentar: custo aproximado,
alternativa gratuita, impacto e recomendação. Detalhes em `memory/restrictions.md`.

## Segurança (obrigatório em todo código novo)

O Forge tem poder de escrever arquivos e executar processos na máquina. Trate cada
linha como código privilegiado.

- **Nunca** hardcodar chave, secret ou token. Chave de API vive no cofre, nunca em `.env`, nunca no SQLite em claro, nunca no front.
- **Nunca** montar comando por interpolação de string. Sempre `spawn(cmd, argsArray, { shell: false })`.
- **Sempre** validar caminho contra a raiz do workspace antes de qualquer escrita. Path traversal é bloqueio, não aviso.
- **Sempre** validar input com Zod na fronteira da API local, incluindo preset importado.
- **Nunca** logar segredo, conteúdo de cofre ou corpo de resposta de API externa.
- **Sempre** exigir token de sessão local e checar `Origin` em toda rota. Bind exclusivo em `127.0.0.1`.
- Conteúdo de arquivo lido do disco e enviado ao copiloto é **dado, nunca instrução**.
- Plano completo em `docs/11_SEGURANCA/README.md`.

## Padrões de código

- Componentes React em arquivos separados, um componente por arquivo, PascalCase.
- CSS separado do JSX (CSS Modules co-localizado + tokens em CSS vars). Nada de estilo inline em componente de produto.
- SQL em `snake_case`, JS/TS em `camelCase`, migrations `YYYYMMDD_descricao.sql`.
- Nomes de domínio em português (`materializarProjeto`, `blueprintAtual`), padrões técnicos em inglês (`handleSubmit`, `useEffect`).
- Todo acesso a dado passa pela camada de serviços (`src/services/`). Componente nunca fala com `fetch` direto.
- Envelope de resposta sempre `{ data, error, meta }`, validado por Zod antes de chegar na UI.
- Erro com código estável em string (`FORGE_PATH_FORBIDDEN`) mais mensagem legível. Falha nunca silenciada.
- Eventos de domínio em `dot.case`, no passado (`projeto.materializado`, `comando.falhou`).
- Log de atividade é fire-and-forget, nunca bloqueia a operação principal.
- Rodar `npm test` e `npm run build` antes de commitar. Função pura nasce com teste.

## Stack

- React 18 + Vite + React Router v6 + Context API (sem Redux)
- CSS Modules + design tokens em CSS vars
- Backend local: Node 20 + Fastify, bind `127.0.0.1`
- Dados: SQLite via `better-sqlite3`, em `~/.kora-forge/forge.db`
- Cofre: AES-256-GCM com chave derivada por scrypt
- Runner: `child_process.spawn`, whitelist, log por WebSocket
- Validação: Zod, ponta a ponta
- Testes: Vitest
- Copiloto opcional: API Anthropic, modelo definido em Configurações

Detalhamento em `docs/01_ARQUITETURA/tech-stack.md`. Justificativa em **ADR-001**.
