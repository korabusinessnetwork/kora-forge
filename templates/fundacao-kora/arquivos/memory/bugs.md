# Bugs Conhecidos, {{PROJETO}}

## Objetivo
Registrar bugs conhecidos, não resolvidos ou resolvidos com gambiarra, para que não sejam
redescobertos do zero nem "corrigidos" por acidente sem entender o trade-off.

## Contexto
Projeto criado em {{DATA}}, ainda sem código próprio além do esqueleto.

## Regras Gerais
- Entrada tem: id, título, severidade (crítica, alta, média, baixa), como reproduzir, workaround, status.
- Bug com workaround em produção fica aberto até a correção real.
- Bug recorrente que revele lição maior é promovido para `learnings.md`.

## Validações
- Severidade crítica exige registro no mesmo dia e workaround documentado.

## Permissões
- Aberto a qualquer dev ou agente.

## Exceções
- Bug em spike descartável não precisa de registro formal.

## Auditoria
- Data de abertura, autor e status atual.

## Eventos
- `bug.registrado`, `bug.corrigido`, `bug.promovido_para_learning`

## Casos de Uso
- Antes de investigar comportamento estranho, ler aqui primeiro.

## Critérios de Aceite
- [ ] Id, severidade e status
- [ ] Reprodução ou condição de ocorrência
- [ ] Workaround, se houver

---

## Bugs abertos

Nenhum.
