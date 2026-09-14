import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { spawnSync } from 'node:child_process';
import { register } from 'node:module';
import { fileURLToPath } from 'node:url';

// Prova do critério de aceite da Fase 2 (docs/09_BACKLOG/fase2.md).
//
// Mesmo desenho da prova da Fase 1: servidor de verdade, isolado em pasta temporária, e todas as
// chamadas pelas funções de `src/services/`, que são o que a interface executa. Aqui o projeto
// passa pelo Studio: tokens trocados, páginas com regiões e componentes do catálogo, etapa Design
// com o desenho escolhido, e depois materialização real, `npm run build` e dev server.
//
// O que a prova cria ela apaga no fim. O banco e o workspace do dono não são tocados.

register('./resolver-shared.mjs', import.meta.url);

const RAIZ = fileURLToPath(new URL('../', import.meta.url));
const LIMITE_MINUTOS = 15;
const ACENTO = '#d9480f';
const FUNDO_ESCURO = '#101418';

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

function instalarFetch(porta, origem) {
  const original = globalThis.fetch;
  globalThis.fetch = (url, opcoes = {}) => {
    const alvo = typeof url === 'string' && url.startsWith('/') ? `http://127.0.0.1:${porta}${url}` : url;
    return original(alvo, { ...opcoes, headers: { ...(opcoes.headers ?? {}), Origin: origem } });
  };
}

const esperar = (ms) => new Promise((resolver) => setTimeout(resolver, ms));

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

const no = (id, tipo, props = {}, filhos = []) => ({ id, tipo, props, filhos });

// O desenho de um site simples de duas páginas, só com itens do catálogo.
function desenho(tokensPadrao) {
  return {
    catalogo: { versao: 1 },
    tokens: {
      ...tokensPadrao,
      cor: { ...tokensPadrao.cor, acento: ACENTO },
      corEscuro: { ...tokensPadrao.corEscuro, fundo: FUNDO_ESCURO },
    },
    paginas: [
      {
        id: 'inicio',
        nome: 'Início',
        rota: '/',
        regioes: [
          no('topo', 'cabecalho', {}, [no('marca', 'titulo', { texto: 'Prova da Fase 2', nivel: '1' })]),
          no('chamada', 'secao', { espacamento: 'amplo' }, [
            no('titulo-chamada', 'titulo', { texto: 'Desenhado no Studio' }),
            no('texto-chamada', 'texto', { conteudo: 'Tokens e páginas saem do desenho, por template.' }),
            no('acao', 'botao', { texto: 'Começar', variante: 'primario' }),
          ]),
          no('base', 'rodape', {}, [no('texto-base', 'texto', { conteudo: 'Rodapé' })]),
        ],
      },
      {
        id: 'contato',
        nome: 'Contato',
        rota: '/contato',
        regioes: [no('formulario', 'secao', {}, [no('nome', 'campo', { rotulo: 'Nome', microtexto: 'Como te chamamos.' })])],
      },
    ],
  };
}

async function executar() {
  const inicio = Date.now();
  temporaria = fs.mkdtempSync(path.join(os.tmpdir(), 'kora-forge-aceite2-'));
  const home = path.join(temporaria, 'home');
  const workspace = path.join(temporaria, 'workspace');
  fs.mkdirSync(workspace, { recursive: true });

  const porta = await portaLivre();
  const origem = 'http://127.0.0.1:5173';
  const config = { host: '127.0.0.1', porta, portaDev: 5173, home, workspacePadrao: workspace, copiloto: false, copilotoTetoUsd: 0 };

  console.log('KORA FORGE, prova do critério de aceite da Fase 2');
  console.log(`home:      ${home}`);
  console.log(`workspace: ${workspace}`);
  console.log(`porta:     ${porta}`);
  console.log('');

  servidor = await subirServidor(config, home);
  instalarFetch(porta, origem);

  const { capturarTokenDaUrl } = await import('../src/services/sessao.js');
  capturarTokenDaUrl({ hash: `#token=${servidor.tokenSessao}`, pathname: '/', search: '' }, { replaceState: () => {} });

  const { atualizarSettings } = await import('../src/services/settings.js');
  const { obterPreset } = await import('../src/services/presets.js');
  const { criarProjeto, salvarBlueprint } = await import('../src/services/projetos.js');
  const { avaliarRegras } = await import('../src/services/regras.js');
  const { gerarPlano } = await import('../src/services/plano.js');
  const { salvarDesign } = await import('../src/services/design.js');
  const { obterCatalogo } = await import('../src/services/catalogo.js');
  const { materializar, obterMaterializacao } = await import('../src/services/materializacao.js');
  const { respostasIniciais } = await import('../src/features/wizard/defaults.js');
  const { TOKENS_PADRAO } = await import('../shared/schemas/design.js');

  await atualizarSettings({ workspace });

  // ------------------------------------------------ item 1, criar, desenhar e materializar
  const preset = await obterPreset('criar-site');
  const { projeto } = await criarProjeto({ nome: 'Prova da Fase 2', presetId: preset.id });
  const respostas = respostasIniciais({ respostas: {} }, preset, projeto);
  respostas.identidade = {
    ...respostas.identidade,
    nome: 'Prova da Fase 2',
    essencia: 'provar que o Studio vira projeto de verdade',
    problema: 'sem prova, desenho e geração podem sair de sincronia',
    valor: 'o projeto nasce com o desenho, sem terminal',
  };

  const documento = desenho(TOKENS_PADRAO);
  const salvo = await salvarDesign(projeto.id, documento);

  // Etapa Design concluída é "usar o meu desenho do Studio" (bloco 5).
  for (const etapa of preset.etapas) {
    await salvarBlueprint(projeto.id, {
      preset: { id: preset.id, versao: preset.versao },
      etapaAtual: etapa,
      etapasConcluidas: preset.etapas.slice(0, preset.etapas.indexOf(etapa) + 1),
      assumidas: [],
      respostas,
    });
  }
  const regras = await avaliarRegras(projeto.id);
  const plano = await gerarPlano(projeto.id);
  marcos.plano = Date.now();

  await materializar(projeto.id, plano.hashBlueprint);
  let materializacao = null;
  for (let i = 0; i < 300; i += 1) {
    materializacao = await obterMaterializacao(projeto.id);
    if (['concluida', 'abortada', 'parado_em_falha'].includes(materializacao.estado)) break;
    await esperar(1000);
  }
  marcos.materializacao = Date.now();
  const raiz = materializacao.raiz;

  registrar(1, 'Criar um projeto, desenhar no Studio e materializar, sem tocar no terminal',
    salvo?.versao >= 1 && regras.podeMaterializar && materializacao.estado === 'concluida', [
      `projeto "${projeto.nome}" com o preset ${preset.id}, design salvo na versão ${salvo?.versao}`,
      `${documento.paginas.length} páginas desenhadas, etapa Design concluída, ${regras.bloqueios} bloqueios`,
      `plano com ${plano.arquivos.length} arquivos e ${plano.pendencias.length} pendências (${plano.pendencias.map((p) => p.tipo).join(', ') || 'nenhuma'}), materialização: ${materializacao.estado}`,
    ]);

  // --------------------------------------------------- item 2, tokens.css com os valores do Studio
  const arquivoTokens = path.join(raiz, 'src/styles/tokens.css');
  const tokensCss = fs.existsSync(arquivoTokens) ? fs.readFileSync(arquivoTokens, 'utf8') : '';
  const blocoEscuro = tokensCss.slice(tokensCss.indexOf('prefers-color-scheme: dark'));
  const semPlaceholder = !/\{\{/.test(tokensCss);
  registrar(2, 'O tokens.css do projeto gerado tem os valores escolhidos no Studio, não os do template',
    tokensCss.includes(`--cor-acento: ${ACENTO};`) && blocoEscuro.includes(`--cor-fundo: ${FUNDO_ESCURO};`) && !tokensCss.includes(`--cor-acento: ${TOKENS_PADRAO.cor.acento};`) && semPlaceholder, [
      `--cor-acento: ${ACENTO} no disco: ${tokensCss.includes(`--cor-acento: ${ACENTO};`)}`,
      `--cor-fundo: ${FUNDO_ESCURO} dentro do bloco escuro: ${blocoEscuro.includes(`--cor-fundo: ${FUNDO_ESCURO};`)}`,
      `nenhum placeholder sobrando: ${semPlaceholder}`,
    ]);

  // ----------------------------------------------------- item 3, cada página vira rota e arquivo
  const lerSeExiste = (relativo) => (fs.existsSync(path.join(raiz, relativo)) ? fs.readFileSync(path.join(raiz, relativo), 'utf8') : null);
  const app = lerSeExiste('src/App.jsx') ?? '';
  const inicioJsx = lerSeExiste('src/paginas/PaginaInicio.jsx') ?? '';
  const contatoJsx = lerSeExiste('src/paginas/PaginaContato.jsx') ?? '';
  // O mesmo que o npm run build do projeto gerado, chamado pelo node, sem shell.
  const build = spawnSync(process.execPath, [path.join(raiz, 'node_modules/vite/bin/vite.js'), 'build'], {
    cwd: raiz, encoding: 'utf8', shell: false, timeout: 300000,
  });
  registrar(3, 'Cada página desenhada vira rota e arquivo de esqueleto no projeto gerado, e o projeto compila',
    app.includes('<Route path="/" element={<PaginaInicio />} />') && app.includes('<Route path="/contato" element={<PaginaContato />} />')
      && inicioJsx.includes('Desenhado no Studio') && contatoJsx.includes('Como te chamamos.') && build.status === 0, [
      `src/App.jsx com as duas rotas: ${app.includes('PaginaInicio />') && app.includes('PaginaContato />')}`,
      `src/paginas/PaginaInicio.jsx com o texto desenhado: ${inicioJsx.includes('Desenhado no Studio')}`,
      `src/paginas/PaginaContato.jsx com o campo: ${contatoJsx.includes('Como te chamamos.')}`,
      `src/App.module.css removido do plano: ${lerSeExiste('src/App.module.css') === null}`,
      `vite build no projeto gerado: saída ${build.status}${build.status === 0 ? '' : `, ${String(build.stderr || build.stdout).trim().split('\n').slice(-5).join(' | ')}`}`,
    ]);

  // ----------------------------------------------- item 4, zero elemento sem item no catálogo
  const catalogo = await obterCatalogo();
  const ids = new Set(catalogo.itens.map((item) => item.id));
  const tipos = [];
  const coletar = (nos) => nos.forEach((n) => { tipos.push(n.tipo); coletar(n.filhos ?? []); });
  documento.paginas.forEach((pagina) => coletar(pagina.regioes));
  const foraDoCatalogo = tipos.filter((tipo) => !ids.has(tipo));
  registrar(4, 'Zero elemento sem componente equivalente no catálogo',
    foraDoCatalogo.length === 0 && plano.pendencias.every((p) => p.tipo !== 'catalogo'), [
      `${tipos.length} nós desenhados, ${catalogo.itens.length} itens no catálogo, fora do catálogo: ${foraDoCatalogo.length}`,
      `o servidor recusa na escrita o que o catálogo não tem, e o plano não trouxe pendência de catálogo`,
      'a paleta do canvas usa ondePodeEntrar(), a mesma regra da inserção, coberta pelos testes do bloco 4',
    ]);

  // ----------------------------------------------------------- item 5, preview sem vazamento
  const estudio = fs.readdirSync(path.join(RAIZ, 'src/features/studio'), { recursive: true }).filter((n) => String(n).endsWith('.css'));
  const globaisNoStudio = estudio.filter((nome) => /:global|^\s*(body|html|:root)\b/m.test(fs.readFileSync(path.join(RAIZ, 'src/features/studio', nome), 'utf8')));
  registrar(5, 'O preview do Studio não vaza estilo para o Forge, nem o contrário (P-06)',
    globaisNoStudio.length === 0, [
      `${estudio.length} CSS Modules do Studio, com seletor global: ${globaisNoStudio.length ? globaisNoStudio.join(', ') : 'nenhum'}`,
      'o preview usa só o alias --projeto-*, conferido em shared/schemas/design.test.js',
    ]);

  // ------------------------------------------------ item 6, diff de design (bloco 7)
  registrar(6, 'Redesenhar um projeto já materializado gera plano de diff, e nada é escrito sem aprovação',
    null, ['entra quando o bloco 7 estiver entregue']);

  // ------------------------------------------------- item 7, pular a etapa Design
  const { projeto: semStudio } = await criarProjeto({ nome: 'Prova sem Studio', presetId: preset.id });
  const respostasSem = respostasIniciais({ respostas: {} }, preset, semStudio);
  await salvarDesign(semStudio.id, documento);
  await salvarBlueprint(semStudio.id, {
    preset: { id: preset.id, versao: preset.versao },
    etapaAtual: 'materializar',
    etapasConcluidas: preset.etapas.filter((e) => e !== 'design'),
    assumidas: ['design'],
    respostas: respostasSem,
  });
  const planoSem = await gerarPlano(semStudio.id);
  const tokensSem = planoSem.arquivos.find((a) => a.caminho === 'src/styles/tokens.css')?.conteudo ?? '';
  const paginasSem = planoSem.arquivos.filter((a) => a.caminho.startsWith('src/paginas/'));
  registrar(7, 'Pular a etapa Design continua funcionando: o projeto sai com o padrão Kora',
    tokensSem.includes(`--cor-acento: ${TOKENS_PADRAO.cor.acento};`) && paginasSem.length === 0 && planoSem.arquivos.some((a) => a.caminho === 'src/App.module.css'), [
      'mesmo com um desenho salvo, a etapa Design assumida usa o padrão',
      `tokens.css com o acento padrão: ${tokensSem.includes(`--cor-acento: ${TOKENS_PADRAO.cor.acento};`)}`,
      `nenhuma página do Studio no plano: ${paginasSem.length === 0}, App.module.css de sempre presente`,
    ]);

  // ---------------------------------------------------------- item 8 e 9, dev server e tempo
  const dev = materializacao.comandos.find((c) => c.id === 'dev');
  const linhasDoDev = dev?.runId ? await lerLogAoVivo(porta, servidor.tokenSessao, dev.runId) : [];
  const urlDev = linhasDoDev.join(' ').match(/https?:\/\/[a-z0-9.-]+:\d+\/?/i)?.[0] ?? null;
  const statusDev = urlDev ? await responde(urlDev, 20) : null;
  marcos.fim = Date.now();
  const semChave = !process.env.ANTHROPIC_API_KEY;

  registrar(8, 'Tudo funciona com o copiloto desligado',
    materializacao.estado === 'concluida' && semChave && config.copiloto === false, [
      `config.copiloto: ${config.copiloto}, ANTHROPIC_API_KEY ausente: ${semChave}`,
      `fluxo inteiro completou: ${materializacao.estado}`,
    ]);

  const total = (marcos.fim - inicio) / 1000;
  registrar(9, `Do clique inicial ao dev server, com design: menos de ${LIMITE_MINUTOS} minutos`,
    total < LIMITE_MINUTOS * 60 && statusDev === 200, [
      `total: ${total.toFixed(1)}s (${(total / 60).toFixed(1)} min), com npm install de verdade`,
      urlDev ? `dev server em ${urlDev} respondeu HTTP ${statusDev ?? 'nada'}` : `o log não anunciou URL: ${JSON.stringify(linhasDoDev.slice(-6))}`,
    ]);

  console.log('');
  const falhas = relatorio.filter((r) => r.ok === false);
  const abertos = relatorio.filter((r) => r.ok === null);
  console.log(falhas.length === 0
    ? `${relatorio.length - abertos.length} ITENS PASSARAM${abertos.length ? `, ${abertos.length} ainda em aberto (${abertos.map((a) => a.numero).join(', ')})` : ''}.`
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
