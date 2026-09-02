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

## Fase 2, Studio

- Canvas com zoom, pan e snap
- Painel de tokens com preview ao vivo
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
