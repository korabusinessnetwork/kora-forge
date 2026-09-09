# 09, Backlog

Detalhe da Fase 1 em `mvp.md`.

## Regras

- Item entra com: o que é, por que existe, e como se sabe que ficou pronto.
- Item sem fase definida fica em Ideias, não vira backlog.
- Uma fase só começa quando a anterior está utilizável de ponta a ponta. Nada de fase pela metade.

## Fases

| Fase | Entrega | Utilizável quando |
|---|---|---|
| **1** | Registry, preset Aplicação Web, wizard, geração da fundação em disco, runner com dry-run | dá para criar um projeto real e ver o dev server subir |
| **2** | Studio: tokens, páginas, layout, exportação | dá para desenhar e o projeto sai com a cara certa |
| **3** | API Hub, cofre, modelos de integração | dá para conectar Supabase e sair com cliente e `.env.example` prontos |
| **4** | Copiloto Claude opcional | dá para gerar visão, personas e regras a partir das respostas |
| **5** | Presets restantes, editor de presets, tema claro | dá para criar menu novo sem tocar em código |
| **6** | Harness executado pelo Forge e painel de relatórios (ADR-008, proposto) | dá para despachar um build por modelo, acompanhar todos ao mesmo tempo e ver o que falta, a estimativa e o ciclo de aprendizado |

## Achados da prova da Fase 1 (2026-09-08)

Levantados por `npm run verificar:fase1`. Nenhum impediu o critério de aceite, que passou.
Evidência em `fase1-aceite.md`.

| Item | O que é | Estado |
|---|---|---|
| B-01 | A porta do projeto gerado era 5173, a mesma do dev server do Forge | **fechado** na rodada 8: o template nasce na 5273, sem `strictPort`, então porta ocupada escorrega em vez de falhar |
| B-02 | A tela final não mostrava a URL do dev server | **fechado** na rodada 8: o runner captura a URL de loopback que o comando de longa duração anuncia, e a tela final a oferece como link e como texto copiável. Spec em `specs/b01-b02-url-do-dev-server.md` |

## Dívida técnica aberta

| Item | O que é | Por que importa |
|---|---|---|
| TD-01 | A suíte passou de 21 s para 75 s na rodada 10 | a maior parte é legítima, porque o painel de tokens renderiza 41 campos e a etapa Design é testada oito vezes, mas o `npm test` antes de commitar é parte do processo, e 75 s começa a pesar. Junto disso: os testes que rodam processo de verdade falharam uma vez sob disputa de CPU e não reproduziram em quatro execuções seguidas |
| TD-02 | `command_logs` cresce sem limite | desde a rodada 7 cresce também para comando que nunca termina. Podar ou limitar por run ainda não é urgente, porque dev server imprime pouco |

## Fase 2, Studio

Aberta em 2026-09-08. Bloco 1 entregue, spec em `specs/fase2-bloco1-tokens-do-projeto.md`.

| Bloco | Estado |
|---|---|
| 1, tokens do projeto | **entregue**: documento de design versionado, painel com preview ao vivo, e o `tokens.css` gerado a partir dele |
| 2 em diante | não iniciados; o de layout depende do ADR de serialização |

- Canvas com zoom, pan e snap
- ~~Painel de tokens com preview ao vivo~~ (bloco 1)
- Biblioteca de regiões e componentes espelhando o design system do projeto
- Serialização do layout (exige ADR próprio)
- Exportação: `tokens.css`, rotas, esqueleto de JSX
- Plano de diff ao alterar design de projeto já materializado

## Fase 3, API Hub e cofre

- Cofre AES-256-GCM com senha mestre (ADR-006)
- Modelos: Supabase, Anthropic, Stripe, Mercado Pago, WhatsApp Cloud API, Resend
- Teste de conexão por modelo, obrigatório
- Geração de `.env.example` e do cliente na camada de serviços
- Teste que garante que nenhuma rota serializa segredo

## Fase 4, copiloto

- Integração com a API Anthropic, opt-in
- Prompts versionados em `10_PROMPTS`
- Saída validada por schema, com reparo e fallback
- Registro de consumo e teto mensal com desligamento automático
- Delimitação de conteúdo não confiável (controle C8)

## Fase 5, escala do método

- Presets Criar API/Serviço e Criar Automação/Bot
- Editor de presets embutido, com validação de schema
- Tema claro
- Estratégia de migração de blueprint entre versões de preset (exige ADR)
- Reavaliar Tauri e container para o runner

## Fase 6, Harness e painel de relatórios (ADR-008, proposto)

Pedido do dono em 2026-09-02. Entra depois do copiloto porque depende do runner (bloco 7) e do
binário `claude` na whitelist.

- Entidades `builds`, `build_itens`, `build_ciclos` e `modelos` em `schema.sql`, quando o ADR for aceito
- Despacho de build: escolher projeto, spec e modelo por papel; plano aprovado antes de rodar
- Runner executa o `claude` com prompt versionado em `10_PROMPTS`; log em stream como qualquer comando
- Registro de cada ciclo spec → build → review: rodada, achados, correções, o que virou learning
- Painel de relatórios: todos os builds ao mesmo tempo, barra de progresso "x de y", o que falta por
  aplicativo, estimativa de término como faixa com base declarada, plano e ciclo de aprendizado por modelo
- Estimativa determinística: mediana da duração dos itens concluídos vezes itens restantes; sem
  histórico mostra "sem base ainda"
- Atualização ao vivo pelo WebSocket já existente do runner

## Ideias (sem fase)

- Exportar o blueprint como prompt pronto para o Claude Code
- Importar projeto existente e gerar a fundação faltante (trazer para o padrão)
- Dashboard de projetos com o que cada um está esperando
- Gerar changelog automático a partir do log de eventos
- Integrar com `ideias-do-matheus.md` para não ter duas gavetas de ideia
- Modo "só a fundação", que gera docs e memory sem tocar em código

## Dívida aceita desde já

| Item | Por quê | Quando revisitar |
|---|---|---|
| Sem i18n, tudo em português | usuário único | se aparecer segundo usuário |
| Sem multi-tenant | ADR-003 | se virar hospedado |
| Sem container no runner | ADR-002 | se aceitar preset de terceiro |
| Sem tema claro na Fase 1 | escopo | Fase 5 |
