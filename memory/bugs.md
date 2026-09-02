# Bugs Conhecidos, KORA FORGE

## Objetivo
Registrar bugs conhecidos, não resolvidos ou resolvidos com gambiarra, para que não
sejam redescobertos do zero nem "corrigidos" por acidente sem entender o trade-off.

## Contexto
Projeto na Fase 0, sem código, portanto sem bug. Este arquivo nasce estruturado para ser
usado a partir da Fase 1, e já registra os riscos técnicos previstos, que viram bug
assim que aparecerem.

## Regras Gerais
- Entrada tem: id, título, severidade (crítica, alta, média, baixa), como reproduzir, workaround, status.
- Bug com workaround em produção fica aberto até a correção real, nunca é fechado por gambiarra.
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

## Configurações Futuras
- Sincronizar com issues do GitHub quando o repositório existir.

## Casos de Uso
- Antes de investigar comportamento estranho, ler aqui primeiro.

## Critérios de Aceite
- [ ] Id, severidade e status
- [ ] Reprodução ou condição de ocorrência
- [ ] Workaround, se houver

---

## Bugs abertos

Nenhum. Projeto ainda sem código.

## Riscos técnicos previstos (viram bug quando ocorrerem)

| Id | Risco | Severidade prevista | Mitigação já planejada |
|---|---|---|---|
| R-01 | Caminho do Windows com espaço ou acento quebrando o runner | alta | argumentos sempre em array, testes com `C:\Users\Meu Usuário\` |
| R-02 | `better-sqlite3` exigindo build nativo e falhando no Windows | alta | fixar versão com binário pré-compilado, documentar fallback em `INSTALACAO.md` |
| R-03 | Comando de dev server não termina, travando o runner | média | processo de longa duração roda destacado, com log em stream e botão de parar |
| R-04 | Preset antigo incompatível com motor novo | média | preset versionado, migração explícita, recusa com mensagem clara em vez de erro silencioso |
| R-05 | Cofre trancado no meio do fluxo, quebrando a etapa de APIs | média | etapa detecta cofre trancado antes de começar e pede a senha uma vez só |
| R-06 | Copiloto devolvendo JSON inválido | baixa | saída validada por schema, uma tentativa de reparo, depois fallback determinístico |
