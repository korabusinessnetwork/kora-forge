# Diretrizes de Desenvolvimento, {{PROJETO}}

> Constituição do projeto. Toda mudança relevante consulta este arquivo e `memory/` antes.
> Gerado pelo KORA FORGE em {{DATA}}, a partir do menu {{PRESET_NOME}} (v{{PRESET_VERSAO}}).

## Princípio nº 1, INTUITIVIDADE

O produto existe para tirar carga mental, não para adicionar. Se uma etapa exige que o usuário
lembre de algo que o sistema já sabe, a etapa está errada.

- Nenhuma pergunta sem default visível.
- Estados sempre visíveis: carregando, vazio, erro e sucesso com feedback humano.
- Prevenção de erro acima de mensagem de erro.
- Consistência total com o design system (`docs/02_DESIGN_SYSTEM/`).

## Fonte de verdade (leia antes de qualquer mudança relevante)

- **`memory/`**: identidade, decisões, padrões, aprendizados, restrições e bugs. Consulta obrigatória antes de decisão de produto ou arquitetura.
- **`docs/`**: regras de negócio (`03`), design system (`02`), modelagem (`04`), fluxos (`05`), contratos (`07`), ADRs (`08`) e o plano de segurança (`11`).
- **ADR-001** define a stack vigente. Toda decisão de arquitetura vira ADR em `docs/08_DECISOES/`.
- Se doc e código conflitarem, a documentação prevalece e deve ser corrigida quando estiver errada.

## Processo de trabalho

1. Planejar tudo antes de executar. Escopo fechado por fase, sem retrabalho.
2. Feature nova entra pelo loop `spec → build → review`, nunca direto no código.
3. Sintetizar e validar no fim: revisar cada entrega, rodar testes e build.

## Custo

Fase bootstrap. Tudo em tier gratuito: {{TIER_GRATUITO}}. Qualquer implementação que exija
investimento é adiada por padrão, salvo decisão explícita do dono. Ao esbarrar em algo pago,
apresentar custo aproximado, alternativa gratuita, impacto e recomendação.
Detalhes em `memory/restrictions.md`.

## Segurança (obrigatório em todo código novo)

- **Nunca** hardcodar chave, secret ou token. Só `import.meta.env.VITE_*` no front, e chave pública apenas.
- **Sempre** validar input na fronteira, antes de qualquer operação no banco.
- **Nunca** logar senha, token ou dado financeiro.
- Rota protegida só renderiza depois de checar autenticação.
- Trata dado pessoal: {{DADO_PESSOAL}}. Trata dinheiro: {{DADO_FINANCEIRO}}.
- Plano completo em `docs/11_SEGURANCA/README.md`.

## Padrões de código

- Um componente por arquivo, PascalCase. CSS separado do JSX, com tokens em CSS vars.
- SQL em `snake_case`, JS/TS em `camelCase`, migrations `YYYYMMDD_descricao.sql`.
- Todo acesso a dado passa pela camada de serviços (`src/services/`). Componente nunca chama `fetch` direto.
- Envelope de resposta sempre `{ data, error, meta }`, validado antes de chegar na UI.
- Erro com código estável em string mais mensagem legível. Falha nunca silenciada.
- Eventos de domínio em `dot.case`, no passado.
- Rodar `npm test` e `npm run build` antes de commitar. Função pura nasce com teste.

## Stack

{{STACK}}

Multi-tenant: {{MULTI_TENANT}}. White-label: {{WHITE_LABEL}}. Autenticação: {{AUTH}}.
Deploy: {{DEPLOY}}. Detalhamento em `docs/01_ARQUITETURA/`. Justificativa em **ADR-001**.
