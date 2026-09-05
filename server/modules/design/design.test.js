import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, afterEach } from 'vitest';
import { criarAppDeTeste, criarPastaTemporaria } from '../../testes/apoio.js';
import { listarMigrations, PASTA_MIGRATIONS } from '../../db/migrar.js';
import { designOuNadaSchema, listaVersoesDesignSchema, documentoDesignSchema, CATALOGO_VERSAO_ATUAL } from '../../../shared/schemas/design.js';

let contexto;
const temporarias = [];
afterEach(async () => {
  if (contexto) { await contexto.fechar(); contexto = null; }
  while (temporarias.length > 0) fs.rmSync(temporarias.pop(), { recursive: true, force: true });
});
function novo() { contexto = criarAppDeTeste(); return contexto; }
function workspace() {
  const p = criarPastaTemporaria('kora-forge-ws-');
  temporarias.push(p);
  return p;
}

const post = (ctx, url, payload) => ctx.app.inject({ method: 'POST', url, headers: ctx.cabecalhos, payload });
const get = (ctx, url) => ctx.app.inject({ method: 'GET', url, headers: ctx.cabecalhos });
const patch = (ctx, url, payload) => ctx.app.inject({ method: 'PATCH', url, headers: ctx.cabecalhos, payload });
const eventos = (ctx, projectId) => ctx.db.prepare('SELECT nome, payload_json FROM events WHERE project_id = ? ORDER BY id').all(projectId);

const criar = async (ctx, nome = 'Site da Kora') => {
  const r = await post(ctx, '/api/projects', { nome, presetId: 'criar-site' });
  expect(r.statusCode).toBe(201);
  return r.json().data.projeto;
};

const documento = (extra = {}) => ({
  catalogo: { versao: 1 },
  tokens: documentoDesignSchema.parse({}).tokens,
  paginas: [{ id: 'inicio', nome: 'Início', rota: '/', regioes: [{ id: 'topo', tipo: 'secao', props: { titulo: 'Kora' }, filhos: [] }] }],
  ...extra,
});

// A versão do preset vem do projeto criado, nunca cravada aqui (mesma razão do gerador.test.js).
const blueprintSite = (projeto) => ({
  preset: { id: projeto.presetId, versao: projeto.presetVersao },
  etapaAtual: 'materializar',
  etapasConcluidas: ['identidade', 'escopo', 'seguranca', 'fundacao', 'materializar'],
  assumidas: ['design'],
  respostas: {
    identidade: { nome: 'Site da Kora', essencia: 'A casa digital da Kora.', problema: 'Não temos onde apontar.', valor: 'Presença própria.' },
    escopo: { publico: 'clientes', personas: ['dono de restaurante'], ahaMoment: 'ver o site no ar', naoObjetivos: ['não é blog'] },
    design: {},
    seguranca: { dadoPessoal: false, dadoFinanceiro: false, compliance: [], tierGratuito: true, observacoes: '' },
    fundacao: { observacoes: '' },
    materializar: { confirmada: true },
  },
});

async function projetoPronto(ctx, ws, nome = 'Site da Kora') {
  await patch(ctx, '/api/settings', { workspace: ws });
  const projeto = await criar(ctx, nome);
  const salvo = await post(ctx, `/api/projects/${projeto.id}/blueprint`, blueprintSite(projeto));
  expect(salvo.statusCode).toBe(200);
  return projeto;
}
const gerarPlano = async (ctx, id) => {
  const r = await post(ctx, `/api/projects/${id}/plano`);
  expect(r.statusCode).toBe(200);
  return r.json().data;
};

describe('GET /projects/:id/design', () => {
  it('projeto sem design responde design null: ausência é estado normal, não 404', async () => {
    const ctx = novo();
    const projeto = await criar(ctx);
    const r = await get(ctx, `/api/projects/${projeto.id}/design`);
    expect(r.statusCode).toBe(200);
    expect(r.json().data).toEqual({ design: null });
    expect(designOuNadaSchema.safeParse(r.json().data).success).toBe(true);
  });

  it('devolve o documento ativo, com tokens e páginas de volta inteiros', async () => {
    const ctx = novo();
    const projeto = await criar(ctx);
    await post(ctx, `/api/projects/${projeto.id}/design`, documento());
    const { design } = (await get(ctx, `/api/projects/${projeto.id}/design`)).json().data;
    expect(design).toMatchObject({ versao: 1, ativo: true });
    expect(design.payload).toEqual(documento());
    expect(design.criadoEm).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('projeto inexistente responde 404 nas três rotas', async () => {
    const ctx = novo();
    expect((await get(ctx, '/api/projects/nao-existe/design')).statusCode).toBe(404);
    expect((await get(ctx, '/api/projects/nao-existe/design/versoes')).statusCode).toBe(404);
    expect((await post(ctx, '/api/projects/nao-existe/design', documento())).statusCode).toBe(404);
  });
});

describe('POST /projects/:id/design', () => {
  it('cria versão n+1 e a anterior sai de ativa, com o histórico inteiro preservado', async () => {
    const ctx = novo();
    const projeto = await criar(ctx);
    const primeira = await post(ctx, `/api/projects/${projeto.id}/design`, documento());
    expect(primeira.statusCode).toBe(200);
    expect(primeira.json().data.design.versao).toBe(1);

    const segunda = await post(ctx, `/api/projects/${projeto.id}/design`, documento({ paginas: [] }));
    expect(segunda.json().data.design).toMatchObject({ versao: 2, ativo: true });
    expect(segunda.json().data.design.payload.paginas).toEqual([]);

    const versoes = (await get(ctx, `/api/projects/${projeto.id}/design/versoes`)).json().data;
    expect(listaVersoesDesignSchema.safeParse(versoes).success).toBe(true);
    expect(versoes.map((v) => [v.versao, v.ativo])).toEqual([[2, true], [1, false]]);
    expect(ctx.db.prepare('SELECT COUNT(*) AS n FROM design_documents WHERE project_id = ?').get(projeto.id).n).toBe(2);
  });

  it('salvar sem mudar nada não cria versão nova: o Studio salva sozinho o tempo todo', async () => {
    const ctx = novo();
    const projeto = await criar(ctx);
    await post(ctx, `/api/projects/${projeto.id}/design`, documento());
    const repetido = await post(ctx, `/api/projects/${projeto.id}/design`, documento());
    expect(repetido.json().data.design.versao).toBe(1);
    expect((await get(ctx, `/api/projects/${projeto.id}/design/versoes`)).json().data).toHaveLength(1);
  });

  it('emite design.salvo com a versão, e não emite quando nada mudou', async () => {
    const ctx = novo();
    const projeto = await criar(ctx);
    await post(ctx, `/api/projects/${projeto.id}/design`, documento());
    await post(ctx, `/api/projects/${projeto.id}/design`, documento());
    const salvos = eventos(ctx, projeto.id).filter((e) => e.nome === 'design.salvo');
    expect(salvos).toHaveLength(1);
    expect(JSON.parse(salvos[0].payload_json)).toEqual({ versao: 1, paginas: 1, catalogoVersao: 1 });
  });

  it('documento parcial é aceito e sai completo: o Studio salva enquanto a pessoa desenha', async () => {
    const ctx = novo();
    const projeto = await criar(ctx);
    const r = await post(ctx, `/api/projects/${projeto.id}/design`, {});
    expect(r.statusCode).toBe(200);
    expect(r.json().data.design.payload.tokens.cor.fundo).toBe('#ffffff');
    expect(r.json().data.design.payload.catalogo).toEqual({ versao: CATALOGO_VERSAO_ATUAL });
  });

  it('corpo fora do contrato responde 400 FORGE_VALIDATION com o caminho do campo', async () => {
    const ctx = novo();
    const projeto = await criar(ctx);
    const url = `/api/projects/${projeto.id}/design`;

    const coordenada = await post(ctx, url, documento({
      paginas: [{ id: 'p', nome: 'P', rota: '/', regioes: [{ id: 'r', tipo: 'secao', props: {}, filhos: [], x: 10 }] }],
    }));
    expect(coordenada.statusCode).toBe(400);
    expect(coordenada.json().error.codigo).toBe('FORGE_VALIDATION');
    expect(coordenada.json().error.detalhe.issues[0].caminho).toBe('paginas.0.regioes.0.x');

    const rotaRuim = await post(ctx, url, documento({ paginas: [{ id: 'p', nome: 'P', rota: 'sem-barra', regioes: [] }] }));
    expect(rotaRuim.statusCode).toBe(400);
    expect(rotaRuim.json().error.detalhe.issues[0].caminho).toBe('paginas.0.rota');

    const tokenVazio = await post(ctx, url, documento({ tokens: { cor: { fundo: '  ' } } }));
    expect(tokenVazio.statusCode).toBe(400);
    expect(tokenVazio.json().error.detalhe.issues[0].caminho).toBe('tokens.cor.fundo');
  });

  it('projeto arquivado recusa com 400 e mensagem que manda restaurar', async () => {
    const ctx = novo();
    const projeto = await criar(ctx);
    await patch(ctx, `/api/projects/${projeto.id}`, { arquivado: true });
    const r = await post(ctx, `/api/projects/${projeto.id}/design`, documento());
    expect(r.statusCode).toBe(400);
    expect(r.json().error.mensagem).toContain('Restaure');
  });

  it('documento de catálogo mais novo é recusado nomeando as duas versões', async () => {
    const ctx = novo();
    const projeto = await criar(ctx);
    const r = await post(ctx, `/api/projects/${projeto.id}/design`, documento({ catalogo: { versao: CATALOGO_VERSAO_ATUAL + 1 } }));
    expect(r.statusCode).toBe(400);
    expect(r.json().error.detalhe.issues[0].caminho).toBe('catalogo.versao');
    expect(r.json().error.mensagem).toContain(String(CATALOGO_VERSAO_ATUAL + 1));
  });

  it('as três rotas de design exigem a mesma guarda das outras', async () => {
    const ctx = novo();
    const projeto = await criar(ctx);
    const semToken = { host: '127.0.0.1:7337', origin: 'http://127.0.0.1:5173' };
    const outraOrigem = { ...ctx.cabecalhos, origin: 'http://malicioso.example' };
    const outroHost = { ...ctx.cabecalhos, host: 'evil.example' };
    const urls = [`/api/projects/${projeto.id}/design`, `/api/projects/${projeto.id}/design/versoes`];

    for (const url of urls) {
      expect((await ctx.app.inject({ method: 'GET', url, headers: semToken })).statusCode).toBe(401);
      expect((await ctx.app.inject({ method: 'GET', url, headers: outraOrigem })).statusCode).toBe(401);
      expect((await ctx.app.inject({ method: 'GET', url, headers: outroHost })).statusCode).toBe(401);
    }
    const url = `/api/projects/${projeto.id}/design`;
    expect((await ctx.app.inject({ method: 'POST', url, headers: semToken, payload: {} })).statusCode).toBe(401);
    expect((await ctx.app.inject({ method: 'POST', url, headers: outraOrigem, payload: {} })).statusCode).toBe(401);
  });
});

describe('a tabela que já existia', () => {
  it('o bloco não abriu migration: a mesma tabela do schema inicial, coluna por coluna', () => {
    // A tabela nasceu no schema inicial e nenhuma migration depois dela encosta em `design_documents`.
    const tocam = listarMigrations().filter((nome) => fs.readFileSync(path.join(PASTA_MIGRATIONS, nome), 'utf8').includes('design_documents'));
    expect(tocam).toEqual(['20260902_schema_inicial.sql']);
    const ctx = novo();
    expect(ctx.db.pragma('table_info(design_documents)').map((c) => c.name))
      .toEqual(['id', 'project_id', 'versao', 'tokens_json', 'paginas_json', 'criado_em']);
  });

  it('a versão ativa é a de maior número, e não uma coluna que possa dessincronizar', async () => {
    const ctx = novo();
    const projeto = await criar(ctx);
    await post(ctx, `/api/projects/${projeto.id}/design`, documento());
    await post(ctx, `/api/projects/${projeto.id}/design`, documento({ paginas: [] }));
    const guardado = ctx.db.prepare('SELECT versao, tokens_json, paginas_json FROM design_documents WHERE project_id = ? ORDER BY versao').all(projeto.id);
    expect(guardado.map((l) => l.versao)).toEqual([1, 2]);
    // `paginas_json` guarda a parte estrutural inteira, e não só o array de páginas: é o que
    // grava a versão do catálogo sem abrir migration.
    expect(Object.keys(JSON.parse(guardado[0].paginas_json)).sort()).toEqual(['catalogo', 'paginas']);
    expect(JSON.parse(guardado[0].tokens_json).cor.fundo).toBe('#ffffff');
  });
});

describe('o design entra no hash do plano', () => {
  it('projeto sem design gera o mesmo plano de sempre, e o hash não muda por causa deste bloco', async () => {
    const ctx = novo();
    const projeto = await projetoPronto(ctx, workspace());
    const primeiro = await gerarPlano(ctx, projeto.id);
    const segundo = await gerarPlano(ctx, projeto.id);
    expect(primeiro.hashBlueprint).toBe(segundo.hashBlueprint);
    // Hash congelado do plano do preset `criar-site` sem documento de design, medido no commit
    // anterior a este bloco e conferido de novo depois dele. É o guarda de não-regressão da Fase 1:
    // projeto que nunca abriu o Studio tem que gerar exatamente o mesmo plano de sempre.
    // Este valor só muda junto com blueprint, preset ou template, e mudá-lo é decisão consciente.
    expect(primeiro.hashBlueprint).toBe('sha256:175a2bf0d3df9f7513ac3f69cd13c2beedad33fca9073cb2b4c70a9c64edb7db');
  });

  it('salvar design muda o hash, e o mesmo design gera sempre o mesmo hash', async () => {
    const ctx = novo();
    const projeto = await projetoPronto(ctx, workspace());
    const semDesign = await gerarPlano(ctx, projeto.id);

    await post(ctx, `/api/projects/${projeto.id}/design`, documento());
    const comDesign = await gerarPlano(ctx, projeto.id);
    expect(comDesign.hashBlueprint).not.toBe(semDesign.hashBlueprint);
    expect((await gerarPlano(ctx, projeto.id)).hashBlueprint).toBe(comDesign.hashBlueprint);

    await post(ctx, `/api/projects/${projeto.id}/design`, documento({ tokens: { cor: { acento: '#ff0055' } } }));
    const redesenhado = await gerarPlano(ctx, projeto.id);
    expect(redesenhado.hashBlueprint).not.toBe(comDesign.hashBlueprint);
  });

  it('os arquivos do plano ainda não mudam com o design: exportar é o bloco 6', async () => {
    const ctx = novo();
    const projeto = await projetoPronto(ctx, workspace());
    const antes = await gerarPlano(ctx, projeto.id);
    await post(ctx, `/api/projects/${projeto.id}/design`, documento({ tokens: { cor: { acento: '#ff0055' } } }));
    const depois = await gerarPlano(ctx, projeto.id);
    expect(depois.arquivos.map((a) => [a.caminho, a.conteudo])).toEqual(antes.arquivos.map((a) => [a.caminho, a.conteudo]));
  });

  it('aprovar o plano e depois salvar design faz materializar responder FORGE_PLAN_STALE sem escrever nada', async () => {
    const ctx = novo();
    const ws = workspace();
    const projeto = await projetoPronto(ctx, ws);
    const plano = await gerarPlano(ctx, projeto.id);

    await post(ctx, `/api/projects/${projeto.id}/design`, documento());
    const r = await post(ctx, `/api/projects/${projeto.id}/materializar`, { hashBlueprint: plano.hashBlueprint });
    expect(r.statusCode).toBe(409);
    expect(r.json().error.codigo).toBe('FORGE_PLAN_STALE');
    expect(fs.existsSync(plano.raiz)).toBe(false);
  });
});
