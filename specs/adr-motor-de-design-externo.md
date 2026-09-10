# Motor de design externo, contrato, mapa por preset e riscos

> Material de apoio do **ADR-011**. Este documento não decide nada, ele detalha o que o ADR decide.
> Nenhuma linha aqui foi implementada. Enquanto o ADR estiver **Proposto**, isto é desenho.

---

## 1. A interface `MotorDeDesign`

Vive em `server/services/motor-de-design/`. Um arquivo por implementação, `index.js` só resolve qual
usar a partir de `settings`. Nome de domínio em português, padrão técnico em inglês, como manda o
CLAUDE.md.

```js
// server/services/motor-de-design/index.js
/**
 * @typedef {object} MotorDeDesign
 * @property {string} id                       'nenhum' | 'open-design'
 * @property {() => Promise<Disponibilidade>}  verificarDisponibilidade
 * @property {(p: PedidoDeDesign) => Promise<ResultadoDeDesign>} gerarArtefatos
 * @property {(execucaoId: string) => Promise<void>} cancelarGeracao
 */
```

Quatro métodos, e não mais. Cada um a seguir.

### 1.1 `verificarDisponibilidade()`

Não recebe nada. Nunca lança. É chamado na etapa Design do wizard e de novo antes de gerar.

```js
/**
 * @typedef {object} Disponibilidade
 * @property {boolean} disponivel
 * @property {string|null} versao          '0.22.1', ou null se não detectado
 * @property {boolean} versaoSuportada     versao dentro da faixa declarada
 * @property {string} faixaSuportada       '>=0.22.0 <0.23.0'
 * @property {string|null} motivo          código de erro quando indisponível
 * @property {string} mensagem             texto humano para a tela
 */
```

Regra: **fora da faixa suportada é indisponível**, não é aviso. O ADR-011 diz recusar em vez de
tentar e quebrar. `faixaSuportada` fica no código, não em settings, porque é conhecimento do adapter.

### 1.2 `gerarArtefatos(pedido)`

O único método que escreve em disco e o único que custa dinheiro.

```js
/**
 * @typedef {object} PedidoDeDesign
 * @property {string} projetoId
 * @property {string} raizDoProjeto        caminho absoluto, já validado contra o workspace
 * @property {string} handoffMarkdown      conteúdo de design/DESIGN.md, gerado pelo Forge
 * @property {object} tokens               o mesmo objeto que alimenta o tokens.css
 * @property {'landing'|'telas'|'apresentacao'} peca
 * @property {Array<'html'|'pdf'>} formatos
 * @property {number} timeoutMs            teto duro, default 600000
 * @property {boolean} dryRun              true lista o que escreveria, não escreve nada
 */

/**
 * @typedef {object} ResultadoDeDesign
 * @property {string} execucaoId
 * @property {'ok'|'cancelado'|'falhou'} status
 * @property {Array<{ caminho: string, bytes: number, formato: string }>} artefatos
 * @property {object} manifesto            o que vai para design/gerado/MANIFESTO.json
 * @property {{ usd: number, tokensEntrada: number, tokensSaida: number }} custo
 * @property {number} duracaoMs
 */
```

Contratos que o método precisa honrar:

- **`dryRun` primeiro, sempre.** Princípio nº 1 e S-08. A tela mostra o que vai ser escrito, o
  usuário confirma, só então a escrita acontece.
- **Toda escrita passa pela validação de caminho já existente.** `raizDoProjeto` chega validado, e o
  adapter valida de novo cada artefato antes de gravar. S-03.
- **Nunca `shell: true`.** O daemon do Open Design sobe por `spawn` com array de argumentos, S-04.
- **Progresso por WebSocket**, no mesmo canal do runner, com eventos `design.geracao.iniciada`,
  `design.geracao.progrediu`, `design.geracao.concluida`, `design.geracao.falhou`.
- **O custo é registrado em `copilot_calls`** e respeita o teto de C-02. Teto estourado, o método
  nem começa.

### 1.3 `cancelarGeracao(execucaoId)`

Mata a árvore de processos, como o R-12 já resolveu para o runner. Uma geração pode durar minutos e
o usuário precisa poder desistir sem fechar o Forge.

### 1.4 `MotorDeDesignNenhum`, o padrão

```js
export const motorNenhum = {
  id: 'nenhum',
  verificarDisponibilidade: async () => ({
    disponivel: false,
    versao: null,
    versaoSuportada: false,
    faixaSuportada: '',
    motivo: 'FORGE_DESIGN_ENGINE_OFF',
    mensagem: 'Nenhum motor de design externo está ligado. O handoff é gerado do mesmo jeito.',
  }),
  gerarArtefatos: async () => { throw erro('FORGE_DESIGN_ENGINE_OFF'); },
  cancelarGeracao: async () => {},
};
```

`gerarArtefatos` lançar aqui **não é um buraco**: a UI nunca chega a chamar, porque
`verificarDisponibilidade` já devolveu `disponivel: false` e o botão não existe. O lançamento é a
rede de segurança para chamada indevida vinda do servidor.

### 1.5 Erros

Entram em `shared/erros.js`, no padrão que já existe.

| Código | Status | Mensagem |
|---|---|---|
| `FORGE_DESIGN_ENGINE_OFF` | 403 | Motor de design externo desligado. |
| `FORGE_DESIGN_ENGINE_MISSING` | 409 | O motor de design não está instalado nesta máquina. |
| `FORGE_DESIGN_ENGINE_INCOMPATIVEL` | 409 | Versão do motor de design fora da faixa suportada. |
| `FORGE_DESIGN_TIMEOUT` | 504 | A geração passou do tempo limite e foi interrompida. |
| `FORGE_DESIGN_RUN_FAILED` | 500 | A geração terminou com erro. |
| `FORGE_DESIGN_ARTEFATO_INVALIDO` | 422 | O motor devolveu artefato fora do contrato. |

Reaproveitam-se, sem código novo: `FORGE_PATH_FORBIDDEN` para artefato fora da raiz e
`FORGE_BUDGET_EXCEEDED` para teto de custo.

---

## 2. Formato de handoff

**O handoff é do Forge, não do Open Design.** Ele é gerado por template versionado a partir do
`design_documents` do projeto, é determinístico, e existe com o motor ligado ou desligado. Essa é a
parte da integração que sobrevive à remoção dela.

### 2.1 `design/DESIGN.md`

Markdown, nove seções, porque é o formato que o Open Design espera ler como contrato de marca e é
igualmente legível pelo Claude Code depois. Todo o conteúdo sai do blueprint, nada é digitado duas
vezes, coerente com o Princípio nº 1.

| Seção | Origem no Forge |
|---|---|
| Identidade | `memory/identity.md` do projeto gerado, etapa Identidade |
| Público e tom de voz | etapa Identidade |
| Cores | tokens `--cor-*` |
| Tipografia | tokens `--fonte-*` |
| Espaçamento e raio | tokens `--espaco-*`, `--raio-*` |
| Componentes disponíveis | catálogo fechado do Studio, ADR-009 |
| Páginas e rotas | `paginas_json`, quando existir |
| O que não fazer | derivado do preset, ex.: "sem marca hardcodada fora dos tokens" |
| Restrições técnicas | stack e `definition_of_done` do preset |

A seção **"O que não fazer"** carrega a regra white-label: nenhum template pode conter marca, cor,
nome ou regra de cliente hardcodada. Ela vai escrita no handoff justamente porque quem gera do outro
lado é um LLM, e o que não está escrito não é obedecido.

### 2.2 `design/design.tokens.json`

Espelho legível por máquina do mesmo documento de tokens. Existe para o motor externo não precisar
fazer parsing de Markdown, e para o `MANIFESTO.json` poder guardar o hash dele.

### 2.3 Onde os artefatos caem

```
<projeto-gerado>/
  design/
    DESIGN.md                ← handoff, determinístico, entrega do Forge
    design.tokens.json       ← idem
    gerado/                  ← saída do motor externo, só existe se ele rodou
      index.html
      landing.pdf
      MANIFESTO.json
```

Quatro regras sobre essa pasta:

1. **`design/gerado/` nunca entra no build.** Não é importado, não é servido, não é referenciado por
   `package.json`. É referência visual. Isso é o que mantém E-04 de pé: apagar o Forge, ou apagar
   essa pasta, não quebra o projeto.
2. **O `MANIFESTO.json` é obrigatório** e registra motor, versão do motor, modelo usado, hash do
   `DESIGN.md` que originou, data, duração e custo. Sem ele o artefato é órfão e ninguém sabe de onde
   veio nem com que insumo.
3. **O Forge nunca lê `design/gerado/` de volta** para dentro do documento de design. Mão única,
   ADR-005 e E-02.
4. **O `.gitignore` do projeto gerado não ignora essa pasta.** O artefato é entregável do usuário, e
   a decisão de versionar é dele.

### 2.4 Fallback quando o Open Design não está instalado

Não existe caminho de erro aqui, e é de propósito.

| Situação | O que acontece |
|---|---|
| Motor desligado nas Configurações, que é o padrão | `design/DESIGN.md` e `design.tokens.json` são gerados. `gerado/` não existe. A tela final mostra um card discreto: "Handoff de design pronto em `design/DESIGN.md`". Zero menção a motor externo, porque o usuário não pediu |
| Motor ligado, mas não instalado | Mesmo resultado, mais um card: "O motor de design não foi encontrado nesta máquina. O handoff está pronto e você pode gerar depois." Com o comando de instalação copiável. Nunca bloqueia a materialização |
| Motor ligado, versão fora da faixa | Igual ao anterior, dizendo a versão encontrada e a esperada |
| Motor ligado e disponível | Card com botão. **Gerar é uma ação separada, depois da materialização**, nunca dentro dela. Materializar projeto não pode ficar refém de uma chamada de LLM |
| Geração falha no meio | Artefatos parciais são descartados, `design/gerado/` não fica pela metade, e o handoff continua lá. A materialização já terminou, então nada regride |

A linha que amarra tudo: **`definition_of_done` de nenhum preset menciona artefato gerado por motor
externo.** Se mencionasse, o preset deixaria de fechar com o adapter desligado, e a condição 1 do
ADR-011 estaria quebrada.

---

## 3. Mapa por preset, com o adapter ligado

### 3.1 Criar Site

**O caso forte. É por causa dele que a porta fica aberta.**

- Peça: `landing`. Formatos: HTML e PDF.
- Por que encaixa: o preset já não tem auth nem banco, e o `definition_of_done` dele é quase todo
  design, SEO e performance. Uma landing renderizada mais um PDF é exatamente o que o dono do
  projeto mostra para o cliente antes de qualquer código.
- O que **não** muda: `arvore`, `regras_extras`, `comandos`, `requisitos` e `definition_of_done`
  ficam idênticos. O item "tokens de design vindos do Studio ou do tema default" continua sendo
  satisfeito pelo Studio, não pelo motor externo.
- Custo estimado por geração: uma execução de agente, algo entre alguns centavos e poucos dólares
  conforme o modelo. Contabilizado em `copilot_calls`.

### 3.2 Criar Aplicação Web

**Caso médio, e mais estreito do que parece.**

- Peça: `telas` ou `apresentacao`. Formatos: HTML e PDF.
- O valor está em telas-chave como referência visual, e num PDF de apresentação do produto.
- **Limite explícito**: o motor não encosta em `multi_tenant`, `auth`, RLS ou camada de serviços.
  Ele produz referência de interface. As `regras_extras` de segurança do preset seguem sendo
  verificadas pelo motor de regras do Forge, e nada do que o LLM devolve entra nessa conta.
- Risco próprio: gerar telas bonitas cria a tentação de copiar o HTML para dentro de `src/`. O
  `MANIFESTO.json` e a regra de "referência, não fonte" existem para tornar isso uma escolha
  consciente do dono, não um acidente.

### 3.3 Criar Aplicação Local

**Caso fraco. Recomendação: nasce desligado, e continua desligado por padrão mesmo se o adapter for
aprovado.**

- O preset tem `offline_first: true` e carrega `arq-offline-first`. O motor externo exige rede para
  o provedor de LLM, salvo com Ollama local, o que troca o custo em dólar por um custo de máquina
  bem maior.
- É o preset que o próprio Forge usaria, e o Forge tem Studio próprio. Gerar referência visual por
  LLM para uma ferramenta cujo design system já está decidido é trabalho para pouco retorno.
- Se ligado mesmo assim: peça `telas`, formato HTML apenas, e a tela precisa dizer que a geração vai
  usar a rede, contrariando o espírito do preset. Aviso, não bloqueio, porque a decisão é do dono.

### 3.4 Resumo

| Preset | Peça | Formatos | Padrão | Valor |
|---|---|---|---|---|
| Criar Site | landing | HTML, PDF | ligado, se o adapter for aprovado | alto |
| Criar Aplicação Web | telas, apresentacao | HTML, PDF | desligado | médio |
| Criar Aplicação Local | telas | HTML | desligado, com aviso de rede | baixo |

---

## 4. Riscos

Severidade é o efeito no Forge se o risco se materializar, não a probabilidade.

| # | Risco | Severidade | Evidência | Mitigação |
|---|---|---|---|---|
| **RD-01** | **API instável em 0.x.** A 0.19.2 introduziu runtime de design system com CLI e API, e a 0.20.0 reverteu tudo. Ritmo semanal, 0.19.0 a 0.22.1 em três semanas, sem garantia de estabilidade declarada | Alta | Notas de release | Faixa de versão verificada em toda chamada, recusa explícita fora dela, e o adapter isolado num arquivo só |
| **RD-02** | **Documentação atrás do código.** `spec.md` declara que antecede os runtimes implementados; `install-guide.md` cobre Linux, macOS e Docker e **não documenta Windows nem a CLI `od`**; `architecture.md` delega o contrato de caminho de dados para outro arquivo | Alta | Os três arquivos | O spike executado é a única fonte confiável. Nenhuma linha de adapter antes dele |
| **RD-03** | **Licença dos artefatos gerados.** O código é Apache-2.0, mas templates embutidos carregam licença própria (MIT em `guizang-ppt` e `html-ppt`) e podem acabar inlined no HTML exportado. Somado a isso, a saída é produto de um LLM e carrega os termos do provedor | Média | README, seção de licença | Registrar no `MANIFESTO.json` o template e o modelo usados. Verificar a licença efetiva do HTML exportado **no spike**, antes de aprovar |
| **RD-04** | **Custo BYOK.** Cada geração é uma execução de agente. Sem teto, um usuário curioso queima o orçamento em uma tarde | Média | Modelo de execução | Mesmo teto e mesmo livro-caixa do copiloto, C-02. Teto estourado, o botão não aparece |
| **RD-05** | **Tempo de execução.** A release 0.20.2 se chama "Production Exports, Under a Minute", o que sugere que exportar já foi mais lento que um minuto. A geração em si é agente e não tem teto natural | Média | Notas de release | `timeoutMs` com default de 10 minutos, cancelamento que mata a árvore, e geração como ação separada da materialização |
| **RD-06** | **Peso.** App empacotado, Chrome headless e FFmpeg para MP4. Rodar da fonte exige Node ~24 e pnpm 10.33.x, contra o Node 20 do Forge, esbarrando em T-03 | Média | README, requisitos | Só app empacotado de Windows ou Docker. Build da fonte nunca entra no fluxo do Forge. MP4 fora de escopo na primeira versão |
| **RD-07** | **Segurança de subir um serviço local.** Um segundo daemon privilegiado, Express e SQLite, em `127.0.0.1:7456`, com `/api/proxy/*` para provedores externos e chave de API dentro. `OD_BIND_HOST` é configurável e pode ser afastado do localhost. Nada disso é coberto por S-01 a S-08 | **Alta** | README e arquitetura | Restrições próprias em `memory/restrictions.md` antes do código: `OD_BIND_HOST` obrigatoriamente `127.0.0.1`, verificado a cada subida; o cofre do Forge **nunca** alimenta o Open Design; o daemon só sobe sob demanda e desce ao fim |
| **RD-08** | **Deriva comercial.** A 0.21.1 se chama "Community First: No Login Required", implicando que login era exigido. A 0.20.1 lança plano pago. A fronteira entre open source e produto já se moveu | Média | Notas de release | Gatilho de reversão automática escrito no ADR-011: exigir conta para gerar localmente derruba a integração |
| **RD-09** | **Prompt injection pela volta.** Artefato em `design/gerado/` é conteúdo produzido por um LLM. Se algum dia alimentar o copiloto do Forge, é superfície de ataque | Baixa | S-07 | Conteúdo de `design/gerado/` é **dado, nunca instrução**, delimitado como não confiável |
| **RD-10** | **Contaminação de determinismo.** Um artefato não reprodutível dentro de um produto que promete que o mesmo blueprint gera o mesmo projeto | Média | Princípio nº 2 | A saída vive isolada, é declarada referência, e o `MANIFESTO.json` deixa a proveniência explícita. O que o Forge gera continua sendo 100% determinístico |

---

## 5. Critério para promover a decisão

O ADR-011 sai de **Proposto** para **Aceito** quando, e só quando:

- [ ] O spike de `spikes/open-design/SPIKE.md` for **executado no Windows**, com tempos e saídas reais
- [ ] A instalação no Windows for confirmada sem build da fonte
- [ ] Uma landing page for gerada a partir de um `DESIGN.md` do Forge, e exportada em HTML e PDF
- [ ] A licença efetiva do HTML exportado for verificada, RD-03
- [ ] O custo real de uma geração for medido, RD-04
- [ ] As restrições de RD-07 entrarem em `memory/restrictions.md`
- [ ] A faixa de versão suportada for fixada contra uma versão testada de verdade

Enquanto qualquer item estiver aberto, **não se escreve adapter**. O que dá para escrever antes, e é
ganho puro, é o `DESIGN.md` e o `design.tokens.json`: eles são do Forge, são determinísticos e valem
sozinhos.
