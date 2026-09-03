# Padrões, {{PROJETO}}

## Objetivo
Registrar o "como fazemos aqui": padrões consolidados de código, arquitetura, UX e processo.

## Contexto
Padrão implícito é padrão que cada pessoa interpreta de um jeito. Escrever custa dez minutos e
economiza semanas de inconsistência.

## Regras Gerais
- Padrão entra quando a mesma solução se repete 3 vezes, ou quando é herdado do padrão Kora.
- Status possíveis: ativo, `[EXPERIMENTAL]`, `[DEPRECADO]`.

## Validações
- Padrão de segurança exige revisão explícita do dono.
- Padrão de UI exige print ou descrição de tela.

## Permissões
- Qualquer dev propõe. O dono aprova padrão que afeta arquitetura.

## Exceções
- Em protótipo descartável, padrão pode ser quebrado com a tag `[SPIKE]` e prazo.

## Auditoria
- Autor, data e origem (herdado do padrão Kora × nascido aqui).

## Eventos
- `pattern.adicionado`, `pattern.deprecado`, `pattern.revisado`

## Configurações Futuras
- Linter customizado que valida nomenclatura e camada de serviços.

## Casos de Uso
- Code review, criação de módulo novo.

## Critérios de Aceite
- [ ] Nome, contexto, exemplo e justificativa
- [ ] Origem registrada
- [ ] Status definido

---

## Padrões herdados do padrão Kora (valem sem discussão)

| Padrão | Regra |
|---|---|
| Nomenclatura | SQL `snake_case`, JS/TS `camelCase`, componentes `PascalCase`, migrations `YYYYMMDD_descricao.sql` |
| Camada de serviços | Único ponto que fala com o backend. Componente nunca chama `fetch` direto |
| Envelope | Toda resposta é `{ data, error, meta }`, validada antes de chegar na UI |
| Erros | Código estável em string mais mensagem legível. Falha nunca silenciada |
| Eventos | `dot.case`, substantivo mais verbo no passado |
| CSS | Separado do JSX, tokens em CSS vars, para permitir theming |
| Organização | Por feature, não por tipo técnico. Compartilhado em `shared/` |
| Multi-tenant | {{MULTI_TENANT}}. Quando sim, `tenant_id` em toda tabela mais RLS |
| Segurança | Parte do definition of done, não etapa final |

## Padrões nascidos aqui

Registre o primeiro assim que ele aparecer. Padrão que existe na cabeça de alguém não é padrão.
