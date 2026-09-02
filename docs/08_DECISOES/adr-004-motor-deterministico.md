# ADR-004, Motor determinístico com copiloto opcional

**Status**: Aceito
**Data**: 2026-09-02
**Decisores**: Matheus Bonato

---

## Contexto

O pedido original foi que o sistema "funcione como se fosse uma inteligência artificial,
mas sem ser". No intake, a escolha foi: **determinístico com Claude opcional**.

A sensação de inteligência que se quer aqui é a de um sistema que **antecipa**: percebe
que você marcou pagamento e já exige Edge Function, percebe que você usa Supabase e já
exige RLS, percebe que o projeto tem UI e já cobra design system. Isso não precisa de
modelo de linguagem. Precisa de regras boas e de um catálogo bem escrito.

## Decisão

O núcleo é um **motor de regras declarativas**: condição sobre o blueprint mais efeito,
com severidades `info`, `aviso` e `bloqueio`. Nenhuma expressão é avaliada em runtime,
regra é dado.

O **copiloto Claude** é uma camada opcional, desligada por padrão, que só enriquece
texto e sugere. Ele nunca avalia regra, nunca decide arquitetura, nunca executa comando e
nunca escreve arquivo. Toda saída é validada por schema e passa por aceite humano.

Regra de ouro: **com o copiloto desligado, todo fluxo funciona de ponta a ponta.**

## Alternativas Consideradas

### 1. Tudo por LLM (agente que conduz o projeto)
- **Prós**: flexibilidade enorme, conversa natural, menos catálogo para manter
- **Contras**: não reproduz, custa por uso, exige internet, alucina caminho de arquivo e comando, e transforma um gerador em uma aposta
- **Descartado porque**: viola o princípio nº 2. Um gerador de projetos que não reproduz é inútil

### 2. Cem por cento determinístico, sem LLM nenhum
- **Prós**: simplicidade total, custo zero garantido, superfície de ataque menor
- **Contras**: redigir visão, personas e regras de negócio à mão continua sendo trabalho chato, e é justamente onde o LLM ajuda de verdade
- **Descartado porque**: joga fora um ganho barato que não custa determinismo, desde que fique fora do caminho crítico

### 3. LLM local (Ollama)
- **Prós**: offline, sem custo por uso
- **Contras**: exige instalação pesada, qualidade inferior para redação, consumo de RAM que atrapalha o resto do trabalho
- **Descartado porque**: custo de setup alto para ganho pequeno. Reavaliar se o copiloto virar peça central, o que não é o plano

## Consequências

### Positivas
- Reproduz. Mesmo blueprint, mesmo resultado, sempre
- Funciona offline e de graça
- Regra é testável isoladamente, com um blueprint que dispara e um que não dispara
- O catálogo de regras vira ativo acumulável: cada aprendizado de projeto vira regra nova

### Negativas e trade-offs
- Manter o catálogo é trabalho contínuo. Regra desatualizada dá conselho errado com cara de certeza
- Dois caminhos para cada texto (padrão e copiloto) significa mais código e mais teste
- A inteligência percebida fica limitada ao que foi previsto. O sistema nunca vai surpreender positivamente como um LLM surpreenderia

## Notas de Implementação

- Regra sem teste não entra no catálogo
- Saída do copiloto inválida duas vezes cai para o default determinístico, sem travar a tela
- Consumo registrado em `copilot_calls`, com teto mensal que desliga o recurso sozinho
- Conteúdo de arquivo enviado ao copiloto vai rotulado como dado não confiável (controle C8)
