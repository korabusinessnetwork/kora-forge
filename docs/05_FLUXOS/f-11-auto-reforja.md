# F-11, Auto-Reforja, melhorar a própria forja

> Decisão em `docs/08_DECISOES/adr-014-auto-reforja.md`. Spec em `specs/auto-reforja.md`.

```
Menu "Auto-Reforja"
  └─ DIAGNÓSTICO (só leitura, determinístico)
       └─ sinais ordenados por severidade, com evidência e sugestão
            └─ "Transformar em melhoria"
                 └─ já existe item aberto do mesmo sinal? mostra "já está no backlog"
                 └─ senão cria item com origem diagnóstico
  └─ NOVA MELHORIA (manual): título, descrição opcional, prioridade (média é o padrão)
  └─ SUGESTÕES DO MODELO GRATUITO (opcional)
       └─ gateway desligado ou fora do ar? ação desabilitada, motivo e link para Configurações
       └─ pedir: vai só o resumo (títulos e contagens), volta até 5 propostas
            └─ cada proposta: aceitar (vira item com origem modelo) ou dispensar
  └─ CICLO DO BACKLOG
       proposta ──► especificada ──► em construção ──► em revisão ──► concluída
          ▲  │          │  ▲             │  ▲              │  ▲           │
          │  └─ voltar ─┘  └── voltar ───┘  └── voltar ────┘  └─ reabrir ─┘
          └── restaurar ◄── descartada ◄── descartar (de qualquer estado aberto, com confirmação)
       └─ "Gerar spec"
            └─ PRÉVIA: caminho specs/reforja-<slug>.md, conteúdo, aviso se o arquivo já existe
            └─ confirmar (e marcar sobrescrita, se existe)
            └─ grava, guarda o caminho no item e move proposta para especificada
```

O que acontece depois de cada estado, como a tela diz:

| Estado | Depois |
|---|---|
| proposta | gere a spec pela prévia, ou escreva a spec e avance |
| especificada | rode `/build` com a spec e avance para em construção |
| em construção | quando o build terminar, avance para revisão e rode `/review` |
| em revisão | com a auditoria toda em sim, conclua; se achou problema, volte para construção |
| concluída | pronto; reabra a revisão se aparecer regressão |
| descartada | fica guardada e pode ser restaurada como proposta |

Nada deste fluxo depende do modelo. Com o gateway desligado, só a caixa de sugestões fica
indisponível.
