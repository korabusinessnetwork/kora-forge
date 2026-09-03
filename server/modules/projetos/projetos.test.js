import { describe, it, expect, afterEach } from 'vitest';
import { criarAppDeTeste } from '../../testes/apoio.js';
import { projetoComBlueprintSchema, listaProjetosSchema } from '../../../shared/schemas/projeto.js';

let contexto;
afterEach(async () => { if (contexto) { await contexto.fechar(); contexto = null; } });
function novo() { contexto = criarAppDeTeste(); return contexto; }

const post = (ctx, url, payload) => ctx.app.inject({ method: 'POST', url, headers: ctx.cabecalhos, payload });
const get = (ctx, url) => ctx.app.inject({ method: 'GET', url, headers: ctx.cabecalhos });
const patch = (ctx, url, payload) => ctx.app.inject({ method: 'PATCH', url, headers: ctx.cabecalhos, payload });
const criar = async (ctx, nome, presetId = 'criar-site') => {
  const r = await post(ctx, '/api/projects', { nome, presetId });
  expect(r.statusCode).toBe(201);
  return r.json().data;
};
const eventos = (ctx, projectId) => ctx.db.prepare('SELECT nome, project_id, payload_json FROM events WHERE project_id = ? ORDER BY id').all(projectId);

describe('POST /projects', () => {
  it('cria projeto em rascunho com slug, preset, primeira etapa e blueprint v1 ativo', async () => {
    const ctx = novo();
    const { projeto, blueprint } = await criar(ctx, 'Café da Manhã', 'criar-aplicacao-web');
    expect(projetoComBlueprintSchema.safeParse({ projeto, blueprint }).success).toBe(true);
    expect(projeto).toMatchObject({ nome: 'Café da Manhã', slug: 'cafe-da-manha', presetId: 'criar-aplicacao-web', presetNome: 'Criar Aplicação Web', presetVersao: 1, status: 'rascunho', etapaAtual: 'identidade', caminhoDisco: null });
    expect(blueprint).toMatchObject({ versao: 1, ativo: true, payload: { preset: { id: 'criar-aplicacao-web', versao: 1 }, etapaAtual: 'identidade', etapasConcluidas: [], assumidas: [], respostas: {} } });
    const registrados = eventos(ctx, projeto.id);
    expect(registrados.map((e) => e.nome)).toEqual(['projeto.criado']);
    expect(JSON.parse(registrados[0].payload_json)).toEqual({ nome: 'Café da Manhã', slug: 'cafe-da-manha', presetId: 'criar-aplicacao-web', presetVersao: 1 });
  });

  it('nome vazio, só símbolo ou longo demais responde 400 em nome', async () => {
    const ctx = novo();
    for (const nome of ['', '   ', '🚀🚀', 'x'.repeat(81)]) {
      const r = await post(ctx, '/api/projects', { nome, presetId: 'criar-site' });
      expect(r.statusCode).toBe(400);
      expect(r.json().error.detalhe.issues[0].caminho).toBe('nome');
    }
  });

  it('presetId inexistente responde 400 em presetId, chave desconhecida responde 400', async () => {
    const ctx = novo();
    const r = await post(ctx, '/api/projects', { nome: 'X', presetId: 'nao-existe' });
    expect(r.statusCode).toBe(400);
    expect(r.json().error.detalhe.issues[0].caminho).toBe('presetId');
    const extra = await post(ctx, '/api/projects', { nome: 'X', presetId: 'criar-site', slug: 'forcado' });
    expect(extra.statusCode).toBe(400);
  });

  it('slug já usado responde 400 em nome citando o slug', async () => {
    const ctx = novo();
    await criar(ctx, 'Meu App');
    const r = await post(ctx, '/api/projects', { nome: 'meu-app', presetId: 'criar-site' });
    expect(r.statusCode).toBe(400);
    expect(r.json().error.detalhe.issues[0]).toEqual({ caminho: 'nome', mensagem: expect.stringContaining('meu-app') });
  });
});

describe('GET /projects', () => {
  it('lista sem arquivados, ordenada por atualização, e filtra por status e busca', async () => {
    const ctx = novo();
    const a = await criar(ctx, 'Alfa');
    const b = await criar(ctx, 'Beta Site');
    const c = await criar(ctx, 'Gama');
    await patch(ctx, `/api/projects/${c.projeto.id}`, { arquivado: true });
    await patch(ctx, `/api/projects/${a.projeto.id}`, { nome: 'Alfa Renomeado' });

    const padrao = await get(ctx, '/api/projects');
    expect(padrao.statusCode).toBe(200);
    expect(listaProjetosSchema.safeParse(padrao.json().data).success).toBe(true);
    expect(padrao.json().data.map((p) => p.nome)).toEqual(['Alfa Renomeado', 'Beta Site']);

    expect((await get(ctx, '/api/projects?status=arquivado')).json().data.map((p) => p.nome)).toEqual(['Gama']);
    expect((await get(ctx, '/api/projects?status=rascunho')).json().data).toHaveLength(2);
    expect((await get(ctx, '/api/projects?status=')).json().data).toHaveLength(2);
    expect((await get(ctx, '/api/projects?busca=BETA')).json().data.map((p) => p.slug)).toEqual(['beta-site']);
    expect((await get(ctx, '/api/projects?busca=beta-si')).json().data.map((p) => p.nome)).toEqual(['Beta Site']);
    expect((await get(ctx, '/api/projects?busca=alfa')).json().data.map((p) => p.slug)).toEqual(['alfa']);
    expect((await get(ctx, '/api/projects?busca=%25')).json().data).toHaveLength(0);
    expect((await get(ctx, '/api/projects?status=roxo')).statusCode).toBe(400);
    expect(b.projeto.id).toBeTruthy();
  });
});

describe('GET e PATCH /projects/:id', () => {
  it('devolve projeto com blueprint ativo e 404 para id desconhecido', async () => {
    const ctx = novo();
    const { projeto } = await criar(ctx, 'Alfa');
    const r = await get(ctx, `/api/projects/${projeto.id}`);
    expect(r.statusCode).toBe(200);
    expect(r.json().data.blueprint.versao).toBe(1);
    expect((await get(ctx, '/api/projects/nao-existe')).statusCode).toBe(404);
    expect((await get(ctx, '/api/projects/nao-existe/blueprint/versoes')).statusCode).toBe(404);
  });

  it('renomear mantém o slug e emite evento; patch vazio não emite', async () => {
    const ctx = novo();
    const { projeto } = await criar(ctx, 'Alfa');
    const r = await patch(ctx, `/api/projects/${projeto.id}`, { nome: 'Alfa Dois' });
    expect(r.json().data.projeto).toMatchObject({ nome: 'Alfa Dois', slug: 'alfa' });
    const vazio = await patch(ctx, `/api/projects/${projeto.id}`, {});
    expect(vazio.statusCode).toBe(200);
    expect(eventos(ctx, projeto.id).map((e) => e.nome)).toEqual(['projeto.criado', 'projeto.renomeado']);
    expect((await patch(ctx, `/api/projects/${projeto.id}`, { status: 'arquivado' })).statusCode).toBe(400);
  });

  it('arquivar e restaurar: rascunho volta como rascunho, materializado volta como materializado', async () => {
    const ctx = novo();
    const { projeto } = await criar(ctx, 'Alfa');
    expect((await patch(ctx, `/api/projects/${projeto.id}`, { arquivado: true })).json().data.projeto.status).toBe('arquivado');
    expect((await patch(ctx, `/api/projects/${projeto.id}`, { arquivado: true })).statusCode).toBe(200);
    expect((await patch(ctx, `/api/projects/${projeto.id}`, { arquivado: false })).json().data.projeto.status).toBe('rascunho');

    ctx.db.prepare("UPDATE projects SET status = 'materializado', caminho_disco = '/tmp/alfa' WHERE id = ?").run(projeto.id);
    await patch(ctx, `/api/projects/${projeto.id}`, { arquivado: true });
    expect((await patch(ctx, `/api/projects/${projeto.id}`, { arquivado: false })).json().data.projeto.status).toBe('materializado');
    expect(eventos(ctx, projeto.id).map((e) => e.nome)).toEqual(['projeto.criado', 'projeto.arquivado', 'projeto.restaurado', 'projeto.arquivado', 'projeto.restaurado']);
  });
});

describe('blueprint', () => {
  const blueprintDe = (projeto, extra = {}) => ({
    preset: { id: projeto.presetId, versao: projeto.presetVersao }, etapaAtual: 'escopo', etapasConcluidas: ['identidade'], assumidas: [], respostas: { identidade: { nome: 'Alfa' } }, ...extra,
  });

  it('salvar cria versão n+1 ativa, desativa a anterior, atualiza a etapa e emite evento', async () => {
    const ctx = novo();
    const { projeto } = await criar(ctx, 'Alfa');
    const r = await post(ctx, `/api/projects/${projeto.id}/blueprint`, blueprintDe(projeto));
    expect(r.statusCode).toBe(200);
    expect(r.json().data.blueprint).toMatchObject({ versao: 2, ativo: true });
    expect(r.json().data.projeto.etapaAtual).toBe('escopo');
    await post(ctx, `/api/projects/${projeto.id}/blueprint`, blueprintDe(projeto, { etapaAtual: 'design' }));

    const versoes = await get(ctx, `/api/projects/${projeto.id}/blueprint/versoes`);
    expect(versoes.json().data).toMatchObject([{ versao: 3, ativo: true }, { versao: 2, ativo: false }, { versao: 1, ativo: false }]);
    expect(ctx.db.prepare('SELECT count(*) AS n FROM blueprints WHERE project_id = ? AND ativo = 1').get(projeto.id).n).toBe(1);
    expect(eventos(ctx, projeto.id).filter((e) => e.nome === 'blueprint.salvo')).toHaveLength(2);
    const aberto = await get(ctx, `/api/projects/${projeto.id}`);
    expect(aberto.json().data.blueprint.payload.etapaAtual).toBe('design');
  });

  it('preset diferente, projeto arquivado, chave desconhecida e etapa inválida respondem 400', async () => {
    const ctx = novo();
    const { projeto } = await criar(ctx, 'Alfa');
    const outroPreset = await post(ctx, `/api/projects/${projeto.id}/blueprint`, blueprintDe(projeto, { preset: { id: 'criar-aplicacao-web', versao: 1 } }));
    expect(outroPreset.statusCode).toBe(400);
    expect(outroPreset.json().error.detalhe.issues[0].caminho).toBe('preset');
    expect((await post(ctx, `/api/projects/${projeto.id}/blueprint`, blueprintDe(projeto, { preset: { id: projeto.presetId, versao: 9 } }))).statusCode).toBe(400);
    expect((await post(ctx, `/api/projects/${projeto.id}/blueprint`, blueprintDe(projeto, { extra: 1 }))).statusCode).toBe(400);
    expect((await post(ctx, `/api/projects/${projeto.id}/blueprint`, blueprintDe(projeto, { etapaAtual: 'voar' }))).statusCode).toBe(400);
    await patch(ctx, `/api/projects/${projeto.id}`, { arquivado: true });
    const arquivado = await post(ctx, `/api/projects/${projeto.id}/blueprint`, blueprintDe(projeto));
    expect(arquivado.statusCode).toBe(400);
    expect(arquivado.json().error.mensagem).toMatch(/arquivado/i);
  });

  it('não existe rota para apagar projeto', async () => {
    const ctx = novo();
    const { projeto } = await criar(ctx, 'Alfa');
    const r = await ctx.app.inject({ method: 'DELETE', url: `/api/projects/${projeto.id}`, headers: ctx.cabecalhos });
    expect(r.statusCode).toBe(404);
    expect((await get(ctx, `/api/projects/${projeto.id}`)).statusCode).toBe(200);
  });
});

describe('blueprint contra as etapas do preset', () => {
  // criar-site não tem as etapas arquitetura, dados nem apis.
  const doSite = (extra = {}) => ({
    preset: { id: 'criar-site', versao: 1 }, etapaAtual: 'escopo', etapasConcluidas: [], assumidas: [], respostas: {}, ...extra,
  });

  it('etapaAtual fora do preset responde 400 apontando o campo', async () => {
    const ctx = novo();
    const { projeto } = await criar(ctx, 'Alfa');
    const r = await post(ctx, `/api/projects/${projeto.id}/blueprint`, doSite({ etapaAtual: 'dados' }));
    expect(r.statusCode).toBe(400);
    expect(r.json().error.detalhe.issues[0].caminho).toBe('etapaAtual');
    expect(r.json().error.mensagem).toContain('dados');
  });

  it('etapa fora do preset em concluídas ou assumidas responde 400', async () => {
    const ctx = novo();
    const { projeto } = await criar(ctx, 'Alfa');
    const concluidas = await post(ctx, `/api/projects/${projeto.id}/blueprint`, doSite({ etapasConcluidas: ['arquitetura'] }));
    expect(concluidas.statusCode).toBe(400);
    expect(concluidas.json().error.detalhe.issues[0].caminho).toBe('etapasConcluidas');
    const assumidas = await post(ctx, `/api/projects/${projeto.id}/blueprint`, doSite({ assumidas: ['apis'] }));
    expect(assumidas.statusCode).toBe(400);
    expect(assumidas.json().error.detalhe.issues[0].caminho).toBe('assumidas');
  });

  it('etapa repetida e etapa concluída e assumida ao mesmo tempo respondem 400', async () => {
    const ctx = novo();
    const { projeto } = await criar(ctx, 'Alfa');
    expect((await post(ctx, `/api/projects/${projeto.id}/blueprint`, doSite({ assumidas: ['design', 'design'] }))).statusCode).toBe(400);
    expect((await post(ctx, `/api/projects/${projeto.id}/blueprint`, doSite({ etapasConcluidas: ['design'], assumidas: ['design'] }))).statusCode).toBe(400);
  });

  it('etapas do preset passam, com respostas tipadas, e criam versão nova', async () => {
    const ctx = novo();
    const { projeto } = await criar(ctx, 'Alfa');
    const r = await post(ctx, `/api/projects/${projeto.id}/blueprint`, doSite({
      etapasConcluidas: ['identidade'], assumidas: ['design'],
      respostas: { identidade: { nome: 'Alfa', essencia: 'e', problema: 'p', valor: 'v' }, design: {} },
    }));
    expect(r.statusCode).toBe(200);
    expect(r.json().data.blueprint.versao).toBe(2);
    expect(r.json().data.blueprint.payload.respostas.identidade.essencia).toBe('e');
    expect(eventos(ctx, projeto.id).filter((e) => e.nome === 'blueprint.salvo')).toHaveLength(1);
  });
});
