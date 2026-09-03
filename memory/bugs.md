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

## Bugs e riscos registrados

### R-07, `npm install` do projeto gerado falha com npm 10.9.7

**Severidade**: alta. **Status**: aberto, com workaround. **Registrado em**: 2026-09-03.

`npm install` falha com `Cannot read properties of null (reading 'edgesOut')` em qualquer
`package.json` que dependa de `vitest@4.1.11`. Repro mínimo, sem nada do Forge:

```json
{ "name": "t", "version": "1.0.0", "devDependencies": { "vitest": "4.1.11" } }
```

Atinge o **próprio Forge** do mesmo jeito: um `npm install` do zero, sem lockfile, falha. O
repositório só instala porque o `package-lock.json` está versionado, e `npm ci` funciona.

O projeto gerado ainda não tem lockfile, então herda o problema no primeiro `npm install`, que é
justamente o comando que o runner (bloco 7) vai executar.

**Workaround**: `npm install --legacy-peer-deps`. Com ele o projeto gerado instala, `npm run build`
passa e `npm run dev` responde 200, verificado em 2026-09-03.

**Causa provável**: bug do resolvedor do npm 10.9.7 com os doze peers opcionais que o vitest 4
declara. Não é defeito do template: o `package.json` gerado é válido e a mesma falha atinge o
Forge.

**O que fazer no bloco 7**: decidir se o runner detecta a falha e tenta o fallback, ou se o preset
passa a declarar a flag. Nenhuma das duas foi decidida, e a decisão é do dono, porque
`--legacy-peer-deps` afrouxa a resolução de peers em todo projeto gerado.
