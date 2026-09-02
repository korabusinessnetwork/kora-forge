# ADR-006, Cofre local de segredos

**Status**: Aceito
**Data**: 2026-09-02
**Decisores**: Matheus Bonato

---

## Contexto

O Forge guarda chaves de API reais: Supabase, Anthropic, gateways de pagamento. É o ativo
mais sensível do produto. Chave vazada não é bug de usabilidade, é prejuízo direto.

Guardar em `.env` na pasta do projeto é o caminho fácil, e é como quase todo mundo faz.
Também é como chave vaza em commit.

## Decisão

Implementar um **cofre local criptografado**:

- AES-256-GCM, chave derivada da senha mestre por scrypt, nonce único por entrada
- Arquivo em `~/.kora-forge/vault.bin`, separado do banco
- Cofre nasce trancado a cada boot, destranca uma vez por sessão
- **O segredo nunca volta para o front.** A UI vê alias e status, jamais o valor
- Segredo nunca entra em blueprint, evento, log ou telemetria
- Projeto gerado recebe `.env.example` com nomes e instruções, jamais valores
- Redação obrigatória: valor do cofre vira `***` antes de qualquer log, inclusive stdout de comando

O cofre é opcional. Sem ele, o Forge funciona normalmente, apenas a etapa de APIs fica
indisponível.

## Alternativas Consideradas

### 1. `.env` em texto puro
- **Prós**: trivial, familiar
- **Contras**: qualquer processo lê, qualquer `git add .` distraído commita
- **Descartado porque**: é exatamente o problema que se quer resolver

### 2. Keychain do sistema (`keytar` ou API nativa do Windows)
- **Prós**: integração com o gerenciador de credenciais do SO, sem senha mestre
- **Contras**: dependência com binário nativo, comportamento diferente por sistema, mais uma fonte de falha de build no Windows
- **Descartado porque**: `node:crypto` resolve sem dependência nova (restrição T-03). Reavaliar se a senha mestre virar atrito real

### 3. Não guardar chave nenhuma, pedir sempre que precisar
- **Prós**: risco mínimo
- **Contras**: atrito alto e repetitivo, contra o princípio nº 1
- **Descartado porque**: mata a proposta do API Hub

## Consequências

### Positivas
- Chave em repouso fica cifrada, com custo de implementação baixo e sem dependência nova
- A separação entre `api_connections` (sem segredo) e `vault_entries` (segredo cifrado) torna difícil vazar por acidente, porque a rota que responde ao front nunca toca a segunda tabela
- Cofre opcional mantém o produto usável para quem não quiser lidar com isso

### Negativas e trade-offs
- Senha mestre esquecida significa segredo perdido. Não há recuperação, e isso é intencional. A UI avisa no momento de criar
- Uma senha por sessão é atrito, aceito
- Segredo fica em memória do processo enquanto o cofre está destrancado. Mitigação: não guardar em variável global, buscar sob demanda, limpar após uso

## Notas de Implementação

- scrypt com parâmetros documentados no código, versionados junto do formato do arquivo
- Formato do `vault.bin` carrega versão, para permitir migração de algoritmo depois
- Teste obrigatório: garantir que nenhuma rota da API local serializa `vault_entries`
