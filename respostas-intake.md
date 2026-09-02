# Respostas do Intake, KORA FORGE

> Fonte de verdade do questionário da skill `fundacao-de-projeto`.
> Data: 2026-09-02. Entrevistado: Matheus Bonato.
> Itens marcados `[ASSUMIDO]` foram preenchidos com o default Kora e devem ser
> revisados antes da Fase 2 do backlog.

## Bloco 1, Produto e identidade

| Pergunta | Resposta |
|---|---|
| Produto e essência | **KORA FORGE**, uma bancada local (localhost) que conduz a criação de um programa novo do zero até rodar, aplicando sempre o mesmo caminho, as mesmas ferramentas e a mesma governança que a Kora já usa. |
| Problema | Todo projeto novo recomeça do zero: relembrar a fundação, repetir decisões, recriar estrutura, reescrever prompts, reconectar as mesmas APIs. O custo de partida mata ideia boa e gera projetos inconsistentes entre si. |
| Proposta de valor | Transformar o método (fundação, ADRs, stack default, skills, presets) em software executável. O caminho deixa de depender de memória e passa a ser um trilho com etapas. |
| Já existe código? | Não, nasce do zero. O método já existe em skills e em projetos anteriores. |

## Bloco 2, Público e escopo

| Pergunta | Resposta |
|---|---|
| Público-alvo primário | Uso pessoal do Matheus na máquina local. Persona secundária futura: dev da Kora Business Network. |
| B2B / B2C | Nenhum dos dois hoje, é ferramenta interna. Produtizar é hipótese de longo prazo, fora do escopo. |
| Aha moment | Escolher um menu, responder o wizard e ver a pasta do projeto nascer no disco com docs preenchidos e o dev server subindo, sem digitar um comando. |

## Bloco 3, Multi-tenant e white-label

| Pergunta | Resposta |
|---|---|
| Multi-tenant? | **Não.** Single-tenant definitivo por ora, single-user local. Registrado em **ADR-003**. |
| White-label? | Não para o Forge. **Sim, obrigatoriamente, para todo projeto que ele gera:** os presets nascem multi-tenant e white-label. O princípio Kora se preserva no output. |
| Planos / feature flags | Não se aplica. Existem flags locais de recurso (copiloto ligado/desligado, Studio, runner). |

## Bloco 4, Stack e arquitetura

| Pergunta | Resposta |
|---|---|
| Entrega final do fluxo | **Cria a pasta do projeto no disco e executa os comandos** (git init, scaffold, instalação de dependências, dev server). Exige backend local com acesso a filesystem e a processos. |
| Camada de design | **Editor visual próprio (Studio)** embutido no Forge, não integração com o Figma real. Registrado em **ADR-005**. |
| Motor "IA sem ser IA" | **Determinístico por padrão, com copiloto Claude opcional e opt-in.** O sistema funciona 100% sem chave de API. Registrado em **ADR-004**. |
| Stack | Desvio consciente do Modelo A. Front React 18 + Vite, backend local Node 20 + Fastify em 127.0.0.1, SQLite local. Registrado em **ADR-001**. |
| Tem UI? | Sim. Princípio nº1 = intuitividade. |
| Deploy / dados | Sem deploy, sem nuvem. Dados em `~/.kora-forge/`. |

## Bloco 5, Segurança e compliance

| Pergunta | Resposta |
|---|---|
| Dado pessoal / financeiro | Não trata dado de terceiros. Trata **chaves de API reais**, que é o ativo sensível do produto. |
| Compliance | Nenhum requisito regulatório. LGPD não incide (sem dado pessoal de terceiro). |
| Isolamento | Não há isolamento entre clientes. O isolamento que importa é entre o Forge e o resto da máquina: whitelist de diretórios e de comandos. Ver `docs/11_SEGURANCA`. |

## Bloco 6, Custo

| Pergunta | Resposta |
|---|---|
| Fase | Bootstrap, custo zero obrigatório. Tudo roda local. |
| Serviço pago aprovado | Apenas o consumo da API Anthropic pelo copiloto, quando o Matheus ligar. Desligado por padrão, com teto de gasto e log de consumo. |

## Bloco 7, Design

| Pergunta | Resposta |
|---|---|
| Identidade visual | `[ASSUMIDO]` Tema escuro por padrão com alternância para claro, densidade alta de informação, estética de ferramenta de trabalho. Revisar na Fase 2. |
| Referências | `[ASSUMIDO]` Linear, Raycast e Vercel Dashboard como tom, sem cópia visual. |
| Contexto de uso | Desktop, Windows, teclado e mouse, sessões longas. Não precisa ser responsivo para mobile. |

## Resumo de 5 linhas (confirmado antes de gerar os arquivos)

1. KORA FORGE é uma bancada local que transforma o método de criação de projetos da Kora em software.
2. Menus (Criar Site, Criar Aplicação Web, Criar Aplicação Local) são presets declarativos que ligam etapas, stack, skills e comandos.
3. O wizard preenche um Blueprint, um motor de regras determinístico valida e recomenda, e a materialização cria a pasta e roda os comandos.
4. O Studio é um editor visual próprio que produz tokens e layout do projeto gerado.
5. Copiloto Claude é opcional, o sistema inteiro funciona sem nenhuma chave de API.
