# ADR-005, Studio, editor visual próprio

**Status**: Aceito
**Data**: 2026-09-02
**Decisores**: Matheus Bonato

---

## Contexto

O pedido foi ter "um Figma implantado, criado por nós". No intake, a escolha foi
**editor visual próprio**, e não integração com o Figma real.

O problema que o Studio resolve não é desenhar bonito. É que, hoje, o design vive em uma
ferramenta e o código em outra, e a tradução entre os dois é manual, repetitiva e se
perde. O que se quer é um editor **acoplado ao design system do projeto**, cujo output
seja diretamente consumível pelo gerador.

## Decisão

Construir o **Studio**, um editor visual embutido, com escopo deliberadamente estreito:

- Edita os tokens do projeto (`--projeto-*`), com preview ao vivo
- Monta páginas a partir de regiões e componentes que **existem no design system do projeto**
- Não permite elemento livre sem equivalente em componente
- Exporta: `tokens.css`, lista de páginas e rotas, e o esqueleto de layout de cada página
- Layout exportado é estrutura (regiões, componentes, hierarquia), não pixel-perfect

Implementação com DOM absoluto, zoom e pan, sem canvas 2D. Motivo: o que é DOM exporta
para JSX quase um para um, e o preview é o componente real, não um desenho dele.

## Alternativas Consideradas

### 1. Integrar com o Figma real (API ou plugin)
- **Prós**: ferramenta madura, o Matheus já sabe usar, biblioteca infinita
- **Contras**: exige conta e token, depende de internet, o modelo de dados do Figma é livre demais para mapear em componente de forma confiável, e a tradução automática Figma para código é um problema notoriamente mal resolvido
- **Descartado porque**: acopla o produto a um serviço externo justamente na parte que deveria ser local, e resolve o problema errado. O gargalo não é desenhar, é traduzir

### 2. Sem editor, só escolher um tema pronto
- **Prós**: simples, entrega rápido
- **Contras**: todo projeto sai com a mesma cara, e a etapa de Design vira formalidade
- **Descartado porque**: perde a parte visual que dá tração e progresso visível

### 3. Canvas 2D estilo Figma de verdade
- **Prós**: liberdade de desenho, ferramenta mais poderosa
- **Contras**: reconstruir um Figma é projeto de anos, e o output livre volta ao problema da tradução
- **Descartado porque**: é um não-objetivo explícito em `memory/identity.md`

## Consequências

### Positivas
- O que é desenhado é o que existe em código, sem tradução perdida
- Preview usa o componente real, então não existe divergência entre design e implementação
- Tokens do Studio viram o default do tenant no projeto white-label, coerente com o padrão Kora

### Negativas e trade-offs
- Liberdade criativa limitada de propósito. Se o design system não tem, o Studio não desenha. Design fora do padrão continua no Figma, fora do fluxo
- É a peça mais cara do produto, por isso fica na Fase 2 e não na 1
- Manter a paridade entre componentes do Studio e componentes gerados é trabalho contínuo. Componente novo precisa entrar nos dois lugares

## Notas de Implementação

- Preview roda isolado, com tokens `--projeto-*`, sem vazar estilo para a UI do Forge (padrão P-06)
- Serialização do layout ainda precisa de ADR próprio na Fase 2
- Alterar design depois de materializar gera plano de diff, nunca sobrescrita
