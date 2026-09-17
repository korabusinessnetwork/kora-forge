# KORA FORGE

Bancada local para nascer projeto novo. Roda em `localhost`, sem nuvem e sem custo.

Escolha um menu (Criar Site, Criar Aplicação Web, Criar Aplicação Local), responda
um wizard de etapas curtas, desenhe as telas no Studio e mande materializar. O Forge
cria a pasta do projeto no disco, escreve a fundação inteira (CLAUDE.md, `memory/`,
`docs/00` a `docs/11`, ADRs), conecta as APIs escolhidas e roda os comandos de setup
até o dev server subir.

## Em 30 segundos

```
Preset  →  Wizard  →  Blueprint  →  Motor de regras  →  Dry-run  →  Materialização
menu       etapas     o estado      valida e avisa      prévia      disco + comandos
```

- **Preset**: arquivo declarativo que define quais etapas existem, qual stack, quais skills, quais comandos e qual o "pronto" daquele tipo de projeto.
- **Blueprint**: todo o projeto como dado, versionado. Mesmo blueprint gera sempre o mesmo resultado.
- **Motor de regras**: determinístico. Lê o blueprint, dispara avisos e exige ADR quando a decisão pede.
- **Copiloto Claude**: opcional e desligado por padrão. Enriquece texto, nunca decide sozinho.
- **Studio**: editor visual próprio, gera os tokens e o layout do projeto.
- **Runner**: executa comandos com whitelist, sempre depois de um dry-run.

## Estado

**Fase 1 concluída**, critério de aceite provado por dois caminhos e registrado em
`docs/09_BACKLOG/fase1-aceite.md`: front React + Vite, API local Fastify em `127.0.0.1:7337` com
guarda de sessão, SQLite com migrations, envelope `{ data, error, meta }` validado por Zod nas duas
pontas, tokens `--forge-*`, atoms básicos, presets builtin validados por schema, o Registry (criar,
abrir, renomear, arquivar, restaurar), o wizard que preenche o blueprint etapa a etapa, o motor de
regras determinístico com 16 regras que avisam junto do campo que as causou, o gerador, que
transforma blueprint mais templates versionados em um plano de arquivos e comandos, o runner, que
aplica esse plano no disco e executa os comandos com `spawn` sem shell, log ao vivo e a fila parando
quando algo obrigatório falha, as telas de fechamento e a gaveta de ideias.

**Fase 2, o Studio, em andamento**, blocos 1 a 4 entregues: documento de design versionado, painel
de tokens com preview ao vivo, catálogo de regiões e componentes, e o canvas. Próximo: bloco 5, a
etapa Design no wizard.

Fora das fases, entregue a página **Eficiência** (gasto contra o teto, ranking dos modelos por
sucesso por dólar, recomendação por etapa e simulador) com o motor determinístico em
`shared/eficiencia/` e a skill de projeto `low-cost-efficiency` (`/custo`).

Estado bloco a bloco em `docs/09_BACKLOG/`. Spec e auditoria de cada bloco em `specs/`.
Para entender o produto, comece por `docs/00_VISAO/README.md` e siga a numeração.

## Mapa

| Onde | O que é |
|---|---|
| `CLAUDE.md` | Constituição do projeto, leia antes de qualquer mudança |
| `memory/` | Governança: identidade, decisões, padrões, aprendizados, restrições, bugs |
| `docs/00` a `docs/11` | Documentação em ordem de leitura, de visão até segurança |
| `docs/08_DECISOES/` | ADRs, doze decisões já registradas |
| `presets/` | Os menus, em JSON |
| `regras/` | O catálogo do motor determinístico, uma regra por arquivo |
| `templates/` | O que o gerador escreve, um template por pasta |
| `shared/eficiencia/` | Catálogo de modelos e preços, perfis por intenção e motor de custo (dado versionado) |
| `.claude/skills/` | Skills de projeto. `low-cost-efficiency` decide modelo, esforço e cache pelo menor custo por tarefa |
| `respostas-intake.md` | As respostas que originaram esta fundação |
| `specs/` | Specs do loop spec → build → review, uma por bloco do backlog |
| `server/`, `src/`, `shared/` | API local, front e contrato compartilhado (schemas Zod, códigos de erro) |

## Rodar

```powershell
npm ci
npm run forge:init
npm run forge
```

Abra a URL que o terminal imprime: ela carrega o token de sessão. Detalhes em `INSTALACAO.md`.

`npm ci`, não `npm install`: o `install` do zero falha em npm 10.9.7 (R-07 em `memory/bugs.md`).
Se o `ci` parar em `node-gyp` do `better-sqlite3`, use `npm ci --ignore-scripts`, porque o pacote
já traz binário pré-compilado e não precisa de toolchain C++ (R-02).
