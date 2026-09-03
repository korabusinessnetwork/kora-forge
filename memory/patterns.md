# Padrões, KORA FORGE

## Objetivo
Registrar o "como fazemos aqui": padrões consolidados de código, arquitetura, UX e
processo que valem para todo o Forge e para os templates que ele gera.

## Contexto
Um gerador de projetos multiplica seus próprios padrões. Um padrão ruim aqui vira
padrão ruim em dez projetos. Por isso o critério de entrada é mais rígido que o normal.

## Regras Gerais
- Padrão entra quando a mesma solução se repete 3 vezes ou quando é herdada do padrão Kora já consolidado.
- Padrão que afeta template gerado exige exemplo concreto do output.
- Status possíveis: ativo, `[EXPERIMENTAL]`, `[DEPRECADO]`.

## Validações
- Padrão de segurança e padrão de geração de código exigem validação pesada (revisão explícita do dono).
- Padrão de UI exige print ou descrição de tela.

## Permissões
- Qualquer dev propõe. O dono aprova padrão que afeta output gerado.

## Exceções
- Em protótipo descartável, padrão pode ser quebrado com a tag `[SPIKE]` e prazo.

## Auditoria
- Autor, data e origem (herdado do padrão Kora × nascido aqui).

## Eventos
- `pattern.adicionado`, `pattern.deprecado`, `pattern.revisado`

## Configurações Futuras
- Linter customizado que valida os padrões de nomenclatura e de camada de serviços.

## Casos de Uso
- Code review, criação de template novo, revisão de preset.

## Critérios de Aceite
- [ ] Nome, contexto, exemplo e justificativa
- [ ] Origem registrada
- [ ] Status definido

---

## Padrões herdados do padrão Kora (valem sem discussão)

| Padrão | Regra |
|---|---|
| Nomenclatura | SQL `snake_case`, JS/TS `camelCase`, componentes `PascalCase`, migrations `YYYYMMDD_descricao.sql` |
| Camada de serviços | Único ponto que fala com backend ou disco. Componente nunca chama `fetch` direto |
| Envelope | Toda resposta é `{ data, error, meta }`, validada por Zod antes de chegar na UI |
| Erros | Código estável em string mais mensagem legível. Falha nunca silenciada |
| Eventos | `dot.case`, substantivo mais verbo no passado |
| CSS | Separado do JSX, tokens em CSS vars, para permitir theming |
| Organização | Por feature, não por tipo técnico. Compartilhado em `shared/` |
| Multi-tenant | Obrigatório em todo projeto gerado. `tenant_id` em toda tabela mais RLS |
| Segurança | Parte do definition of done, não etapa final |

## Padrões nascidos no Forge

### P-01, Preset é dado, nunca código
Todo preset é um JSON validado por schema. Adicionar um menu novo não pode exigir
alterar código do Forge. Se exigiu, o schema do preset está incompleto.
Exemplo: `presets/criar-site.json`. Justificativa: presets mudam muito mais rápido
que o motor. Ver **ADR-007**.

### P-02, Nada escreve em disco sem dry-run
Toda operação que cria, altera ou apaga arquivo produz antes um plano legível
(caminho, ação, tamanho, conflito) que o usuário aprova. O executor recebe o plano
aprovado, nunca a intenção original. Ver **ADR-002**.

### P-03, Geração por template versionado
Arquivo gerado sai de template com placeholders, nunca de string montada em código.
Todo template tem versão, e o blueprint grava qual versão usou. Isso é o que torna a
geração reproduzível.

### P-04, O copiloto nunca está no caminho crítico
Chamada ao LLM é sempre: opcional, assíncrona, com timeout, com fallback determinístico
e com saída validada por schema. Se falhar, a etapa segue com o texto padrão e um aviso
discreto. Nenhuma tela fica bloqueada esperando IA.

### P-05, Conteúdo do disco é dado, não instrução
Texto lido de arquivo, de preset importado ou de resposta de API externa nunca é tratado
como comando. Ao enviar para o copiloto, vai delimitado e rotulado como conteúdo não
confiável. Ver `docs/11_SEGURANCA/README.md`.

### P-06, Dois design systems, nunca misturados
O design system do **Forge** (a UI da ferramenta) e o design system do **projeto**
(editado no Studio) vivem em namespaces separados: `--forge-*` e `--projeto-*`.
Componente do Forge nunca lê token do projeto e vice-versa. Ver `docs/02_DESIGN_SYSTEM/`.

### P-07, Toda ação relevante emite evento
Ação que muda estado do projeto emite evento `dot.case` gravado em `events`. O log de
eventos é o que permite reconstruir o histórico de um projeto e, no futuro, gerar
changelog automático.

### P-08, Regra de negócio mora no motor de regras, não na tela
Validação e recomendação vivem em regras declarativas com condição e efeito, testáveis
isoladamente. A tela apenas renderiza o resultado. Contrato real, operadores e contexto em
`docs/03_REGRAS_DE_NEGOCIO/motor-de-regras.md`; os arquivos em `regras/`.

Duas consequências que valem para toda regra nova:

- A condição descreve **o problema**, não o assunto. Assim a regra para de disparar quando o
  problema some, e o hit se resolve sozinho, sem o usuário precisar clicar em nada.
- Regra cujo efeito o gerador aplica sozinho é `resolucao: automatica` e nasce resolvida. Regra
  que exige decisão humana nasce aberta. Sem essa separação, um bloqueio que ninguém pode
  resolver travaria a materialização para sempre.
