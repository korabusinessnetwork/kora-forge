# Fase 3, bloco 2, teste seguro de conexao

## Escopo

Permitir que a pessoa teste manualmente uma conexao cadastrada no API Hub. O Forge usa a chave apenas
na memoria do processo para uma unica requisicao `GET`; nao mostra, registra ou persiste a chave
novamente. Cada conexao pode definir a URL completa de teste, o nome do cabecalho e um prefixo.
Assim o mesmo fluxo atende APIs gratuitas e pagas sem impor uma lista de provedores.

## Regras de seguranca

- O teste nunca e automatico: so ocorre ao apertar **Testar conexao**.
- Sao aceitas URLs HTTPS e HTTP apenas para `localhost` ou `127.0.0.1`; redirects sao recusados e
  ha timeout de dez segundos.
- A chave vai somente em header. Chave em query string nao e suportada, pois URL pode vazar em
  historico, proxy e logs.
- Corpo e headers da resposta externa nunca entram em resposta, evento ou log do Forge.
- O resultado so informa `sucesso`, `recusada` ou `indisponivel`, e atualiza o status local.

## Criterios de aceite

1. Uma conexao generica pode ter URL de teste, cabecalho e prefixo definidos pela pessoa.
2. O endpoint de teste exige cofre destrancado e nunca devolve a chave.
3. Sucesso, credencial recusada e falha de rede atualizam apenas metadados seguros.
4. Testes provam que a chave nao aparece em retorno nem em evento, e que URL HTTP remota e recusada.
