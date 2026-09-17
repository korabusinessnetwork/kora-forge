# B-01 e B-02, a URL do projeto novo na tela final

> Spec da rodada 8 do ciclo. Dois achados da prova do critério de aceite da Fase 1, registrados em
> `docs/09_BACKLOG/README.md`. Fecham a última distância entre materializar e ver o projeto rodando.

## 1. Escopo

A tela final mostra a URL do dev server do projeto recém-nascido, clicável e copiável, e o projeto
gerado deixa de nascer na mesma porta do Forge.

## 2. Fora de escopo

- Abrir o browser por processo do sistema. Ver a seção 4: não é preciso, e por isso não se faz.
- Perguntar a porta no wizard. Porta é exatamente o que o princípio nº 1 manda não perguntar.
- Parar ou reiniciar o dev server pela tela final. O `PainelMaterializacao` já tem o Parar.
- Mostrar a URL em qualquer lugar além da tela final.
- Reabrir log de materialização antiga, podar `command_logs`, R-07, R-10.

## 3. Origem e decisões que este item honra

- **B-01 e B-02** em `docs/09_BACKLOG/README.md`, levantados por `npm run verificar:fase1`.
- **`docs/09_BACKLOG/fase1-aceite.md`**: "Depois de tanto trabalho para não precisar de terminal, o
  último passo, abrir o projeto no browser, ainda depende de ler o log."
- **Critério de aceite da Fase 1**, "criar um projeto sem tocar no terminal". A URL fechada no log
  é o resto de terminal que sobrou.
- **CLAUDE.md, princípio nº 1**: o usuário nunca digita caminho que o sistema poderia inferir. A
  URL o sistema infere, porque o próprio dev server a anuncia.
- **R-11, corrigido na rodada 7**: a saída do dev server agora persiste, o que torna a URL um dado
  do servidor e não um efeito de tela.

## 4. Por que não abrir o browser por processo

O caminho óbvio seria repetir o abridor de pasta do bloco 8, com a URL no lugar do caminho. Isso
seria errado por dois motivos.

**Não é preciso.** A interface do Forge já roda dentro de um browser. A afordância nativa para
levar alguém a uma URL é um link. Um botão que dispara `explorer` para abrir o browser que já está
aberto é caminho longo para chegar onde um `<a>` chega.

**Seria pior.** A URL vem da saída de um processo, ou seja, de fora. O CLAUDE.md manda tratar
conteúdo que vem de fora como dado, nunca como instrução, e passar esse texto para um binário do
sistema é justamente promovê-lo a instrução. Como link, ele continua sendo dado: o browser resolve,
e a validação da URL fica na nossa mão de qualquer jeito.

Consequência prática: esta rodada **não** cria capacidade nova nenhuma, e não depende da
ratificação do ADR-009.

## 5. De onde a URL vem, e como ela é validada

O runner já vê cada linha do processo. Quando uma linha de um comando de longa duração contém uma
URL de loopback, ela é guardada no comando e entra no estado da materialização.

A validação é estreita de propósito. Só é aceita URL que casar com:

```
^https?://(localhost|127\.0\.0\.1)(:\d{1,5})?/?$
```

Qualquer outra coisa é ignorada em silêncio, inclusive endereço de rede, domínio externo e caminho
com rota. Um dev server que anuncia `https://exemplo.com` não vira link na tela do Forge.

## 6. A porta do projeto gerado

O template fixa `server: { port: 5173 }`, que é a porta do dev server do próprio Forge. Com o Forge
aberto, o projeto gerado escorrega para 5174, 5175 e por aí.

A porta passa a ser **5273**, sem `strictPort`. Escolhida por ser fácil de reconhecer como "não é a
do Vite padrão" e por não colidir com nada do Forge, que usa 5173 e 7337. Sem `strictPort` porque
dois projetos gerados rodando ao mesmo tempo é caso normal, e escorregar é melhor que falhar. E
como a tela final mostra a URL anunciada, escorregar deixou de ser um problema para quem usa.

## 7. Arquivos afetados

Modificados:

- `templates/vite-react/arquivos/vite.config.js` — porta 5273.
- `shared/schemas/materializacao.js` — `url` no comando, `nullable`.
- `server/modules/runner/servico.js` — captura e validação da URL.
- `src/components/plano/TelaFinal/TelaFinal.jsx` e `.module.css` — o link.
- `src/components/plano/TelaFinal/TelaFinal.test.jsx`, `server/modules/runner/runner.test.js`.
- `src/mensagens.js` — textos.
- `docs/09_BACKLOG/README.md` — B-01 e B-02 fechados.

## 8. Critérios de aceite

### Servidor

1. Linha de comando de longa duração que contém URL de loopback grava essa URL no comando, e ela
   aparece em `GET /api/projects/:id/materializar`.
2. A URL é validada pela expressão da seção 5. Endereço de rede, domínio externo, URL com caminho
   e texto que só parece URL são ignorados.
3. Vale a **primeira** URL válida. Vite imprime `Local` e depois `Network`, e é a `Local` que
   interessa.
4. Comando que não é de longa duração não vira link: `git init` e `npm install` não anunciam
   servidor.
5. Comando sem URL nenhuma fica com `url: null`, e isso não é erro.
6. O schema aceita `url` nula, e o contrato continua estrito: campo desconhecido é recusado.

### Tela final

7. Com URL, a tela final mostra um link clicável para ela, que abre em aba nova, com
   `rel="noreferrer"`.
8. A URL também é copiável, pelo `Chave` que já existe, do mesmo jeito que o caminho.
9. Sem URL, a seção do link não é renderizada, e a tela final continua funcionando com caminho,
   resumo e o botão de abrir a pasta.
10. O texto diz o que aquilo é, sem jargão: quem lê entende que é o projeto rodando.

### Projeto gerado

11. O `vite.config.js` gerado usa a porta 5273, e não a 5173.
12. Não há `strictPort`, então porta ocupada escorrega em vez de falhar.
13. Nenhum placeholder novo entra no template, e a geração continua sem `{{...}}` sobrando.

### Sempre

14. Componente nunca chama `fetch`; a URL chega pelo estado que a camada de serviços já busca.
15. CSS em CSS Modules com tokens `--forge-*`, sem cor ou espaçamento hardcodado.
16. Todo texto visível sai de `src/mensagens.js`.
17. `npm test` verde, `npm run build` sem erro e `npm run verificar:fase1` com os oito itens
    passando, no Windows.
18. Sem `console.log` esquecido e sem `TODO` sem justificativa escrita ao lado.

## 9. Edge cases conhecidos

- **Vite escorrega de porta.** É o caso que motivou tudo: a URL anunciada é a real, e é ela que vai
  para a tela.
- **Duas URLs na mesma linha.** Fica a primeira.
- **URL com cor ANSI no meio.** Já resolvido na rodada 4, que limpa a sequência antes da linha
  virar log.
- **Dev server que morre depois.** O link fica na tela apontando para porta morta. Aceitável nesta
  rodada: o `PainelMaterializacao` ao lado mostra o estado do comando.
- **Preset sem comando de longa duração**, como o `criar-site` sem dev. Sem URL, sem link.
- **Materialização antiga, de antes desta mudança.** Não existe: o estado da materialização vive só
  em memória, no mapa `emAndamento`, e some quando o Forge reinicia. Por isso `url` é obrigatória e
  anulável, e não opcional: o servidor sempre a preenche, nem que seja com `null`. Este edge case
  foi escrito errado na primeira versão da spec e corrigido na review.

## 10. Definição de "aprovado sem ressalvas"

Os dezoito critérios em sim, com `npm test` verde, `npm run build` sem erro e a prova da Fase 1
passando, e a URL vista de verdade na materialização de um projeto real, não só em teste.

## 11. Review (2026-09-08)

**Aprovado sem ressalvas.** Dezoito de dezoito critérios cobertos. `npm test` verde com 618
passando e 1 pulado, `npm run build` sem erro, e `npm run verificar:fase1` com os oito itens
passando, em Windows 11.

### Validação no produto real

Um projeto foi materializado de verdade. Nasceu na porta 5273, a URL `http://localhost:5273/`
chegou ao estado da materialização, que é o dado que a tela final transforma em link, e o endereço
respondeu HTTP 200. A prova da Fase 1 passou a conferir isso, e não só a URL lida do log.

### Corrigido durante a review

1. **Um edge case da spec estava errado.** Escrevi que "materialização antiga" ficaria sem o campo
   `url`, e daí que ele deveria tolerar ausência. Não existe materialização antiga: o estado vive
   só no mapa `emAndamento`, em memória, e some no reinício. O campo ficou obrigatório e anulável,
   que é o contrato mais estrito, e a spec foi corrigida dizendo que errou.
2. **`text-underline-offset: 3px`** virou `var(--forge-space-1)`. Três testes de contrato ficaram
   vermelhos ao adicionar o campo ao schema, o que é o comportamento certo de um schema estrito: o
   fixture foi atualizado, não o schema afrouxado.

### O que esta rodada deliberadamente não fez

Não criou capacidade própria nova. O caminho óbvio seria mandar o sistema abrir o browser, como o
bloco 8 faz com a pasta. Um link resolve, porque a interface já roda num browser, e evita promover
a dado vindo de fora o status de argumento de comando. Consequência: nada aqui depende da
ratificação do ADR-009.

### Fica para uma próxima rodada

- O link continua na tela mesmo se o dev server morrer depois. O painel ao lado mostra o estado do
  comando, então a informação existe, mas em dois lugares que podem discordar.
- `docs/09_BACKLOG/fase1-aceite.md` é relatório datado e ficou como estava, citando a porta 5173
  que valia naquela execução. Mudar seria falsificar o registro; a seção de observações passou a
  dizer que os dois itens foram fechados.
