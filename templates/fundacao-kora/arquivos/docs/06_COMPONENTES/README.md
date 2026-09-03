# 06, Componentes

Atomic design. Um componente por arquivo, PascalCase, CSS Module co-localizado.

```
src/
├── components/
│   ├── shared/     atoms e molecules reutilizáveis
│   └── <feature>/  componentes específicos da feature
├── pages/
└── services/       único ponto que fala com o backend
```

## Regras

1. Componente não chama API. Ele recebe dado e callbacks. Quem chama é a feature, pela camada de serviços.
2. Todo componente que carrega dado implementa os quatro estados: carregando, vazio, erro, sucesso.
3. Estado vazio nunca é tela em branco. Sempre traz a próxima ação.
4. Nada de cor, espaçamento, raio ou fonte fora de token.
5. Componente novo só entra depois de existir em `docs/02_DESIGN_SYSTEM`.

## Catálogo

| Componente | Papel |
|---|---|

Preencha conforme os componentes nascerem. Catálogo vazio por muito tempo é sinal de que o design
system não está sendo usado.
