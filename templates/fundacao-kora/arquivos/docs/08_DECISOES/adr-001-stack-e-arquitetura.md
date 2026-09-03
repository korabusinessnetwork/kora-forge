# ADR-001, Stack e modelo de arquitetura

**Status**: Aceito
**Data**: {{DATA}}
**Decisores**: dono do produto
**Supersede**: nenhum

---

## Contexto

{{PROJETO}} nasceu a partir do menu {{PRESET_NOME}} (v{{PRESET_VERSAO}}) do KORA FORGE, que já
carrega o padrão da casa para este tipo de produto. As respostas dadas na criação definiram o
modelo de arquitetura, a stack e as decisões estruturais registradas abaixo.

O problema que o produto resolve: {{PROBLEMA}}

## Decisão

Adotar o **{{MODELO_DESCRICAO}}**, com a stack:

{{STACK}}

| Decisão | Valor |
|---|---|
| Multi-tenant | {{MULTI_TENANT}} |
| White-label | {{WHITE_LABEL}} |
| Autenticação | {{AUTH}} |
| Deploy | {{DEPLOY}} |
| Camada de dados | `{{PASTA_DADOS}}/` |

## Alternativas Consideradas

### 1. Montar a estrutura do zero, sem partir de um padrão

- **Prós**: liberdade total para escolher cada peça
- **Contras**: paga de novo o custo de decidir tudo, e o projeto nasce inconsistente com os outros da casa
- **Descartada porque**: o padrão existe justamente para que esse custo seja pago uma vez só

### 2. Outro modelo de arquitetura

Registre aqui o modelo que foi considerado e descartado, com o motivo. Se nenhum outro foi
avaliado de verdade, diga isso: é uma informação honesta e útil para quem revisar depois.

## Consequências

### Positivas

- O projeto nasce com governança, documentação e plano de segurança, não só com `src/`
- A camada de serviços isola o backend: trocar de provedor mexe em um lugar só
- Quem entrar no projeto reconhece a estrutura sem treinamento

### Negativas e trade-offs

- Herdar um padrão significa herdar também as escolhas dele. Onde este projeto precisar divergir,
  a divergência vira um ADR novo, não uma exceção silenciosa
- Etapas assumidas com o default do menu ({{ETAPAS_ASSUMIDAS}}) não foram decididas de verdade.
  Revise cada uma antes de considerar a fundação fechada

## Referências

- `docs/01_ARQUITETURA/README.md`
- `docs/11_SEGURANCA/README.md`
- `memory/restrictions.md`
