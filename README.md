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

Fase 0, fundação documentada. Nenhuma linha de código escrita ainda.
Comece por `docs/00_VISAO/README.md` e siga a numeração.

## Mapa

| Onde | O que é |
|---|---|
| `CLAUDE.md` | Constituição do projeto, leia antes de qualquer mudança |
| `memory/` | Governança: identidade, decisões, padrões, aprendizados, restrições, bugs |
| `docs/00` a `docs/11` | Documentação em ordem de leitura, de visão até segurança |
| `docs/08_DECISOES/` | ADRs, sete decisões já registradas |
| `presets/` | Os menus, em JSON |
| `respostas-intake.md` | As respostas que originaram esta fundação |

## Rodar (quando existir código)

Ver `INSTALACAO.md`.
