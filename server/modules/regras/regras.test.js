import { describe, it, expect, afterEach } from 'vitest';
import { criarAppDeTeste } from '../../testes/apoio.js';
import { carregarRegrasBuiltin, sincronizarRegras, PASTA_REGRAS_BUILTIN } from './servico.js';
import { abrirBanco } from '../../db/conexao.js';
import { migrar } from '../../db/migrar.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

let contexto;
afterEach(async () => { if (contexto) { await contexto.fechar(); contexto = null; } });
function novo() { contexto = criarAppDeTeste(); return contexto; }

const post = (ctx, url, payload) => ctx.app.inject({ method: 'POST', url, headers: ctx.cabecalhos, payload });
const get = (ctx, url) => ctx.app.inject({ method: 'GET', url, headers: ctx.cabecalhos });
const patch = (ctx, url, payload) => ctx.app.inject({ method: 'PATCH', url, headers: ctx.cabecalhos, payload });
const eventos = (ctx, projectId) => ctx.db.prepare('SELECT nome, payload_json FROM events WHERE project_id = ? ORDER BY id').all(projectId).map((e) => e.nome);

async function projetoWeb(ctx, nome = 'Alfa') {
  const r = await post(ctx, '/api/projects', { nome, presetId: 'criar-aplicacao-web' });
  expect(r.statusCode).toBe(201);
  return r.json().data.projeto;
}
const avaliar = (ctx, id) => post(ctx, `/api/projects/${id}/regras/avaliar`);
const acharHit = (corpo, regraId) => corpo.data.hits.find((hit) => hit.regraId === regraId);

const blueprintWeb = (extra = {}) => ({
  preset: { id: 'criar-aplicacao-web', versao: 1 },
  etapaAtual: 'arquitetura', etapasConcluidas: [], assumidas: [], respostas: {}, ...extra,
});

describe('carregar e sincronizar regras', () => {
  it('carrega o catálogo do repositório em ordem de nome', () => {
    const lista = carregarRegrasBuiltin();
    expect(lista).toHaveLength(16);
    expect([...lista.map((r) => r.id)].sort()).toEqual(lista.map((r) => r.id));
    expect(PASTA_REGRAS_BUILTIN.replace(/[\\/]$/, '').endsWith('regras')).toBe(true);
  });

  it('regra inválida lança FORGE_VALIDATION citando o arquivo', () => {
    const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'kora-forge-regras-'));
    fs.writeFileSync(path.join(pasta, 'ruim.json'), JSON.stringify({ id: 'ruim', versao: 1, severidade: 'aviso', resolucao: 'humana', dispensavel: false, titulo: 't', explicacao: 'e', quando: { campo: 'x', operador: 'explode' }, efeitos: [{ tipo: 'avisar' }] }));
    let erro;
    try { carregarRegrasBuiltin(pasta); } catch (e) { erro = e; }
    expect(erro?.codigo).toBe('FORGE_VALIDATION');
    expect(erro.message).toContain('ruim.json');
    fs.rmSync(pasta, { recursive: true, force: true });
  });

  it('sincronizar é idempotente e atualiza quando o JSON muda', () => {
    const db = abrirBanco(':memory:');
    migrar(db);
    const lista = carregarRegrasBuiltin();
    expect(sincronizarRegras(db, lista).inseridas).toHaveLength(16);
    expect(sincronizarRegras(db, lista).atualizadas).toEqual([]);
    expect(db.prepare('SELECT count(*) AS n FROM rules').get().n).toBe(16);
    const alterada = lista.map((r) => (r.id === 'custo-servico-pago' ? { ...r, versao: 2 } : r));
    expect(sincronizarRegras(db, alterada).atualizadas).toEqual(['custo-servico-pago']);
    expect(db.prepare('SELECT versao FROM rules WHERE id = ?').get('custo-servico-pago').versao).toBe(2);
    db.close();
  });
});

describe('POST /projects/:id/regras/avaliar', () => {
  it('projeto web novo tem bloqueios abertos e não pode materializar', async () => {
    const ctx = novo();
    const projeto = await projetoWeb(ctx);
    const r = await avaliar(ctx, projeto.id);
    expect(r.statusCode).toBe(200);
    const corpo = r.json();
    expect(corpo.data.podeMaterializar).toBe(false);
    expect(corpo.data.bloqueios).toBeGreaterThan(0);
    const multitenant = acharHit(corpo, 'arq-multitenant-obrigatorio');
    expect(multitenant).toMatchObject({ severidade: 'bloqueio', estado: 'aberto', etapa: 'arquitetura', campo: 'arquitetura.multiTenant', dispensavel: false, resolucao: 'humana' });
    expect(multitenant.explicacao.length).toBeGreaterThan(20);
    expect(eventos(ctx, projeto.id)).toContain('regra.disparou');
  });

  it('hit de resolução automática nasce resolvido e não bloqueia', async () => {
    const ctx = novo();
    const projeto = await projetoWeb(ctx);
    await post(ctx, `/api/projects/${projeto.id}/blueprint`, blueprintWeb({ respostas: { arquitetura: { modelo: 'A', stack: ['react', 'supabase'], multiTenant: true, whiteLabel: true, auth: true, deploy: 'vercel' } } }));
    const corpo = (await avaliar(ctx, projeto.id)).json();
    expect(acharHit(corpo, 'seg-rls-obrigatorio')).toMatchObject({ estado: 'resolvido', severidade: 'bloqueio', resolucao: 'automatica' });
    expect(acharHit(corpo, 'arq-auth-exige-rota-protegida')).toMatchObject({ estado: 'resolvido', severidade: 'aviso' });
    expect(acharHit(corpo, 'doc-fundacao-obrigatoria')).toMatchObject({ estado: 'resolvido' });
    expect(acharHit(corpo, 'arq-multitenant-obrigatorio')).toBeUndefined();
  });

  it('reavaliar não duplica hit e preserva criado_em', async () => {
    const ctx = novo();
    const projeto = await projetoWeb(ctx);
    await avaliar(ctx, projeto.id);
    const antes = ctx.db.prepare('SELECT id, criado_em FROM rule_hits WHERE project_id = ? AND rule_id = ?').get(projeto.id, 'arq-multitenant-obrigatorio');
    await avaliar(ctx, projeto.id);
    await avaliar(ctx, projeto.id);
    const linhas = ctx.db.prepare('SELECT id, criado_em FROM rule_hits WHERE project_id = ? AND rule_id = ?').all(projeto.id, 'arq-multitenant-obrigatorio');
    expect(linhas).toHaveLength(1);
    expect(linhas[0]).toEqual(antes);
  });

  it('corrigir o blueprint resolve o hit sozinho, e o problema de volta reabre', async () => {
    const ctx = novo();
    const projeto = await projetoWeb(ctx);
    await avaliar(ctx, projeto.id);
    const arquitetura = (multiTenant) => ({ modelo: 'A', stack: ['react'], multiTenant, whiteLabel: true, auth: false, deploy: 'vercel' });

    await post(ctx, `/api/projects/${projeto.id}/blueprint`, blueprintWeb({ assumidas: ['design'], respostas: { arquitetura: arquitetura(true), design: {} } }));
    const corrigido = (await avaliar(ctx, projeto.id)).json();
    expect(acharHit(corrigido, 'arq-multitenant-obrigatorio').estado).toBe('resolvido');
    expect(acharHit(corrigido, 'ux-tem-ui-exige-design-system').estado).toBe('resolvido');
    expect(corrigido.data.podeMaterializar).toBe(true);

    await post(ctx, `/api/projects/${projeto.id}/blueprint`, blueprintWeb({ assumidas: ['design'], respostas: { arquitetura: arquitetura(false), design: {} } }));
    const voltou = (await avaliar(ctx, projeto.id)).json();
    expect(acharHit(voltou, 'arq-multitenant-obrigatorio').estado).toBe('aberto');
    expect(voltou.data.podeMaterializar).toBe(false);
  });

  it('salvar blueprint já reavalia, sem precisar chamar avaliar', async () => {
    const ctx = novo();
    const projeto = await projetoWeb(ctx);
    expect(ctx.db.prepare('SELECT count(*) AS n FROM rule_hits WHERE project_id = ?').get(projeto.id).n).toBe(0);
    await post(ctx, `/api/projects/${projeto.id}/blueprint`, blueprintWeb());
    expect(ctx.db.prepare('SELECT count(*) AS n FROM rule_hits WHERE project_id = ?').get(projeto.id).n).toBeGreaterThan(0);
  });

  it('projeto inexistente responde 404', async () => {
    const ctx = novo();
    expect((await avaliar(ctx, 'nao-existe')).statusCode).toBe(404);
    expect((await get(ctx, '/api/projects/nao-existe/regras')).statusCode).toBe(404);
  });
});

describe('GET /projects/:id/regras', () => {
  it('devolve os hits gravados sem reavaliar', async () => {
    const ctx = novo();
    const projeto = await projetoWeb(ctx);
    expect((await get(ctx, `/api/projects/${projeto.id}/regras`)).json().data.hits).toEqual([]);
    await avaliar(ctx, projeto.id);
    const depois = (await get(ctx, `/api/projects/${projeto.id}/regras`)).json();
    expect(depois.data.hits.length).toBeGreaterThan(0);
    expect(depois.data.podeMaterializar).toBe(false);
  });
});

describe('PATCH /projects/:id/regras/:hitId', () => {
  async function comHitDispensavel(ctx) {
    const projeto = await projetoWeb(ctx);
    await post(ctx, `/api/projects/${projeto.id}/blueprint`, blueprintWeb({ respostas: { seguranca: { dadoPessoal: false, dadoFinanceiro: false, compliance: [], tierGratuito: false, observacoes: '' } } }));
    const corpo = (await avaliar(ctx, projeto.id)).json();
    return { projeto, hit: acharHit(corpo, 'custo-servico-pago') };
  }

  it('dispensar exige justificativa de tamanho mínimo e registra evento', async () => {
    const ctx = novo();
    const { projeto, hit } = await comHitDispensavel(ctx);
    expect(hit).toMatchObject({ estado: 'aberto', dispensavel: true });

    const curta = await patch(ctx, `/api/projects/${projeto.id}/regras/${hit.id}`, { estado: 'dispensado', justificativa: 'curta' });
    expect(curta.statusCode).toBe(400);
    expect(curta.json().error.detalhe.issues[0].caminho).toBe('justificativa');

    const semJustificativa = await patch(ctx, `/api/projects/${projeto.id}/regras/${hit.id}`, { estado: 'dispensado' });
    expect(semJustificativa.statusCode).toBe(400);

    const ok = await patch(ctx, `/api/projects/${projeto.id}/regras/${hit.id}`, { estado: 'dispensado', justificativa: 'A Vercel cobre este projeto no plano gratuito.' });
    expect(ok.statusCode).toBe(200);
    const dispensado = acharHit(ok.json(), 'custo-servico-pago');
    expect(dispensado).toMatchObject({ estado: 'dispensado' });
    expect(dispensado.justificativa).toContain('Vercel');
    expect(eventos(ctx, projeto.id)).toContain('regra.dispensada');
  });

  it('dispensa sobrevive à reavaliação enquanto o problema existir', async () => {
    const ctx = novo();
    const { projeto, hit } = await comHitDispensavel(ctx);
    await patch(ctx, `/api/projects/${projeto.id}/regras/${hit.id}`, { estado: 'dispensado', justificativa: 'Decisão registrada com o dono.' });
    const depois = (await avaliar(ctx, projeto.id)).json();
    expect(acharHit(depois, 'custo-servico-pago').estado).toBe('dispensado');
  });

  it('regra não dispensável recusa a dispensa', async () => {
    const ctx = novo();
    const projeto = await projetoWeb(ctx);
    const hit = acharHit((await avaliar(ctx, projeto.id)).json(), 'arq-multitenant-obrigatorio');
    const r = await patch(ctx, `/api/projects/${projeto.id}/regras/${hit.id}`, { estado: 'dispensado', justificativa: 'não quero multi-tenant agora' });
    expect(r.statusCode).toBe(400);
    expect(r.json().error.detalhe.issues[0].caminho).toBe('estado');
    expect(r.json().error.mensagem).toMatch(/não pode ser dispensado/i);
  });

  it('marcar como ignorado limpa a justificativa e não bloqueia mais', async () => {
    const ctx = novo();
    const { projeto, hit } = await comHitDispensavel(ctx);
    const r = await patch(ctx, `/api/projects/${projeto.id}/regras/${hit.id}`, { estado: 'ignorado' });
    expect(r.statusCode).toBe(200);
    const ignorado = acharHit(r.json(), 'custo-servico-pago');
    expect(ignorado.estado).toBe('ignorado');
    expect(ignorado.justificativa).toBeNull();
  });

  it('hit de outro projeto responde 404, estado inválido responde 400', async () => {
    const ctx = novo();
    const { projeto, hit } = await comHitDispensavel(ctx);
    const outro = await projetoWeb(ctx, 'Beta');
    expect((await patch(ctx, `/api/projects/${outro.id}/regras/${hit.id}`, { estado: 'ignorado' })).statusCode).toBe(404);
    expect((await patch(ctx, `/api/projects/${projeto.id}/regras/inexistente`, { estado: 'ignorado' })).statusCode).toBe(404);
    expect((await patch(ctx, `/api/projects/${projeto.id}/regras/${hit.id}`, { estado: 'voando' })).statusCode).toBe(400);
    expect((await patch(ctx, `/api/projects/${projeto.id}/regras/${hit.id}`, { estado: 'ignorado', extra: 1 })).statusCode).toBe(400);
  });

  it('projeto arquivado não aceita decisão sobre aviso', async () => {
    const ctx = novo();
    const { projeto, hit } = await comHitDispensavel(ctx);
    await ctx.app.inject({ method: 'PATCH', url: `/api/projects/${projeto.id}`, headers: ctx.cabecalhos, payload: { arquivado: true } });
    const r = await patch(ctx, `/api/projects/${projeto.id}/regras/${hit.id}`, { estado: 'ignorado' });
    expect(r.statusCode).toBe(400);
    expect(r.json().error.mensagem).toMatch(/arquivado/i);
  });
});
