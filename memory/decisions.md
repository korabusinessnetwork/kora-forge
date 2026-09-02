# Decisões, KORA FORGE

## Objetivo
Registrar decisões de produto e de processo que outros precisam conhecer mas que não
carregam trade-off arquitetural profundo o bastante para virar ADR, e manter o índice
dos ADRs existentes.

## Contexto
Decisão não registrada é decisão que volta a ser discutida daqui a três semanas, em
geral com resultado diferente. Este arquivo é o registro leve. O pesado vive em
`docs/08_DECISOES/`.

## Regras Gerais
- Se a decisão tem alternativa relevante descartada e consequência de longo prazo, ela é ADR, não entrada aqui.
- Toda entrada leva data, decisão em uma frase e motivo em uma frase.
- Decisão revogada não é apagada, é marcada `[REVOGADA]` com a data e o motivo.

## Validações
- A entrada diz o que foi decidido e por quê, sem depender de contexto de conversa.

## Permissões
- Qualquer agente ou dev registra. Apenas o dono revoga.

## Exceções
- Decisão tomada sob urgência entra com a tag `[PROVISÓRIA]` e prazo de revisão.

## Auditoria
- Data e autor obrigatórios. Revisão ao fim de cada fase.

## Eventos
- `decisao.registrada`, `decisao.revogada`, `decisao.promovida_para_adr`

## Configurações Futuras
- Gerar changelog automático a partir dos eventos.

## Casos de Uso
- Onboarding, retomada de projeto após pausa, revisão de escopo.

## Critérios de Aceite
- [ ] Data presente
- [ ] Decisão em uma frase
- [ ] Motivo em uma frase

---

## Índice de ADRs

| ADR | Título | Status |
|---|---|---|
| [ADR-001](../docs/08_DECISOES/adr-001-stack-e-arquitetura.md) | Stack e modelo de arquitetura | Aceito |
| [ADR-002](../docs/08_DECISOES/adr-002-runner-de-comandos.md) | Runner de comandos com whitelist e dry-run | Aceito |
| [ADR-003](../docs/08_DECISOES/adr-003-single-tenant-local.md) | Single-tenant local, multi-tenant no output | Aceito |
| [ADR-004](../docs/08_DECISOES/adr-004-motor-deterministico.md) | Motor determinístico com copiloto opcional | Aceito |
| [ADR-005](../docs/08_DECISOES/adr-005-studio-editor-proprio.md) | Studio, editor visual próprio | Aceito |
| [ADR-006](../docs/08_DECISOES/adr-006-cofre-de-segredos.md) | Cofre local de segredos | Aceito |
| [ADR-007](../docs/08_DECISOES/adr-007-presets-declarativos.md) | Presets declarativos versionados | Aceito |

## Decisões leves

### 2026-09-02, nome do produto
KORA FORGE, com slug `kora-forge`. Motivo: segue o padrão de nomeação das ventures da
Kora e "forja" descreve a função (matéria-prima entra, peça pronta sai). Nome é
provisório até a Fase 1 fechar.

### 2026-09-02, os menus da Fase 1
Três presets nascem: Criar Site, Criar Aplicação Web e Criar Aplicação Local. Criar
API/Serviço e Criar Automação ficam no backlog. Motivo: foram os três citados no
intake, e três cobrem os casos reais atuais sem inflar a Fase 1.

### 2026-09-02, o Forge não se auto-gera
A fundação do próprio Forge foi escrita à mão. Motivo: escrever a fundação manualmente
uma última vez é o que revela quais partes são realmente automatizáveis. Depois da
Fase 1, todo projeto novo nasce pelo Forge, incluindo evoluções dele mesmo.

### 2026-09-02, português na UI
Interface inteiramente em português, sem i18n na Fase 1. Motivo: usuário único.
Extrair strings para arquivo de mensagens mesmo assim, para não pagar refatoração
depois.

### 2026-09-02, dependências do bloco 1 além do tech-stack
`concurrently` (um só `npm run forge` sobe API e front, como o ADR-001 pede), `@fastify/static`
(servir `dist/` na própria origem quando existir build), `jsdom`, `@testing-library/dom` e
`@testing-library/jest-dom` (exigidos pela Testing Library que o tech-stack já lista). Motivo:
todas pequenas, sem binário nativo, cobertas pela restrição T-03.

### 2026-09-02, versão mínima do Node
Node 20.19 ou superior, porque o Vite 8 exige. Motivo: manter o Vite atual vale mais que
suportar 20.x antigo em uma ferramenta de uso pessoal. `INSTALACAO.md` atualizado.

### 2026-09-02, token de sessão por fragmento de URL
O token vai em `#token=`, não em query string. Motivo: fragmento não chega ao servidor, logo
não entra em log de acesso nem em histórico de proxy. Registrado em `docs/07` e `docs/11` (C2).
