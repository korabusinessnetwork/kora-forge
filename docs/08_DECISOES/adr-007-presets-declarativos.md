# ADR-007, Presets declarativos versionados

**Status**: Aceito
**Data**: 2026-09-02
**Decisores**: Matheus Bonato

---

## Contexto

Os menus (Criar Site, Criar Aplicação Web, Criar Aplicação Local) são o coração da
experiência, e são também a parte que mais vai mudar. Todo projeto novo ensina algo que
deveria virar preset melhor. Se mudar um menu exigir alterar código do Forge, a evolução
para, porque o atrito é alto demais para uma melhoria pequena.

## Decisão

**Preset é dado, nunca código.** Um preset é um JSON validado por schema estrito, que
declara: etapas ativas, defaults, árvore de templates, regras extras, skills, MCPs,
comandos, requisitos e definition of done.

Presets builtin são versionados no repositório. Presets custom vivem em
`~/.kora-forge/presets/`. Ambos passam pelo mesmo schema e pelos mesmos limites de
whitelist de comando.

Cada preset tem versão, e o blueprint grava qual versão usou. Isso é o que permite
reabrir um projeto antigo e reproduzir o resultado daquela época.

O mesmo princípio vale para as regras do motor (**ADR-004**) e para os templates de
arquivo: tudo é dado com placeholder, nunca expressão avaliada em runtime.

## Alternativas Consideradas

### 1. Preset como módulo JavaScript
- **Prós**: flexibilidade total, lógica condicional livre, mais expressivo
- **Contras**: preset importado vira execução de código arbitrário, e o schema deixa de poder validar qualquer coisa
- **Descartado porque**: transforma cada preset em vetor de ataque (ameaça T6 do plano de segurança)

### 2. Preset codificado direto no Forge
- **Prós**: mais simples de escrever no começo
- **Contras**: menu novo vira release, e o usuário não consegue criar o dele
- **Descartado porque**: a customização de presets é uma das razões do produto existir

### 3. YAML em vez de JSON
- **Prós**: mais legível para editar à mão
- **Contras**: mais uma dependência de parser, e mais superfície para ambiguidade
- **Descartado porque**: o editor embutido resolve a legibilidade, e JSON valida melhor

## Consequências

### Positivas
- Criar menu novo é criar arquivo, sem tocar no código nem fazer release
- Preset importado é seguro por construção, porque não pode executar nada
- Versão no preset mais versão no template garantem reprodutibilidade

### Negativas e trade-offs
- Lógica condicional complexa não cabe em JSON. Quando um preset precisar disso, a resposta é criar uma regra no motor, não abrir exceção no schema. Essa pressão vai aparecer, e a resposta é sempre a mesma
- O schema do preset vira contrato público. Mudar de forma incompatível exige migração explícita, e isso já está listado como ADR futuro
- Preset antigo com motor novo precisa de estratégia de migração. Por enquanto, recusa com mensagem clara é melhor que comportamento silencioso e errado

## Referências

- `docs/03_REGRAS_DE_NEGOCIO/presets.md`, contrato completo
- `memory/patterns.md`, padrão P-01
- `docs/11_SEGURANCA/README.md`, controle C7
