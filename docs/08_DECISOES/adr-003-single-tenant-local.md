# ADR-003, Single-tenant local, multi-tenant no output

**Status**: Aceito
**Data**: 2026-09-02
**Decisores**: Matheus Bonato

---

## Contexto

O padrão Kora determina multi-tenant e white-label desde a linha 1, sem exceção. É um
princípio inegociável da skill `fundacao-de-projeto`, e existe porque adaptar um sistema
single-tenant depois costuma custar mais que reescrever.

O KORA FORGE, porém, é uma ferramenta local que roda na máquina de uma pessoa, sem conta,
sem nuvem e sem servidor compartilhado. Não existe segundo tenant para isolar. Aplicar
`tenant_id` e RLS aqui seria cerimônia sem função.

## Decisão

O Forge é **single-tenant e single-user**, sem `tenant_id` e sem camada de isolamento
entre clientes.

Em contrapartida, e isso é a metade que importa: **todo projeto gerado pelo Forge nasce
multi-tenant e white-label por padrão**. A regra `arq-multitenant-obrigatorio` é bloqueio
no preset de aplicação web, `seg-rls-obrigatorio` é bloqueio quando há Supabase, e nenhum
template pode conter marca, cor, nome ou regra de cliente hardcodada.

O princípio Kora não é abandonado, ele é deslocado do produto para o output.

## Alternativas Consideradas

### 1. Aplicar multi-tenant no Forge mesmo assim
- **Prós**: coerência literal com o padrão, migração futura para SaaS mais barata
- **Contras**: `tenant_id` em todas as tabelas sem um segundo tenant existir, complexidade sem benefício, viola o princípio de não construir para um futuro hipotético
- **Descartado porque**: cerimônia não é governança

### 2. Modelar com `workspace_id` como meio-termo
- **Prós**: prepara para múltiplos perfis na mesma máquina
- **Contras**: mesmo problema, com outro nome
- **Descartado porque**: não há caso de uso real. Se aparecer, entra por migração

## Consequências

### Positivas
- Schema simples e legível, sem coluna sem propósito
- Sem custo de RLS local em um banco de um usuário só
- O princípio se preserva onde tem efeito real, no projeto gerado

### Negativas e trade-offs
- Se o Forge um dia virar hospedado, será preciso adicionar `tenant_id` em todas as tabelas, autenticação real e isolamento. O custo dessa migração está aceito
- Este ADR é a exceção documentada ao padrão. Qualquer agente que ler `CLAUDE.md` e estranhar a ausência de multi-tenant deve ser remetido a este arquivo
- Se o produto virar hospedado, este ADR será supersedido, não editado

## Referências

- `CLAUDE.md`, seção Fonte de verdade
- `memory/identity.md`, não-objetivos
- `docs/03_REGRAS_DE_NEGOCIO/motor-de-regras.md`, regra `arq-multitenant-obrigatorio`
