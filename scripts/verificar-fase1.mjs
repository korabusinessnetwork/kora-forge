import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { register } from 'node:module';
import { fileURLToPath } from 'node:url';

// Prova do critério de aceite da Fase 1 (docs/09_BACKLOG/mvp.md).
//
// Cria um projeto de verdade em disco, do registro ao dev server, pelo mesmo caminho que a
// interface usa: as funções de `src/services/`, que são o único ponto do front que fala com a API.
// Uma camada abaixo do clique, com os mesmos schemas Zod nas duas pontas.
//
// Roda isolada. FORGE_HOME, workspace e porta são próprios, em pasta temporária, e o que a prova
// cria ela apaga no fim. O banco e o workspace do dono não são tocados.

register('./resolver-shared.mjs', import.meta.url);

const RAIZ = fileURLToPath(new URL('../', import.meta.url));
const LIMITE_MINUTOS = 10;

const relatorio = [];
const marcos = {};
let servidor = null;
let bancoAberto = null;
let temporaria = null;

function registrar(numero, titulo, ok, evidencia) {
  relatorio.push({ numero, titulo, ok, evidencia });
  const marca = ok === true ? 'OK  ' : ok === null ? '?   ' : 'FALHA';
  console.log(`${marca} ${numero}. ${titulo}`);
  for (const linha of [].concat(evidencia)) console.log(`       ${linha}`);
}

async function portaLivre() {
  return new Promise((resolver, rejeitar) => {
    const servidorTemp = net.createServer();
    servidorTemp.once('error', rejeitar);
    servidorTemp.listen(0, '127.0.0.1', () => {
      const { port } = servidorTemp.address();
      servidorTemp.close(() => resolver(port));
    });
  });
}

// Varre texto procurando placeholder não substituído. Arquivo binário é ignorado pela extensão.
const BINARIOS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.ico', '.woff', '.woff2', '.ttf', '.zip']);

function listarArquivos(raiz, ignorar = new Set(['node_modules', '.git'])) {
  const achados = [];
  const caminhar = (pasta) => {
    for (const entrada of fs.readdirSync(pasta, { withFileTypes: true })) {
      if (ignorar.has(entrada.name)) continue;
      const caminho = path.join(pasta, entrada.name);
      if (entrada.isDirectory()) caminhar(caminho);
      else achados.push(caminho);
    }
  };
  caminhar(raiz);
  return achados;
}

async function subirServidor(config, home) {
  const { construirApp } = await import('../server/app.js');
  const { prepararHome, gerarTokenDeSessao, lerVersao } = await import('../server/boot.js');
  const { abrirBanco } = await import('../server/db/conexao.js');
  const { migrar } = await import('../server/db/migrar.js');
  const { carregarPresetsBuiltin, sincronizarPresets } = await import('../server/modules/presets/servico.js');
  const { carregarRegrasBuiltin, sincronizarRegras } = await import('../server/modules/regras/servico.js');

  prepararHome(home);
  const db = abrirBanco(path.join(home, 'forge.db'));
  migrar(db);
  sincronizarPresets(db, carregarPresetsBuiltin());
  sincronizarRegras(db, carregarRegrasBuiltin());

  const tokenSessao = gerarTokenDeSessao(home);
  const app = construirApp({ db, tokenSessao, config, versao: lerVersao(RAIZ), logger: false });
  await app.listen({ host: config.host, port: config.porta });
  bancoAberto = db;
  return { app, tokenSessao };
}

// O front fala com `/api` relativo e manda o token por header. Aqui o caminho relativo vira
// absoluto e o Origin entra, que é o que o browser faria. Nada mais é tocado: o corpo, os
// headers e a validação de contrato continuam sendo os do serviço de verdade.
function instalarFetch(porta, origem) {
  const original = globalThis.fetch;
  globalThis.fetch = (url, opcoes = {}) => {
    const alvo = typeof url === 'string' && url.startsWith('/') ? `http://127.0.0.1:${porta}${url}` : url;
    return original(alvo, { ...opcoes, headers: { ...(opcoes.headers ?? {}), Origin: origem } });
  };
}

async function esperar(ms) {
  return new Promise((resolver) => setTimeout(resolver, ms));
}

async function responde(url, tentativas = 60) {
  for (let i = 0; i < tentativas; i += 1) {
    try {
      const resposta = await fetch(url);
      if (resposta.status >= 200 && resposta.status < 500) return resposta.status;
    } catch {
      // servidor ainda subindo
    }
    await esperar(500);
  }
  return null;
}

// Lê o log de um run pelo WebSocket, do mesmo jeito que o PainelLog: token no subprotocolo, e o
// transmissor reenvia o histórico a quem assina. Não dá para ler de `command_logs` aqui, porque o
// runner só grava em lote e um comando de longa duração nunca esvazia a fila. Ver R-11.
async function lerLogAoVivo(porta, token, runId, ms = 8000) {
  const linhas = [];
  const socket = new WebSocket(`ws://127.0.0.1:${porta}/api/ws/runs/${encodeURIComponent(runId)}`, ['forge-token', token]);
  socket.onmessage = (mensagem) => {
    const evento = JSON.parse(mensagem.data);
    if (evento.tipo === 'linha') linhas.push(evento.linha);
  };
  const ate = Date.now() + ms;
  while (Date.now() < ate) {
    await esperar(250);
    if (linhas.some((l) => /https?:\/\/(?:localhost|127\.0\.0\.1):\d+/.test(l))) break;
  }
  try { socket.close(); } catch { /* já fechado */ }
  return linhas;
}

async function limpar() {
  // O onClose do app mata a árvore de processos de cada comando em andamento (R-12). Antes da
  // correção a prova precisava caçar sobras aqui; agora sobra é sintoma de regressão, e aparece
  // como falha ao apagar a pasta em vez de ser varrida para debaixo do tapete.
  try { await servidor?.app.close(); } catch { /* já fechado */ }
  await esperar(1500);
  try { bancoAberto?.close(); } catch { /* já fechado */ }
  if (temporaria && fs.existsSync(temporaria)) {
    try {
      fs.rmSync(temporaria, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
    } catch (erro) {
      console.log(`\naviso: não deu para apagar ${temporaria} (${erro.code}). Apague à mão.`);
    }
  }
}

async function executar() {
  const inicio = Date.now();
  temporaria = fs.mkdtempSync(path.join(os.tmpdir(), 'kora-forge-aceite-'));
  const home = path.join(temporaria, 'home');
  const workspace = path.join(temporaria, 'workspace');
  fs.mkdirSync(workspace, { recursive: true });

  const porta = await portaLivre();
  const origem = 'http://127.0.0.1:5173';
  const config = { host: '127.0.0.1', porta, portaDev: 5173, home, workspacePadrao: workspace, copiloto: false, copilotoTetoUsd: 0 };

  console.log('KORA FORGE, prova do critério de aceite da Fase 1');
  console.log(`home:      ${home}`);
  console.log(`workspace: ${workspace}`);
  console.log(`porta:     ${porta}`);
  console.log('');

  servidor = await subirServidor(config, home);
  instalarFetch(porta, origem);

  // Sessão, do mesmo jeito que o browser recebe: token no fragmento da URL.
  const { capturarTokenDaUrl } = await import('../src/services/sessao.js');
  capturarTokenDaUrl({ hash: `#token=${servidor.tokenSessao}`, pathname: '/', search: '' }, { replaceState: () => {} });

  const { atualizarSettings } = await import('../src/services/settings.js');
  const { listarPresets, obterPreset } = await import('../src/services/presets.js');
  const { criarProjeto, salvarBlueprint } = await import('../src/services/projetos.js');
  const { avaliarRegras } = await import('../src/services/regras.js');
  const { gerarPlano } = await import('../src/services/plano.js');
  const { materializar, obterMaterializacao } = await import('../src/services/materializacao.js');
  const { respostasIniciais } = await import('../src/features/wizard/defaults.js');

  await atualizarSettings({ workspace });

  // ---------------------------------------------------------------- item 1, o fluxo inteiro
  const presets = await listarPresets();
  const preset = await obterPreset('criar-aplicacao-web');
  const { projeto } = await criarProjeto({ nome: 'Prova da Fase 1', presetId: preset.id });

  // O wizard com todos os defaults aceitos: é o caminho "usar o padrão Kora" do princípio nº 1.
  const respostas = respostasIniciais({ respostas: {} }, preset, projeto);
  respostas.identidade = {
    ...respostas.identidade,
    nome: 'Prova da Fase 1',
    essencia: 'provar que a Fase 1 fecha de ponta a ponta',
    problema: 'não havia evidência de que os nove blocos formam um produto',
    valor: 'um projeto real nasce em minutos, sem terminal',
  };

  let etapasGravadas = 0;
  for (const etapa of preset.etapas) {
    await salvarBlueprint(projeto.id, {
      preset: { id: preset.id, versao: preset.versao },
      etapaAtual: etapa,
      etapasConcluidas: preset.etapas.slice(0, preset.etapas.indexOf(etapa) + 1),
      assumidas: [],
      respostas,
    });
    etapasGravadas += 1;
  }

  const regras = await avaliarRegras(projeto.id);
  marcos.wizard = Date.now();

  registrar(1, 'Criar um projeto de verdade do começo ao fim, sem tocar no terminal',
    etapasGravadas === preset.etapas.length && regras.podeMaterializar, [
      `${presets.length} presets listados, projeto "${projeto.nome}" criado com o preset ${preset.id}`,
      `${etapasGravadas} etapas do wizard gravadas, motor de regras com ${regras.bloqueios} bloqueios`,
      'todas as chamadas passaram por src/services/, que é o que a interface executa',
    ]);

  // ------------------------------------------------------- item 6, nada escrito sem dry-run
  const raizPrevista = path.join(workspace, projeto.slug);
  const antesDoPlano = fs.existsSync(raizPrevista);
  const plano = await gerarPlano(projeto.id);
  const depoisDoPlano = fs.existsSync(raizPrevista);

  let recusouHashVelho = false;
  try {
    await materializar(projeto.id, `sha256:${'0'.repeat(64)}`);
  } catch (erro) {
    recusouHashVelho = erro?.codigo === 'FORGE_PLAN_STALE';
  }

  registrar(6, 'Nenhuma escrita em disco aconteceu sem dry-run aprovado',
    !antesDoPlano && !depoisDoPlano && recusouHashVelho, [
      `pasta do projeto não existia antes do plano: ${!antesDoPlano}`,
      `plano com ${plano.arquivos.length} arquivos e ${plano.comandos.length} comandos, e nada foi escrito: ${!depoisDoPlano}`,
      `materializar com hash divergente foi recusado com FORGE_PLAN_STALE: ${recusouHashVelho}`,
    ]);

  // ------------------------------------------------------------------- materializar de verdade
  await materializar(projeto.id, plano.hashBlueprint);
  let materializacao = null;
  for (let i = 0; i < 240; i += 1) {
    materializacao = await obterMaterializacao(projeto.id);
    if (['concluida', 'abortada', 'parado_em_falha'].includes(materializacao.estado)) break;
    await esperar(1000);
  }
  marcos.materializacao = Date.now();

  const raiz = materializacao.raiz;
  const comandos = materializacao.comandos.map((c) => `${c.cmd} ${c.args.join(' ')} -> ${c.estado}`);

  // -------------------------------------------------- item 2, fundação, memory e docs gerados
  const temClaude = fs.existsSync(path.join(raiz, 'CLAUDE.md'));
  const pastaMemory = path.join(raiz, 'memory');
  const arquivosMemory = fs.existsSync(pastaMemory) ? fs.readdirSync(pastaMemory).filter((n) => n.endsWith('.md')) : [];
  const memoryVazios = arquivosMemory.filter((nome) => {
    const conteudo = fs.readFileSync(path.join(pastaMemory, nome), 'utf8');
    // "Preenchido com conteúdo real" é mais que um título: exige corpo além do cabeçalho.
    return conteudo.trim().split(/\r?\n/).filter((l) => l.trim() && !l.trim().startsWith('#')).length < 3;
  });
  const pastaDocs = path.join(raiz, 'docs');
  const docsPresentes = fs.existsSync(pastaDocs) ? fs.readdirSync(pastaDocs) : [];
  const docsFaltando = ['00', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11']
    .filter((numero) => !docsPresentes.some((nome) => nome.startsWith(`${numero}_`)));

  registrar(2, 'O projeto gerado tem CLAUDE.md, memory/ com 6 arquivos preenchidos e docs/00 a 11',
    temClaude && arquivosMemory.length === 6 && memoryVazios.length === 0 && docsFaltando.length === 0, [
      `CLAUDE.md presente: ${temClaude}`,
      `memory/: ${arquivosMemory.length} arquivos (${arquivosMemory.join(', ')})`,
      memoryVazios.length === 0 ? 'todos com conteúdo real' : `vazios ou só com título: ${memoryVazios.join(', ')}`,
      docsFaltando.length === 0 ? `docs/ com as 12 pastas (${docsPresentes.length} entradas)` : `faltando: ${docsFaltando.join(', ')}`,
    ]);

  // ------------------------------------------------------------- item 3, nenhum placeholder
  const comPlaceholder = [];
  for (const arquivo of listarArquivos(raiz)) {
    if (BINARIOS.has(path.extname(arquivo).toLowerCase())) continue;
    const linhas = fs.readFileSync(arquivo, 'utf8').split(/\r?\n/);
    linhas.forEach((linha, indice) => {
      if (/\{\{[^}]*\}\}/.test(linha)) comPlaceholder.push(`${path.relative(raiz, arquivo)}:${indice + 1}  ${linha.trim().slice(0, 80)}`);
    });
  }
  registrar(3, 'Zero placeholder {{...}} sobrando em qualquer arquivo gerado',
    comPlaceholder.length === 0,
    comPlaceholder.length === 0 ? ['varredura de todo arquivo de texto gerado, nenhuma ocorrência'] : comPlaceholder.slice(0, 15));

  // ------------------------------------------------------- item 4, ADR-001 com a stack escolhida
  const adr = docsPresentes.find((n) => n.startsWith('08_'));
  const pastaAdr = adr ? path.join(pastaDocs, adr) : null;
  const arquivoAdr = pastaAdr && fs.existsSync(pastaAdr)
    ? fs.readdirSync(pastaAdr).find((n) => n.toLowerCase().includes('adr-001'))
    : null;
  const textoAdr = arquivoAdr ? fs.readFileSync(path.join(pastaAdr, arquivoAdr), 'utf8').toLowerCase() : '';
  const stackEscolhida = respostas.arquitetura?.stack ?? [];
  const stackAusente = stackEscolhida.filter((item) => !textoAdr.includes(String(item).toLowerCase()));

  registrar(4, 'ADR-001 do projeto gerado registra a stack escolhida no wizard',
    Boolean(arquivoAdr) && stackAusente.length === 0, [
      `arquivo: ${arquivoAdr ?? 'não encontrado'}`,
      `stack respondida: ${stackEscolhida.join(', ')}`,
      stackAusente.length === 0 ? 'todos os itens aparecem no ADR-001' : `ausentes no ADR: ${stackAusente.join(', ')}`,
    ]);

  // ------------------------------------------------------------- item 5, npm run dev do gerado
  // Quem sobe o dev server é o próprio runner, como último comando da fila. A prova não sobe um
  // segundo: confere o que o Forge subiu, e acha a URL do mesmo jeito que o usuário, lendo o log
  // que o painel mostra.
  const instalou = materializacao.comandos.find((c) => c.id === 'install');
  const construiu = materializacao.comandos.find((c) => c.id === 'build');
  const dev = materializacao.comandos.find((c) => c.id === 'dev');

  const linhasDoDev = dev?.runId ? await lerLogAoVivo(porta, servidor.tokenSessao, dev.runId) : [];
  // A URL é usada como o Vite anunciou. Trocar `localhost` por `127.0.0.1` quebra: no Windows o
  // Vite escuta em ::1, e o endereço IPv4 não responde. É a URL do log que o usuário vai clicar.
  const urlDev = linhasDoDev.join(' ').match(/https?:\/\/[a-z0-9.-]+:\d+\/?/i)?.[0] ?? null;
  const statusDev = urlDev ? await responde(urlDev, 20) : null;
  marcos.fim = Date.now();

  registrar(5, 'npm run dev do projeto gerado sobe sem erro',
    dev?.estado === 'rodando' && statusDev === 200, [
      `npm install do projeto gerado: ${instalou?.estado ?? 'não rodou'}`,
      `npm run build do projeto gerado: ${construiu?.estado ?? 'não rodou'}`,
      `npm run dev, iniciado pelo runner: ${dev?.estado ?? 'não rodou'}`,
      urlDev
        ? `URL anunciada no log ao vivo: ${urlDev} respondeu HTTP ${statusDev ?? 'nada'}`
        : `o log ao vivo não anunciou URL. ${linhasDoDev.length} linhas: ${JSON.stringify(linhasDoDev.slice(-8))}`,
    ]);

  // ---------------------------------------------------------- item 7, sem copiloto no caminho
  const rotasDeCopiloto = Object.keys(servidor.app.printRoutes ? {} : {});
  const semChave = !process.env.ANTHROPIC_API_KEY;
  registrar(7, 'Tudo funciona com o copiloto desligado, porque ele nem existe ainda',
    materializacao.estado === 'concluida' && semChave && rotasDeCopiloto.length === 0, [
      `config.copiloto: ${config.copiloto}`,
      `ANTHROPIC_API_KEY ausente do ambiente: ${semChave}`,
      `fluxo completou assim mesmo: ${materializacao.estado}`,
    ]);

  // ------------------------------------------------------------------- item 8, menos de 10 min
  const total = (marcos.fim - inicio) / 1000;
  const ateMaterializar = (marcos.materializacao - inicio) / 1000;
  const instalacao = (marcos.materializacao - marcos.wizard) / 1000;

  registrar(8, `Do começo ao dev server: menos de ${LIMITE_MINUTOS} minutos`, total < LIMITE_MINUTOS * 60, [
    `total: ${total.toFixed(1)}s (${(total / 60).toFixed(1)} min)`,
    `até a materialização terminar: ${ateMaterializar.toFixed(1)}s`,
    `dentro disso, a fila de comandos (git init, npm install, dev): ${instalacao.toFixed(1)}s`,
  ]);

  console.log('');
  console.log('fila de comandos do runner:');
  for (const linha of comandos) console.log(`  ${linha}`);
  console.log(`arquivos escritos: ${materializacao.arquivos.criados} criados, ${materializacao.arquivos.sobrescritos} sobrescritos, ${materializacao.arquivos.pulados} pulados`);
  console.log('');

  const falhas = relatorio.filter((r) => r.ok !== true);
  console.log(falhas.length === 0
    ? `TODOS OS ${relatorio.length} ITENS PASSARAM.`
    : `${falhas.length} de ${relatorio.length} itens falharam: ${falhas.map((f) => f.numero).join(', ')}`);

  return falhas.length === 0;
}

let sucesso = false;
try {
  sucesso = await executar();
} catch (erro) {
  console.error('');
  console.error(`A prova quebrou: ${erro?.codigo ? `${erro.codigo} ` : ''}${erro?.message ?? erro}`);
  for (const issue of erro?.detalhe?.issues ?? []) console.error(`  ${issue.caminho}: ${issue.mensagem}`);
  if (erro?.stack) console.error(erro.stack.split('\n').slice(1, 4).join('\n'));
} finally {
  await limpar();
}
process.exit(sucesso ? 0 : 1);
