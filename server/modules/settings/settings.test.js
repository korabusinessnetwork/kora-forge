import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, afterEach } from 'vitest';
import { criarAppDeTeste, criarPastaTemporaria } from '../../testes/apoio.js';
import { normalizarWorkspace } from './servico.js';

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
const get = (ctx) => ctx.app.inject({ method: 'GET', url: '/api/settings', headers: ctx.cabecalhos });
const patch = (ctx, payload) => ctx.app.inject({ method: 'PATCH', url: '/api/settings', headers: ctx.cabecalhos, payload });
const eventos = (ctx) => ctx.db.prepare("SELECT nome, payload_json FROM events WHERE nome = 'settings.atualizadas'").all();

describe('settings', () => {
  it('devolve os defaults quando nada foi salvo', async () => {
    const ctx = novo();
    const resposta = await get(ctx);
    expect(resposta.statusCode).toBe(200);
    expect(resposta.json().data).toEqual({ workspace: null, tema: 'escuro', copilotoTetoUsd: 5 });
  });

  it('FORGE_WORKSPACE do ambiente vira default quando nada foi salvo', async () => {
    const ctx = novo({ config: { workspacePadrao: '/tmp/qualquer', copilotoTetoUsdPadrao: 9 } });
    expect((await get(ctx)).json().data).toEqual({ workspace: '/tmp/qualquer', tema: 'escuro', copilotoTetoUsd: 9 });
  });

  it('PATCH válido persiste em JSON com atualizado_em ISO, reflete no health e emite evento', async () => {
    const ctx = novo();
    const pasta = criarPastaTemporaria('kora-forge-ws-');
    const resposta = await patch(ctx, { workspace: pasta, tema: 'claro', copilotoTetoUsd: 12.5 });
    expect(resposta.statusCode).toBe(200);
    expect(resposta.json().data).toEqual({ workspace: pasta, tema: 'claro', copilotoTetoUsd: 12.5 });
    expect((await get(ctx)).json().data.workspace).toBe(pasta);

    const linhas = ctx.db.prepare('SELECT chave, valor, atualizado_em FROM settings ORDER BY chave').all();
    expect(linhas.map((l) => l.chave)).toEqual(['copilotoTetoUsd', 'tema', 'workspace']);
    for (const linha of linhas) {
      expect(() => JSON.parse(linha.valor)).not.toThrow();
      expect(new Date(linha.atualizado_em).toISOString()).toBe(linha.atualizado_em);
    }

    const health = await ctx.app.inject({ method: 'GET', url: '/api/health', headers: ctx.cabecalhos });
    expect(health.json().data.workspace).toEqual({ configurado: true, caminho: pasta });

    const registrados = eventos(ctx);
    expect(registrados).toHaveLength(1);
    expect(JSON.parse(registrados[0].payload_json).chaves.sort()).toEqual(['copilotoTetoUsd', 'tema', 'workspace']);
    fs.rmSync(pasta, { recursive: true, force: true });
  });

  it('PATCH vazio responde 200 e não emite evento', async () => {
    const ctx = novo();
    const resposta = await patch(ctx, {});
    expect(resposta.statusCode).toBe(200);
    expect(eventos(ctx)).toHaveLength(0);
  });

  it('null limpa o workspace e barra final é normalizada', async () => {
    const ctx = novo();
    const pasta = criarPastaTemporaria('kora-forge-ws-');
    expect((await patch(ctx, { workspace: `${pasta}${path.sep}` })).json().data.workspace).toBe(pasta);
    expect((await patch(ctx, { workspace: null })).json().data.workspace).toBeNull();
    const health = await ctx.app.inject({ method: 'GET', url: '/api/health', headers: ctx.cabecalhos });
    expect(health.json().data.workspace).toEqual({ configurado: false, caminho: null });
    fs.rmSync(pasta, { recursive: true, force: true });
  });

  it.each([
    ['relativo', 'projetos/kora'],
    ['com ..', '/tmp/../etc'],
    ['inexistente', '/caminho/que/nao/existe/mesmo'],
  ])('workspace %s responde 400 apontando o campo', async (_rotulo, workspace) => {
    const ctx = novo();
    const resposta = await patch(ctx, { workspace });
    expect(resposta.statusCode).toBe(400);
    const erro = resposta.json().error;
    expect(erro.codigo).toBe('FORGE_VALIDATION');
    expect(erro.detalhe.issues[0].caminho).toBe('workspace');
    expect(erro.detalhe.issues[0].mensagem.length).toBeGreaterThan(10);
  });

  it('workspace apontando para arquivo responde 400', async () => {
    const ctx = novo();
    const pasta = criarPastaTemporaria('kora-forge-ws-');
    const arquivo = path.join(pasta, 'arquivo.txt');
    fs.writeFileSync(arquivo, 'x');
    const resposta = await patch(ctx, { workspace: arquivo });
    expect(resposta.statusCode).toBe(400);
    expect(resposta.json().error.detalhe.issues[0].caminho).toBe('workspace');
    fs.rmSync(pasta, { recursive: true, force: true });
  });

  it('teto negativo, tema inválido e tipo errado respondem 400', async () => {
    const ctx = novo();
    expect((await patch(ctx, { copilotoTetoUsd: -1 })).statusCode).toBe(400);
    expect((await patch(ctx, { tema: 'roxo' })).statusCode).toBe(400);
    expect((await patch(ctx, { copilotoTetoUsd: '5' })).statusCode).toBe(400);
    expect(eventos(ctx)).toHaveLength(0);
  });

  it('falha ao gravar o evento não altera a resposta', async () => {
    const ctx = novo();
    ctx.db.exec('DROP TABLE events');
    const resposta = await patch(ctx, { tema: 'claro' });
    expect(resposta.statusCode).toBe(200);
    expect(resposta.json().data.tema).toBe('claro');
  });
});

describe('normalizarWorkspace', () => {
  it('aceita caminho absoluto no estilo Windows sem quebrar a normalização', () => {
    expect(() => normalizarWorkspace('D:\\dev\\kora')).toThrow(/não existe/);
    expect(() => normalizarWorkspace('D:\\dev\\..\\kora')).toThrow(/\.\./);
    expect(() => normalizarWorkspace('dev\\kora')).toThrow(/absoluto/);
  });

  it('vazio e null limpam', () => {
    expect(normalizarWorkspace(null)).toBeNull();
    expect(normalizarWorkspace('   ')).toBeNull();
  });
});
