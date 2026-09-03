# 11, Segurança

Segurança é definition of done, não etapa final. Este plano é revisto ao fim de cada fase e sempre
que uma ameaça nova aparecer.

## Perfil de risco deste projeto

| Pergunta | Resposta |
|---|---|
| Trata dado pessoal | {{DADO_PESSOAL}} |
| Trata dinheiro | {{DADO_FINANCEIRO}} |
| Multi-tenant | {{MULTI_TENANT}} |
| Autenticação | {{AUTH}} |
| Exigências de compliance | {{COMPLIANCE}} |

Observações registradas na fundação: {{OBSERVACOES_SEGURANCA}}

## Modelo de ameaças por camada

| Camada | Ameaça principal | Controle obrigatório |
|---|---|---|
| Cliente | Vazamento de segredo, XSS, dado sensível em `localStorage` | Só chave pública no front; nada sensível em `localStorage`; escapar entrada |
| Rede e API | Requisição forjada, dado fora de contrato | Validação por schema na fronteira; envelope `{data,error,meta}`; HTTPS sempre |
| Autorização | Um usuário lê dado de outro | Política de isolamento em toda tabela; teste que prova o isolamento |
| Dados | Query vazando coluna sensível | Nunca `select *` em tabela sensível; campos explícitos |
| Lógica de negócio | Regra sensível burlável no cliente | Dinheiro, permissão e fiscal no servidor, nunca no front |
| Observabilidade | Dado pessoal ou segredo em log | Log sem PII em texto claro; log de atividade fire-and-forget |
| Segredos | Chave commitada | `.env` no `.gitignore`; `.env.example` só com nomes; secret scanning no CI |

## Checklist de release

### Segredos e configuração
- [ ] Nenhuma chave, URL secreta ou senha hardcodada
- [ ] `.env*` no `.gitignore`; `.env.example` versionado só com nomes
- [ ] Chave administrativa jamais exposta ao cliente
- [ ] Secret scanning ativo

### Autenticação e autorização
- [ ] Auth verificada antes de renderizar rota protegida
- [ ] Política de isolamento ativa em todas as tabelas antes de produção
- [ ] Isolamento testado: usuário do tenant A não acessa dado do B

### Entrada e dados
- [ ] Todo input validado antes de qualquer operação no banco
- [ ] Sem `select *` em tabela sensível
- [ ] Toda chamada ao backend tratada com erro explícito
- [ ] Upload validado por tipo e tamanho, servido sem execução

### Logging
- [ ] Nenhum log de senha, token ou dado financeiro
- [ ] Log de atividade nunca bloqueia a operação principal

### Dependências
- [ ] Dependência crítica com versão fixada
- [ ] `npm audit` sem vulnerabilidade crítica aberta

## Resposta a incidentes

1. **Detectar**: registrar em `memory/bugs.md` com severidade.
2. **Conter**: revogar chave vazada, desabilitar rota, isolar o afetado.
3. **Corrigir**: patch mais teste que prova a correção.
4. **Registrar**: post-mortem curto em `memory/learnings.md`; se muda política, abrir ADR.
5. **Prevenir**: o aprendizado vira restrição em `memory/restrictions.md` ou padrão em `memory/patterns.md`.
