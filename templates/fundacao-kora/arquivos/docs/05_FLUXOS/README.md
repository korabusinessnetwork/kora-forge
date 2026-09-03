# 05, Fluxos

Um fluxo por caminho que o usuário percorre de ponta a ponta. Descreva o caminho feliz e, logo
abaixo, o que acontece quando cada passo falha.

## F-01, Primeiro uso

```
entrada → ? → ? → {{AHA_MOMENT}}
```

Preencha os passos reais assim que existirem. Este fluxo é o que define se o produto entrega
valor: ele merece ser desenhado antes de qualquer tela.

## F-02, Autenticação

Aplicável: {{AUTH}}. Quando sim, descreva entrada, sessão, expiração e o que a UI mostra em cada
estado.

## Regras para todo fluxo

1. Todo passo diz o que acontece depois dele.
2. Toda falha tem uma próxima ação, nunca só uma mensagem.
3. Nada destrutivo acontece sem confirmação explícita.
