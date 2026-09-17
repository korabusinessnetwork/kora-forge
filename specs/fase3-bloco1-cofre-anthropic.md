# Fase 3, bloco 1, cofre local e conexão Anthropic

## Escopo

Implementar o primeiro caminho real de chave de API no Forge. A pessoa cria ou destranca um cofre
local com senha mestre, informa um alias, provedor, tipo e chave em campo mascarado, e a chave vai
diretamente para `~/.kora-forge/vault.bin`. SQLite guarda apenas `api_connections`: alias,
provedor e status. Nenhuma rota, evento, log ou resposta serializa a chave.

O arquivo do cofre usa formato JSON versionado, salt aleatório de 16 bytes, chave de 32 bytes
derivada por `scrypt` (`N=16384`, `r=8`, `p=1`) e AES-256-GCM com nonce aleatório por entrada.
Ele nasce trancado a cada boot. Escritas são atômicas (arquivo temporário na mesma pasta e rename).

O API Hub não diferencia provedor pago ou gratuito: isso é escolha da pessoa e não muda o modelo de
segurança. Anthropic é apenas um exemplo de conexão, não um enum nem uma dependência do cofre.

## Fora de escopo

- Fazer chamada de rede para testar a conexão ou habilitar o copiloto (bloco 2/Fase 4).
- Outros modelos de API, associação de conexão a projeto e geração de cliente/.env.example.
- Recuperação de senha mestre: senha esquecida perde o cofre de propósito.

## Critérios de aceite

1. Criar cofre exige senha mestre com confirmação; destrancar senha errada responde erro sem dizer
   se o arquivo ou a senha falhou.
2. Criar conexão aceita alias, provedor, tipo, endpoint opcional e chave somente com cofre
   destrancado; a resposta contém apenas metadados, nunca a chave ou material criptográfico.
3. Reiniciar o serviço deixa o cofre trancado; destrancar preserva as entradas cifradas.
4. `vault.bin` contém somente dados cifrados; nem a chave nem o alias aparecem em claro nele.
5. Falhas de rota, eventos e logs não incluem a chave recebida.
6. A UI explica a senha mestre, usa campo mascarado e confirma sucesso sem revelar a chave.
7. Testes exercitam cifra, senha errada, persistência, contrato de saída e ausência de segredo;
   build e testes afetados passam.

## Arquivos previstos

- `server/modules/cofre/`: serviço de cifra, rotas e testes.
- `server/modules/conexoes/`: metadados de conexão, rotas e testes.
- `shared/schemas/cofre.js` e `shared/schemas/conexoes.js`.
- `src/features/apis/` e `src/services/conexoes.js`.
- `src/App.jsx`, mensagens, documentação e decisão de persistência.

## Auditoria

Implementado e revisado: `vault.bin` usa AES-256-GCM, scrypt e nonce por entrada; metadados ficam
em `api_connections` e a tabela legada `vault_entries` foi removida por migration. As rotas
protegidas só retornam metadados. `server/modules/cofre/cofre.test.js` prova cifra, reinício
trancado, senha errada e ausência de segredo em resposta, evento e arquivo; 9 testes focados e o
build passaram.
