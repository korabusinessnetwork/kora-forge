# 00, Visão

## O problema

Criar um programa novo, hoje, custa um pedágio fixo antes da primeira linha útil:

1. Lembrar qual é a estrutura padrão e recriá-la à mão.
2. Retomar decisões já tomadas em outros projetos (stack, auth, multi-tenant, deploy).
3. Reescrever os mesmos documentos de fundação.
4. Reconectar as mesmas APIs e reencontrar as mesmas chaves.
5. Remontar os mesmos prompts para o Claude Code.

Esse pedágio tem três efeitos. Ideia boa morre porque começar é caro. Projetos que
nascem em momentos diferentes ficam inconsistentes entre si. E o método, que existe e
funciona, vive na cabeça de uma pessoa só.

## A solução

KORA FORGE é uma bancada local que transforma esse método em software executável.

```
   MENU              WIZARD                 BLUEPRINT            MATERIALIZAÇÃO
┌──────────┐   ┌────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│ Criar    │   │ 1 Identidade   │   │ respostas        │   │ cria a pasta     │
│ Site     │   │ 2 Escopo       │   │ decisões         │   │ escreve a        │
│ Aplicação│ → │ 3 Stack        │ → │ design tokens    │ → │ fundação inteira │
│ Aplicação│   │ 4 Design       │   │ entidades        │   │ conecta APIs     │
│ Local    │   │ 5 Dados        │   │ rotas            │   │ roda os comandos │
│          │   │ 6 APIs         │   │ APIs             │   │ sobe o dev server│
│ + presets│   │ 7 Segurança    │   │ preset + versões │   │                  │
│   seus   │   │ 8 Fundação     │   │                  │   │ tudo após dry-run│
│          │   │ 9 Materializar │   │ (reproduzível)   │   │ e confirmação    │
└──────────┘   └────────────────┘   └──────────────────┘   └──────────────────┘
                       ↑                     ↓
                       └── MOTOR DE REGRAS ──┘
                          determinístico, valida,
                          avisa e exige ADR quando
                          a decisão pede
                                  +
                          COPILOTO CLAUDE (opcional,
                          desligado por padrão)
```

## North star

**Tempo entre abrir o Forge e o dev server do projeto novo subir, com a fundação
preenchida, abaixo de 10 minutos.** Sem digitar comando, sem copiar pasta antiga,
sem lembrar de nada.

Métrica de apoio: zero placeholder `{{...}}` sobrando em arquivo gerado.

## Para quem

Matheus, e depois qualquer dev da Kora. Ferramenta interna. Ver `memory/identity.md`.

## O que torna diferente de um `create-app` qualquer

| Gerador comum | KORA FORGE |
|---|---|
| Gera `src/` e `package.json` | Gera a **fundação governada**: `memory/`, `docs/00` a `11`, ADRs, plano de segurança, e depois o código |
| Escolhas fixas no template | Escolhas guiadas por um motor de regras que reage ao que você respondeu |
| Roda uma vez e some | Guarda o blueprint, permite reabrir, reproduzir e evoluir |
| Sem design | Studio embutido, que gera tokens e layout do projeto |
| Sem integração | API Hub com modelos de integração e cofre de chaves |
| Depois de gerar, some | Harness como sistema de operação de build e painel de relatórios: o que está construindo, o que falta, estimativa e ciclo de aprendizado por modelo (Fase 6, ADR-008) |

## Escopo da versão 1

Dentro: registry de projetos, três presets, wizard, motor de regras, geração da fundação
em disco, runner com dry-run.
Fora: Studio, API Hub, copiloto. Cada um tem sua fase. Ver `09_BACKLOG/mvp.md`.

## Riscos de produto

| Risco | Mitigação |
|---|---|
| Virar um Figma pela metade e um IDE pela metade | Não-objetivos explícitos em `memory/identity.md`, revisados a cada fase |
| Preset engessar e atrapalhar mais que ajudar | Toda etapa é pulável, todo default é editável, preset é dado e não código |
| A fundação gerada virar documentação zumbi | Conteúdo vem do blueprint, não de template vazio. Placeholder sobrando é bug |
| O escopo crescer sem fim | Fases fechadas, uma entrega utilizável por fase |
