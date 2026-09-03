# Camada de serviços, {{PROJETO}}

Único ponto do front que fala com o backend. Componente nunca chama `fetch` direto: ele recebe
dado e callbacks, e quem busca é a feature, por aqui.

É isso que permite trocar de provedor sem reescrever a UI: a mudança acontece nesta pasta e para
por aqui.

## Regras

1. Toda resposta passa pelo envelope `{ data, error, meta }` e é validada antes de chegar na UI.
2. Erro vira um objeto com código estável mais mensagem legível. Falha nunca é silenciada.
3. Nenhuma chave secreta mora aqui. Só variável pública de ambiente.
4. Um arquivo por domínio (`usuarios.js`, `pedidos.js`), não um arquivo gigante de tudo.
