import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, afterEach } from 'vitest';
import { z } from 'zod';
import { criarAppDeTeste, criarPastaTemporaria, TOKEN_TESTE } from './testes/apoio.js';
import { codigosErro } from '../shared/erros.js';
import { envelopeSchema } from '../shared/schemas/envelope.js';

const rotasDeTeste = [async (api) => {
  api.get('/teste/explode', { config: { schemaSaida: z.any() } }, async () => {
    throw new Error('segredo interno 12345');
  });
  api.get('/teste/saida-invalida', { config: { schemaSaida: z.strictObject({ ok: z.boolean() }) } }, async () => ({ ok: 'sim' }));
  api.get('/teste/sem-schema', async () => ({ ok: true }));
  api.post('/teste/eco', { config: { schemaSaida: z.any() } }, async (request) => request.body);
}];

let contexto;
afterEach(async () => {
  if (contexto) {
    await contexto.fechar();
    contexto = null;
  }
});
function novo() {
  contexto = criarAppDeTeste({ pluginsApi: rotasDeTeste });
  return contexto;
}

describe('guarda na API', () => {
  it('sem token responde 401 FORGE_UNAUTHORIZED com data null', async () => {
    const { app, cabecalhos } = novo();
    const { 'x-forge-token': _token, ...semToken } = cabecalhos;
    const resposta = await app.inject({ method: 'GET', url: '/api/health', headers: semToken });
    expect(resposta.statusCode).toBe(401);
    const corpo = resposta.json();
    expect(corpo.error.codigo).toBe('FORGE_UNAUTHORIZED');
    expect(corpo.data).toBeNull();
  });

  it('token errado responde 401', async () => {
    const { app, cabecalhos } = novo();
    const resposta = await app.inject({ method: 'GET', url: '/api/health', headers: { ...cabecalhos, 'x-forge-token': 'b'.repeat(64) } });
    expect(resposta.statusCode).toBe(401);
  });

  it('Origin fora da allowlist responde 401 mesmo com token válido', async () => {
    const { app, cabecalhos } = novo();
    const resposta = await app.inject({ method: 'GET', url: '/api/health', headers: { ...cabecalhos, origin: 'http://evil.example' } });
    expect(resposta.statusCode).toBe(401);
  });

  it('PATCH sem Origin responde 401, GET sem Origin passa', async () => {
    const { app, cabecalhos } = novo();
    const { origin: _origin, ...semOrigin } = cabecalhos;
    const patch = await app.inject({ method: 'PATCH', url: '/api/settings', headers: semOrigin, payload: {} });
    expect(patch.statusCode).toBe(401);
    const get = await app.inject({ method: 'GET', url: '/api/health', headers: semOrigin });
    expect(get.statusCode).toBe(200);
  });

  it('Host fora da lista responde 401', async () => {
    const { app, cabecalhos } = novo();
    const resposta = await app.inject({ method: 'GET', url: '/api/health', headers: { ...cabecalhos, host: 'forge.evil.example' } });
    expect(resposta.statusCode).toBe(401);
  });

  it('todas as recusas usam a mesma mensagem, sem dizer qual checagem falhou', async () => {
    const { app, cabecalhos } = novo();
    const semToken = { ...cabecalhos };
    delete semToken['x-forge-token'];
    const variantes = [
      semToken,
      { ...cabecalhos, 'x-forge-token': 'x' },
      { ...cabecalhos, origin: 'http://evil.example' },
      { ...cabecalhos, host: 'evil.example' },
    ];
    const mensagens = new Set();
    for (const headers of variantes) {
      const resposta = await app.inject({ method: 'GET', url: '/api/health', headers });
      expect(resposta.statusCode).toBe(401);
      mensagens.add(resposta.json().error.mensagem);
      expect(JSON.stringify(resposta.json().error.detalhe)).toBe('{}');
    }
    expect(mensagens.size).toBe(1);
  });

  it('não existe CORS: nenhuma resposta traz Access-Control-Allow-Origin', async () => {
    const { app, cabecalhos } = novo();
    const ok = await app.inject({ method: 'GET', url: '/api/health', headers: cabecalhos });
    const negada = await app.inject({ method: 'GET', url: '/api/health', headers: { ...cabecalhos, origin: 'http://evil.example' } });
    expect(ok.headers['access-control-allow-origin']).toBeUndefined();
    expect(negada.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('rota desconhecida sem token também responde 401, sem revelar rotas', async () => {
    const { app } = novo();
    const resposta = await app.inject({ method: 'GET', url: '/api/nao-existe', headers: { host: '127.0.0.1:7337' } });
    expect(resposta.statusCode).toBe(401);
  });

  it('aceita a requisição de referência com o token de sessão', async () => {
    const { app, cabecalhos } = novo();
    const resposta = await app.inject({ method: 'GET', url: '/api/health', headers: { ...cabecalhos, 'x-forge-token': TOKEN_TESTE } });
    expect(resposta.statusCode).toBe(200);
  });
});

describe('envelope e erros', () => {
  it('sucesso tem exatamente data, error e meta, e passa no schema compartilhado', async () => {
    const { app, cabecalhos } = novo();
    const resposta = await app.inject({ method: 'GET', url: '/api/health', headers: cabecalhos });
    expect(resposta.statusCode).toBe(200);
    const corpo = resposta.json();
    expect(Object.keys(corpo).sort()).toEqual(['data', 'error', 'meta']);
    expect(corpo.error).toBeNull();
    expect(typeof corpo.meta.requestId).toBe('string');
    expect(typeof corpo.meta.duracaoMs).toBe('number');
    expect(corpo.meta.duracaoMs).toBeGreaterThanOrEqual(0);
    expect(envelopeSchema.safeParse(corpo).success).toBe(true);
  });

  it('rota inexistente sob /api responde 404 FORGE_NOT_FOUND no envelope', async () => {
    const { app, cabecalhos } = novo();
    const resposta = await app.inject({ method: 'GET', url: '/api/nao-existe', headers: cabecalhos });
    expect(resposta.statusCode).toBe(404);
    const corpo = resposta.json();
    expect(corpo.error.codigo).toBe('FORGE_NOT_FOUND');
    expect(Object.keys(corpo).sort()).toEqual(['data', 'error', 'meta']);
  });

  it('chave desconhecida no PATCH responde 400 FORGE_VALIDATION com issues', async () => {
    const { app, cabecalhos } = novo();
    const resposta = await app.inject({ method: 'PATCH', url: '/api/settings', headers: cabecalhos, payload: { inventada: 1 } });
    expect(resposta.statusCode).toBe(400);
    const corpo = resposta.json();
    expect(corpo.error.codigo).toBe('FORGE_VALIDATION');
    expect(Array.isArray(corpo.error.detalhe.issues)).toBe(true);
    expect(corpo.error.detalhe.issues[0]).toHaveProperty('caminho');
    expect(corpo.error.detalhe.issues[0]).toHaveProperty('mensagem');
  });

  it('JSON malformado responde 400 FORGE_VALIDATION', async () => {
    const { app, cabecalhos } = novo();
    const resposta = await app.inject({
      method: 'PATCH',
      url: '/api/settings',
      headers: { ...cabecalhos, 'content-type': 'application/json' },
      payload: '{"tema":',
    });
    expect(resposta.statusCode).toBe(400);
    expect(resposta.json().error.codigo).toBe('FORGE_VALIDATION');
  });

  it('erro inesperado responde 500 FORGE_INTERNAL sem vazar mensagem nem stack', async () => {
    const { app, cabecalhos } = novo();
    const resposta = await app.inject({ method: 'GET', url: '/api/teste/explode', headers: cabecalhos });
    expect(resposta.statusCode).toBe(500);
    const corpo = resposta.json();
    expect(corpo.error.codigo).toBe('FORGE_INTERNAL');
    expect(resposta.body).not.toContain('segredo interno');
    expect(resposta.body).not.toContain('stack');
    expect(corpo.data).toBeNull();
  });

  it('saída fora do schemaSaida vira 500 FORGE_INTERNAL', async () => {
    const { app, cabecalhos } = novo();
    const resposta = await app.inject({ method: 'GET', url: '/api/teste/saida-invalida', headers: cabecalhos });
    expect(resposta.statusCode).toBe(500);
    expect(resposta.json().error.codigo).toBe('FORGE_INTERNAL');
    expect(resposta.body).not.toContain('"sim"');
  });

  it('rota sem schemaSaida vira 500 FORGE_INTERNAL', async () => {
    const { app, cabecalhos } = novo();
    const resposta = await app.inject({ method: 'GET', url: '/api/teste/sem-schema', headers: cabecalhos });
    expect(resposta.statusCode).toBe(500);
    expect(resposta.json().error.codigo).toBe('FORGE_INTERNAL');
  });

  it('todo código de erro devolvido pertence à lista compartilhada', async () => {
    const { app, cabecalhos } = novo();
    const respostas = await Promise.all([
      app.inject({ method: 'GET', url: '/api/health', headers: { host: '127.0.0.1:7337' } }),
      app.inject({ method: 'GET', url: '/api/nada', headers: cabecalhos }),
      app.inject({ method: 'PATCH', url: '/api/settings', headers: cabecalhos, payload: { tema: 'roxo' } }),
      app.inject({ method: 'GET', url: '/api/teste/explode', headers: cabecalhos }),
    ]);
    for (const resposta of respostas) {
      const corpo = resposta.json();
      expect(codigosErro).toContain(corpo.error.codigo);
      expect(envelopeSchema.safeParse(corpo).success).toBe(true);
    }
  });

  it('eco devolve o corpo validado dentro do envelope', async () => {
    const { app, cabecalhos } = novo();
    const resposta = await app.inject({ method: 'POST', url: '/api/teste/eco', headers: cabecalhos, payload: { a: 1 } });
    expect(resposta.statusCode).toBe(200);
    expect(resposta.json().data).toEqual({ a: 1 });
  });
});

describe('front estático (dist/ presente)', () => {
  function novoComDist() {
    const dist = criarPastaTemporaria('kora-forge-dist-');
    fs.mkdirSync(path.join(dist, 'assets'));
    fs.writeFileSync(path.join(dist, 'index.html'), '<!doctype html><div id="raiz"></div>');
    fs.writeFileSync(path.join(dist, 'assets', 'app.js'), 'export const x = 1;');
    contexto = criarAppDeTeste({ pastaDist: dist });
    return { ...contexto, dist };
  }

  it('serve index.html na raiz e em rota do front (SPA)', async () => {
    const { app } = novoComDist();
    for (const url of ['/', '/config']) {
      const resposta = await app.inject({ method: 'GET', url, headers: { host: '127.0.0.1:7337' } });
      expect(resposta.statusCode).toBe(200);
      expect(resposta.headers['content-type']).toContain('text/html');
      expect(resposta.body).toContain('id="raiz"');
    }
  });

  it('serve arquivo existente e responde 404 para arquivo ausente, sem index.html', async () => {
    const { app } = novoComDist();
    const existente = await app.inject({ method: 'GET', url: '/assets/app.js', headers: { host: '127.0.0.1:7337' } });
    expect(existente.statusCode).toBe(200);
    expect(existente.body).toBe('export const x = 1;');
    const ausente = await app.inject({ method: 'GET', url: '/assets/nao.js', headers: { host: '127.0.0.1:7337' } });
    expect(ausente.statusCode).toBe(404);
    expect(ausente.body).not.toContain('id="raiz"');
  });

  it('/api continua fora do estático: 401 sem token, 404 em envelope com token', async () => {
    const { app, cabecalhos } = novoComDist();
    const semToken = await app.inject({ method: 'GET', url: '/api/health', headers: { host: '127.0.0.1:7337' } });
    expect(semToken.statusCode).toBe(401);
    const desconhecida = await app.inject({ method: 'GET', url: '/api/nao-existe', headers: cabecalhos });
    expect(desconhecida.statusCode).toBe(404);
    expect(desconhecida.json().error.codigo).toBe('FORGE_NOT_FOUND');
    const health = await app.inject({ method: 'GET', url: '/api/health', headers: cabecalhos });
    expect(health.statusCode).toBe(200);
  });
});
