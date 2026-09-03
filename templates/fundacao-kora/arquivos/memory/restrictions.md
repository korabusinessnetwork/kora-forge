# Restrições, {{PROJETO}}

## Objetivo
Registrar os limites inegociáveis (técnicos, de custo, de segurança e de escopo) que qualquer
decisão de produto ou arquitetura deve respeitar sem exceção silenciosa.

## Contexto
Restrição não escrita é restrição que alguém atravessa sem perceber, em geral na sexta à noite.

## Regras Gerais
- Toda restrição tem categoria: `custo`, `segurança`, `técnica`, `escopo`, `legal`.
- Restrição de custo registra valor aproximado, alternativa gratuita e recomendação de timing.
- Restrição não expira sozinha. Só sai daqui por decisão explícita do dono.

## Validações
- Restrição de segurança exige descrição do ataque que ela previne.
- Restrição de custo exige ao menos uma alternativa gratuita avaliada, mesmo que descartada.

## Permissões
- Qualquer dev propõe. Apenas o dono remove ou flexibiliza.

## Exceções
- Em ambiente de teste isolado, restrição técnica pode ser suspensa com tag `[SUSPENSA-DEV]` e prazo. Restrição de segurança nunca é suspensa.

## Auditoria
- Autor, data e categoria obrigatórios.

## Eventos
- `restricao.adicionada`, `restricao.removida`

## Configurações Futuras
- Alertar quando um PR tocar arquivo coberto por restrição de segurança ativa.

## Casos de Uso
- Antes de adicionar dependência nova, integração paga, ou qualquer código que toque dado sensível.

## Critérios de Aceite
- [ ] Categoria definida
- [ ] Se custo: valor e alternativa gratuita
- [ ] Se segurança: ataque prevenido descrito

---

## Custo

| # | Restrição | Categoria |
|---|---|---|
| C-01 | Tudo em tier gratuito: {{TIER_GRATUITO}}. Serviço pago entra só por decisão explícita do dono, com custo, alternativa gratuita e recomendação apresentados antes. | custo |

## Segurança

| # | Restrição | Ataque prevenido |
|---|---|---|
| S-01 | Chave secreta nunca vai para o front nem para o repositório. Só chave pública em `VITE_*`, e `.env` no `.gitignore`. | Vazamento de credencial |
| S-02 | Todo input do usuário é validado na fronteira antes de tocar o banco. | Injeção e dado fora de contrato |
| S-03 | Rota protegida só renderiza depois de checar autenticação. | Vazamento por render antecipado |

## Legal

| # | Restrição | Categoria |
|---|---|---|
| L-01 | Trata dado pessoal: {{DADO_PESSOAL}}. Trata dinheiro: {{DADO_FINANCEIRO}}. Exigências de compliance: {{COMPLIANCE}}. | legal |
