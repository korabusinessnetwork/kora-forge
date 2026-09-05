# 03, Regras de Negócio

Regras por módulo, escritas antes do código. Detalhamentos em:

- `motor-de-regras.md`: como as regras determinísticas funcionam
- `presets.md`: o contrato de um preset e as etapas do wizard

## RN-01, Projeto

1. Projeto tem nome, slug, preset de origem, caminho no disco e status.
2. Slug é derivado do nome (minúsculo, sem acento, hífen) e é único no workspace. Nasce na criação e não muda ao renomear, porque depois de materializado ele é o nome da pasta.
3. Status possíveis: `rascunho`, `pronto_para_materializar`, `materializado`, `arquivado`.
4. Projeto só passa a `materializado` depois que o runner conclui sem erro fatal.
5. Projeto arquivado some da lista principal mas nunca é apagado do banco. Apagar a pasta em disco é ação manual do usuário, o Forge não apaga projeto materializado.
6. Restaurar um projeto arquivado devolve `materializado` quando há pasta em disco e `rascunho` quando não há. Projeto arquivado não recebe blueprint novo.

## RN-02, Blueprint

1. Blueprint é o estado completo do projeto como dado, versionado a cada alteração relevante.
2. Blueprint guarda: respostas do wizard, decisões, tokens do Studio, entidades, rotas, APIs escolhidas, id e versão do preset, e a versão de cada template usado.
3. Materializar o mesmo blueprint duas vezes produz exatamente o mesmo conjunto de arquivos (princípio nº 2).
4. Blueprint é exportável e importável em JSON. Import passa por validação de schema.
5. Alterar preset de um projeto já materializado não é permitido. Cria-se um projeto novo.

## RN-03, Wizard

1. Nove etapas padrão. Cada preset liga, desliga e reordena etapas, mas não inventa etapa fora do catálogo sem alterar o schema.
2. Toda etapa é pulável, exceto Identidade e Materialização.
3. Etapa pulada usa o default do preset e é marcada como "assumida" no blueprint, aparecendo na revisão final.
4. Sair no meio salva rascunho automaticamente. Retomar volta exatamente na etapa em que parou.
5. Voltar uma etapa e mudar resposta reprocessa o motor de regras e pode reabrir avisos já resolvidos.
6. Uma etapa está **concluída** quando os campos obrigatórios dela estão preenchidos, e **assumida** quando foi pulada. Os dois estados são exclusivos: entrar em um tira do outro.
7. Campo obrigatório em branco não bloqueia o avanço. Ele só impede a etapa de contar como concluída. Bloqueio é do motor de regras (RN-04).
8. Salvar só cria versão nova quando o blueprint resultante é diferente do ativo. Navegar sem editar não gera versão nem evento.
9. Etapa que não existe no preset do projeto não entra no blueprint: o servidor recusa `etapaAtual`, `etapasConcluidas` ou `assumidas` fora do menu.

## RN-04, Motor de regras

1. Regra é declarativa: condição sobre o blueprint mais efeito.
2. Severidades: `info`, `aviso`, `bloqueio`.
3. `bloqueio` impede a materialização até ser resolvido ou explicitamente dispensado com justificativa, que fica registrada no blueprint.
4. Regra nunca altera o blueprint sozinha. Ela propõe, o usuário aceita.
5. Toda regra disparada vira registro em `rule_hits`, com o estado final (resolvida, dispensada, ignorada). Um hit por regra por projeto: reavaliar atualiza, nunca duplica.
6. Regra que parou de disparar tem o hit **resolvido sozinho**. Decisão humana sobrevive à reavaliação: dispensado continua dispensado até alguém reabrir.
7. Regra de `resolucao: automatica` nasce resolvida, porque o gerador aplica o efeito sem pedir nada a ninguém. Ela aparece na tela como registro, e nunca bloqueia.
8. Dispensar exige justificativa de ao menos 10 caracteres, e só vale para regra marcada como dispensável.

## RN-05, Geração e materialização

1. Nenhuma escrita em disco sem plano aprovado (dry-run).
2. O plano lista, por arquivo: caminho relativo, ação (criar, sobrescrever, pular), tamanho, tamanho atual em disco, origem (qual template) e o conteúdo já resolvido. O conteúdo vai no plano porque o runner recebe o plano, nunca a intenção (**ADR-002**).
3. Arquivo existente nunca é sobrescrito silenciosamente. Conflito vira decisão explícita, com diff. Arquivo existente com conteúdo **idêntico** vira `pular`, não conflito: regerar o plano de um projeto já materializado e sem mudanças mostra zero conflitos.
4. Ordem fixa: pastas, fundação (`CLAUDE.md`, `memory/`, `docs/`), config, código, e só então os comandos.
5. Se um comando **obrigatório** falha, a materialização para, o estado fica registrado e o usuário decide entre repetir, pular ou abortar. Nada é revertido automaticamente, mas o log mostra exatamente onde parou.
5.1. Comando **opcional** que falha fica registrado e o fluxo segue. Ele foi marcado como dispensável no preset, e pedir decisão sobre algo dispensável só adicionaria carga mental (princípio nº 1).
5.2. Comando de **longa duração** (dev server) não segura a fila: o runner o deixa vivo, segue para o próximo e a materialização se conclui. Parar esse processo é ação do usuário, a qualquer momento.
6. Materialização gera sempre a fundação completa. Projeto sem `memory/` preenchido é materialização falha, não projeto simples.
7. O plano carrega o hash do blueprint, do preset e das versões de template usadas. É o que permite recusar a execução de um plano velho (`FORGE_PLAN_STALE`).
8. Template que o preset ou uma regra pede e que o catálogo ainda não tem vira **pendência declarada** no plano, com o motivo. O plano segue sem ele, em vez de falhar em silêncio.
9. Bloqueio aberto no motor de regras impede gerar o plano.

## RN-06, Comandos

1. Só executa comando presente na whitelist do preset, com argumentos validados por schema.
2. Comando é executado com `spawn` e array de argumentos, `shell: false`, com `cwd` dentro do workspace.
3. Comando de longa duração (dev server) roda destacado, com log em stream e botão de parar. O runner não espera o fim dele.
4. Timeout padrão de 10 minutos por comando, configurável por preset.
5. Ferramenta ausente no sistema é detectada **antes** de iniciar, não no meio.

## RN-07, APIs e cofre

1. Chave de API só entra pelo campo de cofre e nunca volta para o front. O front vê alias e status, jamais o valor.
2. Cada API conectada tem um teste de conexão que roda antes de ser marcada como ativa.
3. Modelo de API define: variáveis de ambiente, template de cliente na camada de serviços, teste de conexão e documentação gerada em `docs/07_APIS/` do projeto.
4. Projeto gerado recebe `.env.example` com os nomes das variáveis, nunca com valores.
5. Cofre trancado bloqueia apenas a etapa de APIs. O resto do fluxo continua.

## RN-08, Studio

1. O Studio edita apenas o que o design system do projeto suporta. Não existe elemento livre sem equivalente em componente. O vocabulário é o catálogo, contrato em [`catalogo.md`](./catalogo.md).
2. Saída do Studio: tokens (`tokens.css`), lista de páginas e layout de cada página em estrutura de dados, que o gerador transforma em JSX.
3. Layout exportado é esqueleto (regiões, componentes, hierarquia), não pixel-perfect.
4. Alterar o design depois de materializar não reescreve o projeto. Gera um plano de diff que o usuário aplica se quiser.

## RN-09, Copiloto

1. Desligado por padrão. Sem chave configurada, o botão nem aparece.
2. Toda sugestão é rotulada como gerada por IA e precisa ser aceita para entrar no blueprint.
3. Saída sempre validada por schema. Inválida duas vezes, cai para o default determinístico.
4. Consumo registrado por chamada. Teto mensal atingido desliga o copiloto e avisa.
5. O copiloto nunca executa comando, nunca escreve arquivo e nunca decide arquitetura.

## RN-10, Ideias

1. Em qualquer etapa é possível registrar uma ideia sem sair do fluxo, com título e um próximo passo.
2. Ideia registrada não abre projeto nem interrompe o que está em andamento. Ela vai para a lista de ideias e o usuário volta para onde estava.

## RN-11, Harness (Fase 6, ADR-008)

1. Todo build segue o ciclo planejar → despachar → build → review → aprender. Nenhuma etapa é pulada.
2. Build só sai de `planejado` com o plano aprovado pelo dono. O plano lista itens, dono exclusivo por arquivo e modelo por papel.
3. Dois despachos nunca tocam o mesmo arquivo. Conflito de dono é bloqueio no plano, não erro em runtime.
4. Modelo é escolhido por papel (planejar, construir, revisar) e o default Kora vem primeiro.
5. Cada rodada de review registra achados e correções em `build_ciclos`. Achado que se repete em dois builds vira learning; em três, vira regra ou padrão.
6. O Forge orquestra e observa. Quem constrói é o Claude Code. O Forge nunca edita código de feature por conta própria.

## RN-12, Painel de relatórios (Fase 6, ADR-008)

1. O painel mostra todos os builds em andamento, de todos os projetos, em uma tela só.
2. Progresso é sempre "x de y" itens do plano, com barra. Barra sem número não existe.
3. Estimativa de término é uma faixa calculada dos dados gravados, rotulada como estimativa e com a base visível. Sem histórico, mostra "sem base ainda". Nunca um número inventado, nunca vindo de LLM.
4. "O que falta" é a lista de itens pendentes e bloqueados de cada aplicativo, com a próxima ação.
5. Por modelo, o painel mostra o plano em execução e o ciclo de aprendizado: rodadas, achados, correções e o que virou learning.
6. Atualização ao vivo. Estado vazio traz a próxima ação, nunca tela em branco.
