# As seis alavancas, na ordem em que compensam

Duas famílias. As **gratuitas** baixam o que se paga sem mexer na qualidade: entram primeiro e
ficam ligadas. As **de troca** trocam capacidade por custo: entram por último, uma de cada vez,
medidas no painel. Números esperados vêm das medições publicadas pela Anthropic para o
Fable 5, Opus 5 e Sonnet 5; trate como ordem de grandeza, não como promessa.

## Gratuitas

### 1. Cache de prompt (primeira, e fica ligada)

O que se repete entre chamadas (prompt de sistema, preset, blueprint) vai antes do que muda
(a pergunta da etapa), com `cache_control` no último bloco estável. Leitura custa 10% da
entrada. Em loop agentico, a conta cai por um fator de 2,5 a 3,7 com 81% a 90% de acerto no cache.

- **TTL de 1 h** quando as chamadas esperam humano entre si (o wizard espera). Escreve a 2x em vez de 1,25x e se paga na primeira falha evitada.
- **Confirme** com `usage.cache_read_input_tokens` maior que zero a partir da segunda chamada. Zero seguido significa invalidador silencioso: data no prompt, JSON sem ordem estável, lista de ferramentas que varia.
- **Quebra**: qualquer byte diferente no prefixo. Nada volátil acima do ponto de cache.

### 2. Higiene de entrada

Mande o trecho do blueprint que a etapa usa, não o blueprint inteiro; nunca o dump de um
arquivo do projeto. O copiloto recebe dado rotulado como não confiável (S-07), o que também
mantém o prefixo curto. Conte tokens com `count_tokens` antes de aceitar entrada sem limite.

### 3. Higiene de saída

Saída em JSON puro validada por schema (`output_config.format`), `max_tokens` do perfil como
teto, sem preâmbulo. Saída é o medidor mais caro (5x a entrada): cada frase de cortesia custa
cinco vezes o que custaria na entrada. Tudo isso já é regra em `docs/10_PROMPTS/README.md`.

### 4. Batch API

50% em todos os medidores, cache incluso, para o que ninguém está esperando. No Forge só
serve a trabalho de fundo (por exemplo, reprocessar identidades de vários projetos de uma vez).
O wizard espera resposta; não bate.

## De troca

### 5. Esforço (`output_config.effort`)

Regula profundidade de raciocínio e quantidade de chamadas de ferramenta sem trocar modelo.
Curvas medidas:

| Tipo de trabalho | Curva | Leitura para o Forge |
|---|---|---|
| Redação e pesquisa | quase plana: `low` perde 1 a 3 pontos por metade do custo; `medium` empata com o padrão a 70% a 85% do custo | etapas de texto em `low` ou `medium` |
| Código de longo horizonte | real: `medium` perde 2 pontos por metade; `low` perde 8 por um quarto | não se aplica ao copiloto |
| Revisão profunda multi-tópico | cada degrau compra ~2,4 pontos | `blueprint-revisar` em aplicação: por isso Opus `low`, não Sonnet `max` |

Regra prática publicada: **rodar tudo em `low` e refazer só as falhas no padrão** dá a mesma
taxa de acerto por metade do custo, quando existe um checador. O Forge tem: validação de
schema. É exatamente a política de escalada dos perfis.

Não mude esforço no meio de uma conversa (invalida o cache). Haiku 4.5 não tem esforço.

### 6. Modelo (por último, um degrau por vez)

O modelo limita o teto de inteligência, por isso vem depois de tudo que não limita. Medições:

- Fable 5 em `low` bateu o Sonnet 5 em pesquisa profunda custando 10% menos por tarefa. Preço por token não prevê o ranking; custo por tarefa concluída prevê.
- Em código, Opus 5 empatou com o Fable 5 (91,7% contra 91,3%) a 60% do custo.
- Haiku 4.5 respondeu conhecimento a um décimo do custo do Opus 5, com 63% contra 92% de acerto: alto volume com saída checável, não loop.

**Cauda, não mediana.** Compare modelos nos 10% de tarefas mais difíceis: é lá que a conta
fecha ou estoura. Em uma rodada de 20 problemas, dois carregaram 43% do gasto.

**Método do degrau.** Varra esforço no modelo atual; se `low` passa, desça um tier, volte ao
esforço padrão daquele tier e varra de novo. Um degrau por vez, contra o painel.

**Dois modelos** (advisor ou orquestrador) só compensam com muito trabalho independente para
delegar. No copiloto não há: uma chamada por etapa. Não monte cascata aqui.

## Mapa rápido: onde está o custo → o que puxar

| Onde o custo está | Puxe | Cuidado |
|---|---|---|
| Mesmo prompt de sistema e preset em toda chamada | cache com TTL 1 h | volátil acima do ponto de cache mata o cache |
| Blueprint grande em toda etapa | mandar só a seção da etapa | etapa que precisa do todo (revisão) manda o todo, com cache |
| Saída longa | schema estrito e `max_tokens` do perfil | teto baixo demais corta JSON no meio: use o do perfil |
| Esforço e raciocínio dominam e a taxa de sucesso tem folga | baixar esforço, depois descer modelo | troca capacidade; meça antes de fixar |
| Ninguém espera | Batch | wizard espera |
| Taxa de sucesso baixa em uma etapa | consertar prompt e schema | modelo mais caro não conserta schema ruim |
