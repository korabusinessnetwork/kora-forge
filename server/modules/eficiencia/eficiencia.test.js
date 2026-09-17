import { describe, it, expect, afterEach } from 'vitest';
import { criarAppDeTeste } from '../../testes/apoio.js';
import { CATALOGO } from '../../../shared/eficiencia/motor.js';
import { catalogoSchema, painelSchema, recomendacoesSchema, chamadaSchema } from '../../../shared/schemas/eficiencia.js';
import { inicioDoPeriodo } from './servico.js';

let contexto;
afterEach(async () => {
  if (contexto) {
    await contexto.fechar();
    contexto = null;
  }
});
function novo(opcoes) {
  contexto = criarAppDeTeste(opcoes);
  return contexto;
}
const get = (ctx, url) => ctx.app.inject({ method: 'GET', url, headers: ctx.cabecalhos });
const post = (ctx, payload) => ctx.app.inject({ method: 'POST', url: '/api/eficiencia/chamadas', headers: ctx.cabecalhos, payload });
const eventos = (ctx) => ctx.db.prepare("SELECT nome, project_id, payload_json FROM events WHERE nome = 'copiloto.chamada.registrada'").all();

const chamadaBase = { etapa: 'identidade-redigir', modelo: 'claude-sonnet-5', estado: 'sucesso', tokensEntrada: 1000, tokensSaida: 500 };

describe('GET /api/eficiencia/catalogo', () => {
  it('devolve o catálogo versionado dentro do contrato', async () => {
    const ctx = novo();
    const resposta = await get(ctx, '/api/eficiencia/catalogo');
    expect(resposta.statusCode).toBe(200);
    const data = resposta.json().data;
    expect(catalogoSchema.parse(data)).toEqual(data);
    expect(data.modelos.map((m) => m.id)).toEqual(CATALOGO.modelos.map((m) => m.id));
  });
});

describe('GET /api/eficiencia/recomendacao', () => {
  it('sem etapa devolve as seis etapas da intenção; com etapa, só aquela', async () => {
    const ctx = novo();
    const todas = await get(ctx, '/api/eficiencia/recomendacao?intencao=site');
    expect(todas.statusCode).toBe(200);
    expect(recomendacoesSchema.parse(todas.json().data)).toEqual(todas.json().data);
    expect(todas.json().data.etapas).toHaveLength(6);

    const uma = await get(ctx, '/api/eficiencia/recomendacao?intencao=aplicacao&etapa=blueprint-revisar');
    expect(uma.json().data.etapas).toHaveLength(1);
    expect(uma.json().data.etapas[0].modelo.id).toBe('claude-opus-5');
  });

  it('intenção fora do enum, etapa desconhecida ou intenção ausente respondem 400 apontando o campo', async () => {
    const ctx = novo();
    const intencao = await get(ctx, '/api/eficiencia/recomendacao?intencao=jogo');
    expect(intencao.statusCode).toBe(400);
    expect(intencao.json().error.codigo).toBe('FORGE_VALIDATION');
    expect(intencao.json().error.detalhe.issues[0].caminho).toBe('intencao');

    const etapa = await get(ctx, '/api/eficiencia/recomendacao?intencao=site&etapa=x');
    expect(etapa.statusCode).toBe(400);
    expect(etapa.json().error.detalhe.issues[0].caminho).toBe('etapa');

    expect((await get(ctx, '/api/eficiencia/recomendacao')).statusCode).toBe(400);
  });
});

describe('POST /api/eficiencia/chamadas', () => {
  it('registra com custo calculado no servidor, devolve 201 no contrato e emite evento', async () => {
    const ctx = novo();
    const resposta = await post(ctx, { ...chamadaBase, tokensCacheLeitura: 2000, duracaoMs: 1200, intencao: 'site' });
    expect(resposta.statusCode).toBe(201);
    const data = resposta.json().data;
    expect(chamadaSchema.parse(data)).toEqual(data);
    // Sonnet 5: 1000 × 2 + 500 × 10 + 2000 × 0.2 = 7400 / 1e6
    expect(data.custoEstimadoUsd).toBe(0.0074);
    expect(data.lote).toBe(false);
    expect(data.projectId).toBeNull();
    expect(data.intencao).toBe('site');
    expect(data.duracaoMs).toBe(1200);
    expect(new Date(data.criadoEm).toISOString()).toBe(data.criadoEm);

    const linha = ctx.db.prepare('SELECT custo_estimado, tokens_cache_leitura, lote, intencao FROM copilot_calls WHERE id = ?').get(data.id);
    expect(linha).toEqual({ custo_estimado: 0.0074, tokens_cache_leitura: 2000, lote: 0, intencao: 'site' });

    const registrados = eventos(ctx);
    expect(registrados).toHaveLength(1);
    expect(JSON.parse(registrados[0].payload_json)).toEqual({ id: data.id, etapa: 'identidade-redigir', modelo: 'claude-sonnet-5', estado: 'sucesso', custoEstimadoUsd: 0.0074 });
  });

  it('lote aplica o desconto e cacheTtl 1h usa o preço de escrita de 1h', async () => {
    const ctx = novo();
    const lote = await post(ctx, { ...chamadaBase, lote: true });
    expect(lote.json().data.custoEstimadoUsd).toBe(0.0035);
    expect(lote.json().data.lote).toBe(true);
    const umaHora = await post(ctx, { etapa: 'nome-sugerir', modelo: 'claude-haiku-4-5', estado: 'sucesso', tokensCacheEscrita: 1000, cacheTtl: '1h' });
    expect(umaHora.json().data.custoEstimadoUsd).toBe(0.002);
  });

  it('custo enviado pelo cliente, modelo fora do catálogo, estado inválido e projeto inexistente respondem 400', async () => {
    const ctx = novo();
    const custo = await post(ctx, { ...chamadaBase, custoEstimadoUsd: 0 });
    expect(custo.statusCode).toBe(400);
    expect(custo.json().error.codigo).toBe('FORGE_VALIDATION');

    const modelo = await post(ctx, { ...chamadaBase, modelo: 'gpt-x' });
    expect(modelo.statusCode).toBe(400);
    expect(modelo.json().error.detalhe.issues[0].caminho).toBe('modelo');

    expect((await post(ctx, { ...chamadaBase, estado: 'ok' })).statusCode).toBe(400);

    const projeto = await post(ctx, { ...chamadaBase, projectId: 'nao-existe' });
    expect(projeto.statusCode).toBe(400);
    expect(projeto.json().error.detalhe.issues[0].caminho).toBe('projectId');
    expect(ctx.db.prepare('SELECT count(*) AS n FROM copilot_calls').get().n).toBe(0);
  });

  it('falha ao gravar o evento não altera a resposta', async () => {
    const ctx = novo();
    ctx.db.exec('DROP TABLE events');
    const resposta = await post(ctx, chamadaBase);
    expect(resposta.statusCode).toBe(201);
  });
});

describe('GET /api/eficiencia/painel', () => {
  async function semear(ctx) {
    for (let i = 0; i < 5; i += 1) await post(ctx, { ...chamadaBase, intencao: 'aplicacao' });
    await post(ctx, { ...chamadaBase, estado: 'invalido', intencao: 'aplicacao' });
    await post(ctx, { ...chamadaBase, modelo: 'claude-opus-5', intencao: 'site', etapa: 'blueprint-revisar', tokensEntrada: 8000, tokensSaida: 1500 });
    // Chamada antiga, fora do mês e dos 30 dias.
    ctx.db.prepare(`INSERT INTO copilot_calls (id, etapa, modelo, tokens_entrada, tokens_saida, custo_estimado, estado, criado_em, intencao)
      VALUES ('antiga', 'nome-sugerir', 'claude-haiku-4-5', 800, 200, 0.0018, 'sucesso', '2020-01-01T00:00:00.000Z', 'site')`).run();
  }

  it('sem chamadas devolve totais zerados, ranking vazio e o teto das configurações', async () => {
    const ctx = novo({ config: { copilotoTetoUsdPadrao: 8 } });
    const resposta = await get(ctx, '/api/eficiencia/painel');
    expect(resposta.statusCode).toBe(200);
    const data = resposta.json().data;
    expect(painelSchema.parse(data)).toEqual(data);
    expect(data).toEqual({
      periodo: 'mes',
      intencao: 'todas',
      tetoUsd: 8,
      totais: { chamadas: 0, sucessos: 0, taxaSucesso: 0, custoUsd: 0, percentualDoTeto: 0 },
      melhorModelo: null,
      ranking: [],
      porEtapa: [],
    });
  });

  it('agrega o período, ranqueia por sucesso por dólar e filtra por intenção', async () => {
    const ctx = novo();
    await semear(ctx);

    const mes = (await get(ctx, '/api/eficiencia/painel')).json().data;
    expect(mes.totais.chamadas).toBe(7);
    expect(mes.totais.sucessos).toBe(6);
    expect(mes.ranking.map((l) => l.modelo)).toEqual(['claude-sonnet-5', 'claude-opus-5']);
    expect(mes.ranking[0].pontuacao).toBe(100);
    expect(mes.ranking[0].amostraPequena).toBe(false);
    expect(mes.ranking[1].amostraPequena).toBe(true);
    expect(mes.melhorModelo).toBe('claude-sonnet-5');
    expect(mes.totais.percentualDoTeto).toBe(Math.round((mes.totais.custoUsd / 5) * 1000) / 10);
    expect(mes.porEtapa.map((e) => e.etapa)).toEqual(['blueprint-revisar', 'identidade-redigir']);

    const tudo = (await get(ctx, '/api/eficiencia/painel?periodo=tudo')).json().data;
    expect(tudo.totais.chamadas).toBe(8);
    expect(tudo.ranking.map((l) => l.modelo)).toContain('claude-haiku-4-5');

    const trinta = (await get(ctx, '/api/eficiencia/painel?periodo=30d')).json().data;
    expect(trinta.totais.chamadas).toBe(7);

    const site = (await get(ctx, '/api/eficiencia/painel?intencao=site&periodo=tudo')).json().data;
    expect(site.intencao).toBe('site');
    expect(site.totais.chamadas).toBe(2);
    expect(site.ranking.map((l) => l.modelo).sort()).toEqual(['claude-haiku-4-5', 'claude-opus-5']);
  });

  it('período ou intenção fora do enum e chave desconhecida respondem 400', async () => {
    const ctx = novo();
    expect((await get(ctx, '/api/eficiencia/painel?periodo=ano')).statusCode).toBe(400);
    expect((await get(ctx, '/api/eficiencia/painel?intencao=jogo')).statusCode).toBe(400);
    expect((await get(ctx, '/api/eficiencia/painel?x=1')).statusCode).toBe(400);
  });
});

describe('inicioDoPeriodo', () => {
  it('mês civil em UTC, 30 dias corridos, tudo sem filtro', () => {
    const agora = new Date('2026-09-15T13:00:00.000Z');
    expect(inicioDoPeriodo('mes', agora)).toBe('2026-09-01T00:00:00.000Z');
    expect(inicioDoPeriodo('30d', agora)).toBe('2026-08-16T13:00:00.000Z');
    expect(inicioDoPeriodo('tudo', agora)).toBeNull();
  });
});
