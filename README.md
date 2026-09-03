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

Fase 1 em andamento. Blocos 1 a 4 entregues: front React + Vite, API local Fastify em
`127.0.0.1:7337` com guarda de sessão, SQLite com migrations, envelope `{ data, error, meta }`
validado por Zod nas duas pontas, tokens `--forge-*`, atoms básicos, presets builtin validados
por schema, o Registry (criar, abrir, renomear, arquivar, restaurar) e o wizard que preenche o
blueprint etapa a etapa, o motor de regras determinístico com 16 regras que avisam junto do
campo que as causou, e o gerador, que transforma blueprint mais templates versionados em um plano
de arquivos e comandos, sem tocar no disco.
Próximo: bloco 7, runner. Spec e auditoria de cada bloco em `specs/`.
Para entender o produto, comece por `docs/00_VISAO/README.md` e siga a numeração.

## Mapa

| Onde | O que é |
|---|---|
| `CLAUDE.md` | Constituição do projeto, leia antes de qualquer mudança |
| `memory/` | Governança: identidade, decisões, padrões, aprendizados, restrições, bugs |
| `docs/00` a `docs/11` | Documentação em ordem de leitura, de visão até segurança |
| `docs/08_DECISOES/` | ADRs, sete decisões já registradas |
| `presets/` | Os menus, em JSON |
| `regras/` | O catálogo do motor determinístico, uma regra por arquivo |
| `templates/` | O que o gerador escreve, um template por pasta |
| `respostas-intake.md` | As respostas que originaram esta fundação |
| `specs/` | Specs do loop spec → build → review, uma por bloco do backlog |
| `server/`, `src/`, `shared/` | API local, front e contrato compartilhado (schemas Zod, códigos de erro) |

## Rodar

```powershell
npm install
npm run forge:init
npm run forge
```

Abra a URL que o terminal imprime: ela carrega o token de sessão. Detalhes em `INSTALACAO.md`.
