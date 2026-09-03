import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, afterEach } from 'vitest';
import { criarAppDeTeste, criarPastaTemporaria } from '../../testes/apoio.js';
import { materializacaoSchema, eventoLogSchema } from '../../../shared/schemas/materializacao.js';

let contexto;
const temporarias = [];
afterEach(async () => {
  if (contexto) {
    contexto.app.servicos.runner.encerrarTudo();
    await contexto.fechar();
    contexto = null;
  }
  while (temporarias.length > 0) fs.rmSync(temporarias.pop(), { recursive: true, force: true });
});
function novo() { contexto = criarAppDeTeste(); return contexto; }
function workspace() {
  const p = criarPastaTemporaria('kora-forge-run-');
  temporarias.push(p);
  return p;
}

const post = (ctx, url, payload) => ctx.app.inject({ method: 'POST', url, headers: ctx.cabecalhos, payload });
const get = (ctx, url) => ctx.app.inject({ method: 'GET', url, headers: ctx.cabecalhos });
const patch = (ctx, url, payload) => ctx.app.inject({ method: 'PATCH', url, headers: ctx.cabecalhos, payload });

// Os scripts vão dentro do próprio plano: o runner escreve e depois executa, com cwd na raiz.
const arquivo = (caminho, conteudo, acao = 'criar') => ({ caminho, acao, tamanho: Buffer.byteLength(conteudo), tamanhoAtual: acao === 'criar' ? null : 1, template: 'teste', conteudo });
const comando = (id, args, extra = {}) => ({ id, cmd: 'node', args, obrigatorio: true, longaDuracao: false, timeoutMs: 20000, ...extra });

function plano(raiz, comandos, arquivosExtras = []) {
  const arquivos = [
    arquivo('CLAUDE.md', '# projeto de teste\n'),
    arquivo('docs/00_VISAO/README.md', '# visao\n'),
    arquivo('ok.js', 'console.log("feito");\n'),
    arquivo('falha.js', 'console.error("quebrou");process.exit(2);\n'),
    arquivo('longa.js', 'setInterval(() => {}, 1000);console.log("servindo");\n'),
    ...arquivosExtras,
  ];
  return {
    hashBlueprint: `sha256:${'a'.repeat(64)}`,
    raiz,
    arquivos,
    comandos,
    pendencias: [],
    totais: { arquivos: arquivos.length, bytes: 0, conflitos: arquivos.filter((a) => a.acao === 'sobrescrever').length, pulados: arquivos.filter((a) => a.acao === 'pular').length },
  };
}

async function esperar(condicao, limiteMs = 15000) {
  const fim = Date.now() + limiteMs;
  while (Date.now() < fim) {
    if (condicao()) return true;
    await new Promise((resolver) => setTimeout(resolver, 20));
  }
  return false;
}

async function projetoEm(ctx, ws) {
  await patch(ctx, '/api/settings', { workspace: ws });
  const criado = await post(ctx, '/api/projects', { nome: 'Alvo', presetId: 'criar-site' });
  return criado.json().data.projeto;
}

describe('escrita de arquivos', () => {
  it('cria pastas e arquivos, pula os idênticos e conta cada ação', async () => {
    const ctx = novo();
    const ws = workspace();
    const projeto = await projetoEm(ctx, ws);
    const raiz = path.join(ws, 'alvo');
    const { runner } = ctx.app.servicos;

    const resultado = await runner.materializar({
      projeto, preset: { requisitos: [] },
      plano: plano(raiz, [], [arquivo('ja-existe.md', 'novo\n', 'pular')]),
    });

    expect(materializacaoSchema.safeParse(resultado).success).toBe(true);
    expect(resultado.arquivos).toEqual({ criados: 5, sobrescritos: 0, pulados: 1 });
    expect(fs.readFileSync(path.join(raiz, 'CLAUDE.md'), 'utf8')).toBe('# projeto de teste\n');
    expect(fs.readFileSync(path.join(raiz, 'docs/00_VISAO/README.md'), 'utf8')).toBe('# visao\n');
    expect(fs.existsSync(path.join(raiz, 'ja-existe.md'))).toBe(false);
    expect(resultado.estado).toBe('concluida');
  });

  it('sobrescreve o que o plano mandou sobrescrever e preserva o resto', async () => {
    const ctx = novo();
    const ws = workspace();
    const projeto = await projetoEm(ctx, ws);
    const raiz = path.join(ws, 'alvo');
    fs.mkdirSync(raiz, { recursive: true });
    fs.writeFileSync(path.join(raiz, 'CLAUDE.md'), 'conteúdo antigo');
    fs.writeFileSync(path.join(raiz, 'meu-arquivo.md'), 'não mexer');

    const meuPlano = plano(raiz, []);
    meuPlano.arquivos[0] = arquivo('CLAUDE.md', '# novo\n', 'sobrescrever');
    const resultado = await ctx.app.servicos.runner.materializar({ projeto, preset: { requisitos: [] }, plano: meuPlano });

    expect(resultado.arquivos.sobrescritos).toBe(1);
    expect(fs.readFileSync(path.join(raiz, 'CLAUDE.md'), 'utf8')).toBe('# novo\n');
    expect(fs.readFileSync(path.join(raiz, 'meu-arquivo.md'), 'utf8')).toBe('não mexer');
  });

  it('caminho que tenta sair da raiz é recusado antes de escrever', async () => {
    const ctx = novo();
    const ws = workspace();
    const projeto = await projetoEm(ctx, ws);
    const raiz = path.join(ws, 'alvo');
    const malicioso = plano(raiz, [], [arquivo('../fora.md', 'não deveria existir\n')]);
    let erro;
    try { await ctx.app.servicos.runner.materializar({ projeto, preset: { requisitos: [] }, plano: malicioso }); } catch (e) { erro = e; }
    expect(erro?.codigo).toBe('FORGE_PATH_FORBIDDEN');
    expect(fs.existsSync(path.join(ws, 'fora.md'))).toBe(false);
  });
});

describe('execução de comandos', () => {
  it('roda em ordem, grava run e log, emite eventos e conclui', async () => {
    const ctx = novo();
    const ws = workspace();
    const projeto = await projetoEm(ctx, ws);
    const raiz = path.join(ws, 'alvo');
    const { runner } = ctx.app.servicos;

    await runner.materializar({ projeto, preset: { requisitos: [] }, plano: plano(raiz, [comando('um', ['ok.js']), comando('dois', ['ok.js'])]) });
    expect(await esperar(() => runner.obter(projeto.id).estado === 'concluida')).toBe(true);

    const estado = runner.obter(projeto.id);
    expect(estado.comandos.map((c) => c.estado)).toEqual(['sucesso', 'sucesso']);
    expect(estado.comandos.every((c) => c.exitCode === 0 && c.runId)).toBe(true);

    const runs = ctx.db.prepare('SELECT comando_id, cmd, args_json, cwd, estado, exit_code FROM command_runs ORDER BY iniciado_em').all();
    expect(runs).toHaveLength(2);
    expect(runs[0]).toMatchObject({ comando_id: 'um', cmd: 'node', estado: 'sucesso', exit_code: 0 });
    expect(JSON.parse(runs[0].args_json)).toEqual(['ok.js']);
    expect(fs.realpathSync(runs[0].cwd)).toBe(fs.realpathSync(raiz));

    const logs = ctx.db.prepare('SELECT stream, linha FROM command_logs ORDER BY id').all();
    expect(logs).toEqual([{ stream: 'stdout', linha: 'feito' }, { stream: 'stdout', linha: 'feito' }]);

    const eventos = ctx.db.prepare('SELECT nome FROM events WHERE project_id = ? ORDER BY id').all(projeto.id).map((e) => e.nome);
    expect(eventos.filter((n) => n === 'comando.executado')).toHaveLength(2);
    expect(eventos).toContain('projeto.materializado');

    const linha = ctx.db.prepare('SELECT status, caminho_disco FROM projects WHERE id = ?').get(projeto.id);
    expect(linha).toEqual({ status: 'materializado', caminho_disco: raiz });
  });

  it('falha para a fila, registra e espera decisão humana', async () => {
    const ctx = novo();
    const ws = workspace();
    const projeto = await projetoEm(ctx, ws);
    const { runner } = ctx.app.servicos;

    await runner.materializar({ projeto, preset: { requisitos: [] }, plano: plano(path.join(ws, 'alvo'), [comando('quebra', ['falha.js']), comando('depois', ['ok.js'])]) });
    expect(await esperar(() => runner.obter(projeto.id).estado === 'parado_em_falha')).toBe(true);

    const estado = runner.obter(projeto.id);
    expect(estado.comandos[0]).toMatchObject({ estado: 'falha', exitCode: 2 });
    expect(estado.comandos[1].estado).toBe('pendente');
    expect(estado.indice).toBe(0);
    expect(ctx.db.prepare("SELECT count(*) AS n FROM events WHERE nome = 'comando.falhou'").get().n).toBe(1);
    expect(ctx.db.prepare("SELECT count(*) AS n FROM events WHERE nome = 'projeto.materializado'").get().n).toBe(0);
    expect(ctx.db.prepare('SELECT linha FROM command_logs WHERE stream = ?').all('stderr').map((l) => l.linha)).toEqual(['quebrou']);
  });

  it('pular segue para o próximo, repetir roda de novo, abortar encerra', async () => {
    const ctx = novo();
    const ws = workspace();
    const { runner } = ctx.app.servicos;

    const projeto = await projetoEm(ctx, ws);
    await runner.materializar({ projeto, preset: { requisitos: [] }, plano: plano(path.join(ws, 'alvo'), [comando('quebra', ['falha.js']), comando('depois', ['ok.js'])]) });
    await esperar(() => runner.obter(projeto.id).estado === 'parado_em_falha');

    runner.decidir(projeto.id, 'repetir');
    expect(await esperar(() => runner.obter(projeto.id).estado === 'parado_em_falha' && ctx.db.prepare('SELECT count(*) AS n FROM command_runs').get().n === 2)).toBe(true);

    runner.decidir(projeto.id, 'pular');
    expect(await esperar(() => runner.obter(projeto.id).estado === 'concluida')).toBe(true);
    expect(runner.obter(projeto.id).comandos.map((c) => c.estado)).toEqual(['pulado', 'sucesso']);
    expect(ctx.db.prepare('SELECT status FROM projects WHERE id = ?').get(projeto.id).status).toBe('materializado');
  });

  it('abortar encerra sem materializar e deixa o disco como está', async () => {
    const ctx = novo();
    const ws = workspace();
    const projeto = await projetoEm(ctx, ws);
    const raiz = path.join(ws, 'alvo');
    const { runner } = ctx.app.servicos;

    await runner.materializar({ projeto, preset: { requisitos: [] }, plano: plano(raiz, [comando('quebra', ['falha.js'])]) });
    await esperar(() => runner.obter(projeto.id).estado === 'parado_em_falha');
    const estado = runner.decidir(projeto.id, 'abortar');

    expect(estado.estado).toBe('abortada');
    expect(estado.terminadaEm).not.toBeNull();
    expect(fs.existsSync(path.join(raiz, 'CLAUDE.md'))).toBe(true);
    expect(ctx.db.prepare('SELECT status FROM projects WHERE id = ?').get(projeto.id).status).toBe('rascunho');
  });

  it('decidir fora de falha responde erro de validação', async () => {
    const ctx = novo();
    const ws = workspace();
    const projeto = await projetoEm(ctx, ws);
    const { runner } = ctx.app.servicos;
    await runner.materializar({ projeto, preset: { requisitos: [] }, plano: plano(path.join(ws, 'alvo'), [comando('um', ['ok.js'])]) });
    await esperar(() => runner.obter(projeto.id).estado === 'concluida');
    expect(() => runner.decidir(projeto.id, 'repetir')).toThrow(/parada em uma falha/);
    expect(() => runner.decidir('outro-projeto', 'repetir')).toThrow(/materialização em andamento/);
  });

  it('comando de longa duração não segura a fila e continua vivo', async () => {
    const ctx = novo();
    const ws = workspace();
    const projeto = await projetoEm(ctx, ws);
    const { runner } = ctx.app.servicos;

    await runner.materializar({
      projeto, preset: { requisitos: [] },
      plano: plano(path.join(ws, 'alvo'), [comando('dev', ['longa.js'], { longaDuracao: true, obrigatorio: false })]),
    });
    expect(await esperar(() => runner.obter(projeto.id).estado === 'concluida')).toBe(true);
    const dev = runner.obter(projeto.id).comandos[0];
    expect(dev.estado).toBe('rodando');

    const parada = runner.pararRun(dev.runId);
    expect(parada).toEqual({ runId: dev.runId, estado: 'cancelado' });
    expect(await esperar(() => ctx.db.prepare('SELECT estado FROM command_runs WHERE id = ?').get(dev.runId).estado === 'cancelado')).toBe(true);
    expect(() => runner.pararRun(dev.runId)).toThrow(/já terminou/);
    expect(() => runner.pararRun('inexistente')).toThrow(/não encontrada/);
  });

  it('comando opcional que falha não segura a fila; obrigatório segura', async () => {
    const ctx = novo();
    const ws = workspace();
    const projeto = await projetoEm(ctx, ws);
    const { runner } = ctx.app.servicos;

    await runner.materializar({
      projeto, preset: { requisitos: [] },
      plano: plano(path.join(ws, 'alvo'), [comando('opcional', ['falha.js'], { obrigatorio: false }), comando('depois', ['ok.js'])]),
    });
    expect(await esperar(() => runner.obter(projeto.id).estado === 'concluida')).toBe(true);
    expect(runner.obter(projeto.id).comandos.map((c) => c.estado)).toEqual(['falha', 'sucesso']);
    expect(ctx.db.prepare("SELECT count(*) AS n FROM events WHERE nome = 'comando.falhou'").get().n).toBe(1);
    expect(ctx.db.prepare('SELECT status FROM projects WHERE id = ?').get(projeto.id).status).toBe('materializado');
  });

  it('timeout mata o comando e para a fila', async () => {
    const ctx = novo();
    const ws = workspace();
    const projeto = await projetoEm(ctx, ws);
    const { runner } = ctx.app.servicos;
    await runner.materializar({ projeto, preset: { requisitos: [] }, plano: plano(path.join(ws, 'alvo'), [comando('lento', ['longa.js'], { timeoutMs: 300 })]) });
    expect(await esperar(() => runner.obter(projeto.id).estado === 'parado_em_falha')).toBe(true);
    expect(runner.obter(projeto.id).comandos[0].estado).toBe('timeout');
    expect(ctx.db.prepare('SELECT estado FROM command_runs').get().estado).toBe('timeout');
  });

  it('materialização ainda rodando recusa uma segunda do mesmo projeto', async () => {
    const ctx = novo();
    const ws = workspace();
    const projeto = await projetoEm(ctx, ws);
    const { runner } = ctx.app.servicos;
    // Comando que segura a fila: com dev server destacado a materialização já estaria concluída.
    const meuPlano = plano(path.join(ws, 'alvo'), [comando('preso', ['longa.js'], { timeoutMs: 5000 })]);
    await runner.materializar({ projeto, preset: { requisitos: [] }, plano: meuPlano });
    expect(runner.obter(projeto.id).estado).toBe('rodando');
    await expect(runner.materializar({ projeto, preset: { requisitos: [] }, plano: meuPlano })).rejects.toMatchObject({ codigo: 'FORGE_CONFLICT' });
    runner.encerrarTudo();
  });

  it('materialização concluída não impede materializar de novo', async () => {
    const ctx = novo();
    const ws = workspace();
    const projeto = await projetoEm(ctx, ws);
    const { runner } = ctx.app.servicos;
    const meuPlano = plano(path.join(ws, 'alvo'), [comando('um', ['ok.js'])]);
    await runner.materializar({ projeto, preset: { requisitos: [] }, plano: meuPlano });
    await esperar(() => runner.obter(projeto.id).estado === 'concluida');
    // materializar devolve o estado logo depois de começar: rodando, não concluída.
    const segunda = await runner.materializar({ projeto, preset: { requisitos: [] }, plano: meuPlano });
    expect(segunda.estado).toBe('rodando');
    expect(await esperar(() => runner.obter(projeto.id).estado === 'concluida')).toBe(true);
  });

  it('ferramenta ausente recusa antes de escrever qualquer byte', async () => {
    const ctx = novo();
    const ws = workspace();
    const projeto = await projetoEm(ctx, ws);
    const raiz = path.join(ws, 'alvo');
    let erro;
    try {
      await ctx.app.servicos.runner.materializar({ projeto, preset: { requisitos: [{ bin: 'docker' }] }, plano: plano(raiz, []) });
    } catch (e) { erro = e; }
    expect(erro?.codigo).toBe('FORGE_TOOL_MISSING');
    expect(erro.message).toContain('docker');
    expect(erro.detalhe.ferramentas.find((f) => f.bin === 'docker').ok).toBe(false);
    expect(fs.existsSync(raiz)).toBe(false);
  });
});

describe('transmissor de log', () => {
  it('entrega o histórico a quem conecta depois e as linhas novas ao vivo', async () => {
    const ctx = novo();
    const ws = workspace();
    const projeto = await projetoEm(ctx, ws);
    const { runner, transmissor } = ctx.app.servicos;

    await runner.materializar({ projeto, preset: { requisitos: [] }, plano: plano(path.join(ws, 'alvo'), [comando('um', ['ok.js'])]) });
    await esperar(() => runner.obter(projeto.id).estado === 'concluida');

    const runId = runner.obter(projeto.id).comandos[0].runId;
    const recebidos = [];
    const cancelar = transmissor.assinar(runId, (evento) => recebidos.push(evento));
    expect(recebidos.map((e) => e.tipo)).toEqual(['linha', 'fim']);
    expect(recebidos[0]).toMatchObject({ stream: 'stdout', linha: 'feito' });
    expect(recebidos[1]).toMatchObject({ estado: 'sucesso', exitCode: 0 });
    cancelar();
  });

  // Contrato fechado ponta a ponta: o front valida cada evento por `eventoLogSchema` antes de
  // pintar a tela, e descarta o que não bate. Se o servidor publicasse algo fora do schema, o log
  // ficaria mudo sem ninguém errar em lugar nenhum. Este teste é o que impede isso.
  it('tudo que o runner publica bate com o schema que o front consome', async () => {
    const ctx = novo();
    const ws = workspace();
    const projeto = await projetoEm(ctx, ws);
    const { runner, transmissor } = ctx.app.servicos;

    await runner.materializar({
      projeto,
      preset: { requisitos: [] },
      plano: plano(path.join(ws, 'alvo'), [comando('um', ['ok.js']), comando('dois', ['falha.js'], { obrigatorio: false })]),
    });
    await esperar(() => ['concluida', 'parado_em_falha'].includes(runner.obter(projeto.id).estado));

    const publicados = runner.obter(projeto.id).comandos
      .filter((c) => c.runId)
      .flatMap((c) => transmissor.historico(c.runId));

    expect(publicados.length).toBeGreaterThan(0);
    for (const evento of publicados) {
      const resultado = eventoLogSchema.safeParse(evento);
      expect(resultado.success, `evento fora do contrato: ${JSON.stringify(evento)}`).toBe(true);
    }
    expect(publicados.some((e) => e.tipo === 'linha')).toBe(true);
    expect(publicados.some((e) => e.tipo === 'fim')).toBe(true);
  });

  it('ouvinte que quebra não derruba os outros nem a execução', () => {
    const ctx = novo();
    const { transmissor } = ctx.app.servicos;
    const bons = [];
    transmissor.assinar('r1', () => { throw new Error('socket morreu'); });
    transmissor.assinar('r1', (evento) => bons.push(evento));
    expect(() => transmissor.publicar('r1', { tipo: 'linha', linha: 'oi' })).not.toThrow();
    expect(bons).toHaveLength(1);
  });
});

describe('rotas de materialização', () => {
  it('hash diferente responde FORGE_PLAN_STALE sem escrever nada', async () => {
    const ctx = novo();
    const ws = workspace();
    const projeto = await projetoEm(ctx, ws);
    const resposta = await post(ctx, `/api/projects/${projeto.id}/materializar`, { hashBlueprint: `sha256:${'b'.repeat(64)}` });
    expect(resposta.statusCode).toBe(409);
    expect(resposta.json().error.codigo).toBe('FORGE_PLAN_STALE');
    expect(fs.readdirSync(ws)).toEqual([]);
  });

  it('corpo com campo a mais, hash malformado ou ausente responde 400', async () => {
    const ctx = novo();
    const projeto = await projetoEm(ctx, workspace());
    for (const corpo of [{}, { hashBlueprint: 'nao-e-hash' }, { hashBlueprint: `sha256:${'a'.repeat(64)}`, arquivos: [] }]) {
      expect((await post(ctx, `/api/projects/${projeto.id}/materializar`, corpo)).statusCode).toBe(400);
    }
  });

  it('estado começa nulo e passa a existir depois de materializar', async () => {
    const ctx = novo();
    const ws = workspace();
    const projeto = await projetoEm(ctx, ws);
    const antes = await get(ctx, `/api/projects/${projeto.id}/materializar`);
    expect(antes.statusCode).toBe(200);
    expect(antes.json().data.materializacao).toBeNull();

    await ctx.app.servicos.runner.materializar({ projeto, preset: { requisitos: [] }, plano: plano(path.join(ws, 'alvo'), [comando('um', ['ok.js'])]) });
    const depois = await get(ctx, `/api/projects/${projeto.id}/materializar`);
    expect(depois.json().data.materializacao.projetoId).toBe(projeto.id);
  });

  it('decidir sem materialização responde 404, e ação inválida 400', async () => {
    const ctx = novo();
    const projeto = await projetoEm(ctx, workspace());
    expect((await post(ctx, `/api/projects/${projeto.id}/materializar/decidir`, { acao: 'repetir' })).statusCode).toBe(404);
    expect((await post(ctx, `/api/projects/${projeto.id}/materializar/decidir`, { acao: 'voar' })).statusCode).toBe(400);
    expect((await post(ctx, '/api/projects/nao-existe/materializar/decidir', { acao: 'repetir' })).statusCode).toBe(404);
  });

  it('as rotas de materialização exigem a mesma guarda das outras', async () => {
    const ctx = novo();
    const projeto = await projetoEm(ctx, workspace());
    const semToken = { host: '127.0.0.1:7337', origin: 'http://127.0.0.1:5173' };
    for (const url of [`/api/projects/${projeto.id}/materializar`, `/api/projects/${projeto.id}/materializar/decidir`, '/api/runs/qualquer/parar']) {
      const resposta = await ctx.app.inject({ method: 'POST', url, headers: semToken, payload: {} });
      expect(resposta.statusCode).toBe(401);
    }
    expect((await ctx.app.inject({ method: 'GET', url: '/api/ws/runs/qualquer', headers: semToken })).statusCode).toBe(401);
  });
});
