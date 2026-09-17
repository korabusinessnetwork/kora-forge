import fs from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { criarAppDeTeste } from '../../testes/apoio.js';

let contexto = null;
afterEach(async () => { await contexto?.fechar(); contexto = null; });
const novo = () => { contexto = criarAppDeTeste(); return contexto; };
const post = (ctx, url, payload) => ctx.app.inject({ method: 'POST', url: `/api${url}`, headers: ctx.cabecalhos, payload });

describe('cofre local', () => {
  it('cifra uma conexão genérica sem devolver nem persistir a chave em claro', async () => {
    const ctx = novo();
    const segredo = 'sk-ant-segredo-que-nao-pode-vazar';
    const alias = 'minha-chave-ia';
    expect((await post(ctx, '/vault', { senha: 'uma senha mestre forte', confirmacao: 'uma senha mestre forte' })).statusCode).toBe(201);
    const resposta = await post(ctx, '/connections', { alias, provedor: 'Qualquer Provedor', tipo: 'IA', endpoint: 'https://api.exemplo.test', chave: segredo });
    expect(resposta.statusCode).toBe(201);
    expect(resposta.body).not.toContain(segredo);
    expect(resposta.json().data).toMatchObject({ alias, provedor: 'Qualquer Provedor', tipo: 'IA', endpoint: 'https://api.exemplo.test', status: 'pendente' });
    const conteudoCofre = fs.readFileSync(`${ctx.home}/vault.bin`, 'utf8');
    expect(conteudoCofre).not.toContain(segredo);
    expect(conteudoCofre).not.toContain(alias);
    const eventos = ctx.db.prepare("SELECT payload_json FROM events WHERE nome = 'conexao.criada'").all();
    expect(JSON.stringify(eventos)).not.toContain(segredo);
    expect((await ctx.app.inject({ method: 'GET', url: '/api/connections', headers: ctx.cabecalhos })).body).not.toContain(segredo);
  });

  it('começa trancado em outro boot e senha errada não revela detalhes', async () => {
    const ctx = novo();
    await post(ctx, '/vault', { senha: 'uma senha mestre forte', confirmacao: 'uma senha mestre forte' });
    const cofreNovo = (await import('./servico.js')).criarServicoCofre({ home: ctx.home });
    expect(cofreNovo.estado()).toBe('trancado');
    expect(() => cofreNovo.destrancar('senha errada')).toThrow(expect.objectContaining({ codigo: 'FORGE_UNAUTHORIZED' }));
    expect(cofreNovo.estado()).toBe('trancado');
    expect(cofreNovo.destrancar('uma senha mestre forte')).toEqual({ estado: 'destrancado' });
  });

  it('recusa conexão com cofre trancado e campos fora do contrato', async () => {
    const ctx = novo();
    const trancado = await post(ctx, '/connections', { alias: 'x', provedor: 'x', tipo: 'x', chave: 'segredo' });
    expect(trancado.statusCode).toBe(423);
    const invalido = await post(ctx, '/vault', { senha: 'uma senha mestre forte', confirmacao: 'diferente' });
    expect(invalido.statusCode).toBe(400);
  });

  it('testa só sob comando, atualiza metadados e nunca registra a chave', async () => {
    const ctx = novo();
    const segredo = 'segredo-de-teste-nao-vaza';
    await post(ctx, '/vault', { senha: 'uma senha mestre forte', confirmacao: 'uma senha mestre forte' });
    const criada = await post(ctx, '/connections', { alias: 'conexao teste', provedor: 'Servico livre', tipo: 'IA', urlTeste: 'https://api.exemplo.test/health', cabecalhoChave: 'x-api-key', prefixoChave: '', chave: segredo });
    const id = criada.json().data.id;
    const fetchImpl = async (url, opcoes) => {
      expect(url).toBe('https://api.exemplo.test/health');
      expect(opcoes).toMatchObject({ method: 'GET', redirect: 'error', headers: { Accept: 'application/json', 'x-api-key': segredo } });
      return { ok: true };
    };
    const resultado = await ctx.app.servicos.conexoes.testar(id, { fetchImpl });
    expect(resultado).toMatchObject({ resultado: 'sucesso', conexao: { id, status: 'ativa' } });
    expect(JSON.stringify(resultado)).not.toContain(segredo);
    const eventos = ctx.db.prepare("SELECT payload_json FROM events WHERE nome = 'conexao.testada'").all();
    expect(JSON.stringify(eventos)).not.toContain(segredo);
  });

  it('recusa URL HTTP remota antes de tentar uma conexão', async () => {
    const ctx = novo();
    await post(ctx, '/vault', { senha: 'uma senha mestre forte', confirmacao: 'uma senha mestre forte' });
    const resposta = await post(ctx, '/connections', { alias: 'sem http remoto', provedor: 'Servico livre', tipo: 'IA', urlTeste: 'http://api.exemplo.test/health', chave: 'segredo' });
    expect(resposta.statusCode).toBe(400);
  });
});
