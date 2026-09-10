# DESIGN.md, contrato de design do projeto

> Arquivo de **teste** do spike do ADR-011. A marca "Vetro" é fictícia e existe para verificar a
> regra white-label: se este nome aparecer hardcodado no HTML gerado, fora dos tokens, o motor
> reprovou o teste.
>
> No Forge real, este arquivo é gerado por template versionado a partir do `design_documents` do
> projeto. Ninguém digita isto à mão.

---

## 1. Identidade

**Vetro** é uma vidraçaria de projetos sob medida. Vende precisão e acabamento, não preço.
O site é uma landing page de captação: quem chega precisa entender o que é feito, ver que é bem
feito, e pedir orçamento.

## 2. Público e tom de voz

Arquitetos, construtoras pequenas e donos de casa em reforma. Gente que já sabe o que quer e está
comparando fornecedor.

Tom **direto e técnico, sem adjetivo de folheto**. Frase curta. Nunca "soluções inovadoras", nunca
"excelência". Diz o que faz, com que material, em quanto tempo.

## 3. Cores

| Token | Valor | Uso |
|---|---|---|
| `--cor-fundo` | `#0f1113` | fundo da página |
| `--cor-superficie` | `#181b1f` | cartões e blocos |
| `--cor-borda` | `#2a2f36` | divisórias |
| `--cor-texto` | `#e8ecf1` | texto principal |
| `--cor-texto-suave` | `#9aa4b2` | texto secundário |
| `--cor-primaria` | `#4da3c7` | ação principal, links |
| `--cor-primaria-forte` | `#3b87a8` | hover da ação |
| `--cor-sucesso` | `#4caf7d` | confirmação |
| `--cor-erro` | `#d9534f` | erro |

Toda cor usada vem desta tabela. **Nenhum valor hexadecimal fora daqui pode aparecer no resultado.**

## 4. Tipografia

| Token | Valor |
|---|---|
| `--fonte-titulo` | `"Inter", system-ui, sans-serif` |
| `--fonte-corpo` | `"Inter", system-ui, sans-serif` |
| `--fonte-mono` | `"JetBrains Mono", ui-monospace, monospace` |
| `--texto-xs` | `0.75rem` |
| `--texto-sm` | `0.875rem` |
| `--texto-md` | `1rem` |
| `--texto-lg` | `1.25rem` |
| `--texto-xl` | `1.75rem` |
| `--texto-2xl` | `2.5rem` |

Peso de título 600, nunca 700. Altura de linha 1.5 no corpo, 1.2 em título.

## 5. Espaçamento e raio

| Token | Valor |
|---|---|
| `--espaco-1` | `4px` |
| `--espaco-2` | `8px` |
| `--espaco-3` | `12px` |
| `--espaco-4` | `16px` |
| `--espaco-6` | `24px` |
| `--espaco-8` | `32px` |
| `--espaco-12` | `48px` |
| `--espaco-16` | `64px` |
| `--raio-sm` | `4px` |
| `--raio-md` | `8px` |
| `--raio-lg` | `16px` |

Espaçamento só sai desta escala. Nada de `13px` ou `2.5rem` solto.

## 6. Componentes disponíveis

Catálogo fechado. **Não invente componente fora desta lista.**

- `cabecalho`, logo à esquerda, navegação à direita, uma ação
- `heroi`, título, subtítulo, uma ação primária, uma imagem
- `pilha`, empilha filhos em coluna ou linha, com espaço da escala
- `grade`, de duas a quatro colunas, responsiva
- `cartao`, título, texto, imagem opcional
- `lista-de-itens`, ícone, título e texto por item
- `depoimento`, citação, nome, papel
- `formulario-contato`, nome, e-mail, telefone, mensagem, botão
- `rodape`, links, contato, aviso legal
- `botao`, variantes primário, secundário e discreto

## 7. Páginas e rotas

Uma única rota, `/`, nesta ordem:

1. `cabecalho`
2. `heroi`, título "Vidro sob medida, com prazo que se cumpre"
3. `grade` de três `cartao`, os serviços: box, guarda-corpo, fachada
4. `lista-de-itens`, quatro itens, o processo do orçamento à instalação
5. `depoimento`, dois
6. `formulario-contato`
7. `rodape`

## 8. O que não fazer

- **Nenhuma marca, cor, nome ou texto de cliente hardcodado fora dos tokens e deste documento.** O
  resultado precisa poder trocar de marca mudando só os tokens.
- Nada de biblioteca de CSS externa. Nada de CDN. CSS próprio, usando as variáveis acima.
- Nada de estilo inline no marcador.
- Nenhum script de rastreamento, analytics ou fonte remota que chame terceiro.
- Nenhuma imagem de banco de imagens com marca d'água. Espaço reservado é aceitável.
- Nenhum texto de preenchimento em latim. Se faltar conteúdo, escreva algo plausível em português.
- Sem carrossel, sem modal de entrada, sem animação de rolagem.

## 9. Restrições técnicas

- HTML e CSS estáticos, sem framework, sem etapa de build.
- Tokens declarados em `:root`, um bloco só, no topo do CSS.
- Responsivo de 360px a 1440px. Nada de rolagem horizontal.
- Acessível: contraste mínimo 4.5:1 no texto, marcação semântica, foco visível.
- Meta tags e Open Graph preenchidos a partir da seção 1.
- Alvo de Lighthouse acima de 90 em performance.
