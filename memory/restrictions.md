# Restrições, KORA FORGE

## Objetivo
Registrar os limites inegociáveis (técnicos, de custo, de segurança e de escopo) que
qualquer decisão de produto ou arquitetura deve respeitar sem exceção silenciosa.

## Contexto
O Forge escreve arquivos e executa processos na máquina do dono, e guarda chaves de API
reais. As restrições aqui não são preferências, são o que impede a ferramenta de virar
um risco.

## Regras Gerais
- Toda restrição tem categoria: `custo`, `segurança`, `técnica`, `escopo`, `legal`.
- Restrição de custo registra valor aproximado, alternativa gratuita e recomendação de timing.
- Restrição não expira sozinha. Só sai daqui por decisão explícita do dono.

## Validações
- Restrição de segurança exige descrição do ataque que ela previne.
- Restrição de custo exige ao menos uma alternativa gratuita avaliada, mesmo que descartada.

## Permissões
- Qualquer dev propõe. Apenas o dono (Matheus) remove ou flexibiliza.

## Exceções
- Em ambiente de teste isolado, restrição técnica pode ser suspensa com tag `[SUSPENSA-DEV]` e prazo. Restrição de segurança nunca é suspensa.

## Auditoria
- Autor, data e categoria obrigatórios.

## Eventos
- `restricao.adicionada`, `restricao.removida`

## Configurações Futuras
- Alertar quando um PR tocar arquivo coberto por restrição de segurança ativa.

## Casos de Uso
- Antes de adicionar dependência nova, integração paga, ou qualquer código que escreva em disco ou execute processo.

## Critérios de Aceite
- [ ] Categoria definida
- [ ] Se custo: valor e alternativa gratuita
- [ ] Se segurança: ataque prevenido descrito

---

## Segurança

| # | Restrição | Ataque prevenido |
|---|---|---|
| S-01 | O servidor local liga exclusivamente em `127.0.0.1`. Nunca `0.0.0.0`, nunca IP de rede. | Exposição da máquina para a rede local |
| S-02 | Toda rota exige token de sessão local no header e checagem de `Origin`. | DNS rebinding e CSRF a partir de site aberto no browser |
| S-03 | Escrita em disco só dentro do workspace configurado. Path traversal é bloqueio com erro, não aviso. | Sobrescrita de arquivo do sistema |
| S-04 | Comando é executado com `spawn` e array de argumentos, `shell: false`, contra whitelist. Nunca interpolação de string. | Injeção de comando via nome de projeto ou campo do wizard |
| S-05 | Chave de API nunca vai para `.env`, SQLite em claro, log, telemetria ou front. Só para o cofre criptografado. | Vazamento de credencial |
| S-06 | Preset importado de fora é validado por schema e roda com os mesmos limites de whitelist. | Preset malicioso executando comando arbitrário |
| S-07 | Conteúdo lido do disco enviado ao copiloto vai delimitado como dado não confiável. | Prompt injection via arquivo do projeto |
| S-08 | Nenhuma ação destrutiva sem dry-run e confirmação. Apagar arquivo existente exige confirmação explícita, nunca faz parte de um fluxo automático. | Perda de trabalho |

## Custo

| # | Restrição | Valor | Alternativa gratuita |
|---|---|---|---|
| C-01 | Fase bootstrap. Nenhum serviço pago recorrente. | R$ 0 | tudo local |
| C-02 | Copiloto Claude nasce desligado, com teto mensal configurável (default 5 USD) e log de consumo por chamada. Atingido o teto, desliga sozinho. | variável | motor determinístico, que faz todo o essencial |
| C-03 | Sem telemetria, sem analytics, sem serviço externo de log. | R$ 0 | log local em `~/.kora-forge/logs/` |

## Técnicas

| # | Restrição |
|---|---|
| T-01 | Roda offline. Nenhuma funcionalidade essencial pode exigir internet. Internet só para instalar dependência do projeto gerado e para o copiloto. |
| T-02 | Ambiente primário é Windows 11 com PowerShell 7. Todo caminho e todo comando precisam funcionar lá antes de qualquer outro sistema. |
| T-03 | Dependência nova precisa de justificativa. Preferência por biblioteca pequena, sem binário nativo além do `better-sqlite3`. |
| T-04 | Nada de Electron ou Tauri na Fase 1. O Forge roda no browser, contra um servidor local. |

## Escopo

| # | Restrição |
|---|---|
| E-01 | O Forge não edita código de projeto já materializado. Depois de criado, o projeto pertence ao VS Code e ao Claude Code. |
| E-02 | O Studio não é ferramenta de design geral. Ele desenha o que o design system do projeto suporta, e só. |
| E-03 | Nenhuma execução autônoma. Toda ação com efeito colateral passa por confirmação humana. |
| E-04 | Projeto gerado nunca depende do Forge em runtime. Apagar o Forge não pode quebrar nada. |
