import { describe, it, expect, beforeEach, vi } from 'vitest';
import { z } from 'zod';
import { obter, alterar, ErroApi, validarContrato } from './api.js';

const resposta = (corpo, status = 200) => ({ status, ok: status < 400, json: async () => corpo });
const envelope = (data, error = null) => ({ data, error, meta: { requestId: 'r1', duracaoMs: 1.5 } });

beforeEach(() => sessionStorage.setItem('forge.token', 'tok123'));

async function capturar(promessa) {
  try {
    await promessa;
  } catch (erro) {
    return erro;
  }
  throw new Error('esperava rejeição');
}

describe('camada de serviços', () => {
  it('envia X-Forge-Token e Content-Type, e devolve data', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(resposta(envelope({ ok: true })));
    expect(await alterar('/settings', { tema: 'claro' }, { fetchImpl })).toEqual({ ok: true });
    const [url, opcoes] = fetchImpl.mock.calls[0];
    expect(url).toBe('/api/settings');
    expect(opcoes.method).toBe('PATCH');
    expect(opcoes.headers['X-Forge-Token']).toBe('tok123');
    expect(opcoes.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(opcoes.body)).toEqual({ tema: 'claro' });
  });

  it('GET não manda corpo nem Content-Type', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(resposta(envelope(null)));
    await obter('/health', { fetchImpl });
    const [, opcoes] = fetchImpl.mock.calls[0];
    expect(opcoes.method).toBe('GET');
    expect(opcoes.body).toBeUndefined();
    expect(opcoes.headers['Content-Type']).toBeUndefined();
  });

  it('error no envelope vira ErroApi com codigo, mensagem, detalhe e status', async () => {
    const detalhe = { issues: [{ caminho: 'workspace', mensagem: 'não existe' }] };
    const fetchImpl = vi.fn().mockResolvedValue(resposta(envelope(null, { codigo: 'FORGE_VALIDATION', mensagem: 'Entrada fora do contrato.', detalhe }), 400));
    const erro = await capturar(alterar('/settings', {}, { fetchImpl }));
    expect(erro).toBeInstanceOf(ErroApi);
    expect(erro.codigo).toBe('FORGE_VALIDATION');
    expect(erro.message).toBe('Entrada fora do contrato.');
    expect(erro.detalhe).toEqual(detalhe);
    expect(erro.status).toBe(400);
  });

  it('falha de rede vira FORGE_OFFLINE', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    const erro = await capturar(obter('/health', { fetchImpl }));
    expect(erro.codigo).toBe('FORGE_OFFLINE');
  });

  it('resposta fora do envelope vira FORGE_CONTRACT', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(resposta({ qualquer: 1 }));
    const erro = await capturar(obter('/health', { fetchImpl }));
    expect(erro.codigo).toBe('FORGE_CONTRACT');
    expect(erro.detalhe.issues.length).toBeGreaterThan(0);
  });

  it('resposta que não é JSON vira FORGE_CONTRACT', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ status: 502, ok: false, json: async () => { throw new SyntaxError('x'); } });
    const erro = await capturar(obter('/health', { fetchImpl }));
    expect(erro.codigo).toBe('FORGE_CONTRACT');
    expect(erro.status).toBe(502);
  });

  it('sem token não manda o header', async () => {
    sessionStorage.clear();
    const fetchImpl = vi.fn().mockResolvedValue(resposta(envelope(null)));
    await obter('/health', { fetchImpl });
    expect(fetchImpl.mock.calls[0][1].headers['X-Forge-Token']).toBeUndefined();
  });

  it('validarContrato rejeita data fora do schema com FORGE_CONTRACT', () => {
    const schema = z.strictObject({ a: z.number() });
    expect(validarContrato(schema, { a: 1 })).toEqual({ a: 1 });
    expect(() => validarContrato(schema, { a: 'x' })).toThrow(ErroApi);
    try {
      validarContrato(schema, { a: 'x' });
    } catch (erro) {
      expect(erro.codigo).toBe('FORGE_CONTRACT');
      expect(erro.detalhe.issues[0].caminho).toBe('a');
    }
  });
});
