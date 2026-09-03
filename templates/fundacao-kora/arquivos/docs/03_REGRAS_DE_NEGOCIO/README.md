# 03, Regras de Negócio

Regra por módulo, escrita **antes** do código. Uma regra que só existe no código é uma regra que
ninguém consegue revisar.

## Como escrever

Cada módulo ganha uma seção `RN-NN, Nome do módulo` com regras numeradas, afirmativas e
verificáveis. Evite "o sistema deve tratar corretamente": diga o que acontece, e o que acontece
quando dá errado.

## RN-01, {{PROJETO}}

1. Multi-tenant: {{MULTI_TENANT}}. Quando sim, todo dado pertence a um tenant e nenhuma consulta
   atravessa a fronteira do tenant.
2. Autenticação: {{AUTH}}. Quando sim, rota protegida só renderiza depois de checar a sessão.
3. Trata dinheiro: {{DADO_FINANCEIRO}}. Quando sim, todo cálculo de valor vive no servidor, nunca
   no cliente, e usa aritmética inteira em centavos.

Escreva as regras dos módulos reais abaixo, na ordem em que forem construídos.
