import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { listarIdeias, registrarIdeia, descartarIdeia } from './ideias.js';
import { capturarTokenDaUrl, limparToken } from './sessao.js';

const envelope = (data) => ({ ok: true, json: async () => ({ data, error: null, meta: { requestId: 'r', duracaoMs: 1 } }), status: 200 });

const ideia = (extra = {}) => ({
  id: 'i1', titulo: 'uma ideia', proximoPasso: null, origem: null, estado: 'aberta',
  criadoEm: '2026-09-08T00:00:00.000Z', ...extra,
});

let fetchFalso;

beforeEach(() => {
  capturarTokenDaUrl({ hash: '#token=tok', pathname: '/', search: '' }, { replaceState: () => {} });
  fetchFalso = vi.fn();
  globalThis.fetch = fetchFalso;
});

afterEach(() => {
  limparToken();
  delete globalThis.fetch;
});

const corpoDe = () => JSON.parse(fetchFalso.mock.calls[0][1].body);

describe('listarIdeias', () => {
  it('devolve só o array, validado pelo contrato', async () => {
    fetchFalso.mockResolvedValue(envelope({ ideias: [ideia()] }));
    await expect(listarIdeias()).resolves.toEqual([ideia()]);
    expect(fetchFalso.mock.calls[0][0]).toBe('/api/ideias');
  });

  it('resposta fora do contrato vira erro de contrato, não tela quebrada', async () => {
    fetchFalso.mockResolvedValue(envelope({ ideias: [{ titulo: 'sem id' }] }));
    await expect(listarIdeias()).rejects.toMatchObject({ codigo: 'FORGE_CONTRACT' });
  });
});

describe('registrarIdeia', () => {
  it('manda só o título quando é só o que existe', async () => {
    fetchFalso.mockResolvedValue(envelope(ideia()));
    await registrarIdeia({ titulo: 'uma ideia' });
    expect(corpoDe()).toEqual({ titulo: 'uma ideia' });
  });

  it('apara e omite os opcionais vazios, porque o schema do servidor é estrito', async () => {
    fetchFalso.mockResolvedValue(envelope(ideia()));
    await registrarIdeia({ titulo: 'x', proximoPasso: '   ', origem: '' });
    expect(corpoDe()).toEqual({ titulo: 'x' });
  });

  it('manda os opcionais aparados quando têm conteúdo', async () => {
    fetchFalso.mockResolvedValue(envelope(ideia()));
    await registrarIdeia({ titulo: 'x', proximoPasso: '  medir antes  ', origem: ' /config ' });
    expect(corpoDe()).toEqual({ titulo: 'x', proximoPasso: 'medir antes', origem: '/config' });
  });
});

describe('descartarIdeia', () => {
  it('faz PATCH com o estado descartada e escapa o id', async () => {
    fetchFalso.mockResolvedValue(envelope(ideia({ estado: 'descartada' })));
    await descartarIdeia('a/b');

    expect(fetchFalso.mock.calls[0][0]).toBe('/api/ideias/a%2Fb');
    expect(fetchFalso.mock.calls[0][1].method).toBe('PATCH');
    expect(corpoDe()).toEqual({ estado: 'descartada' });
  });
});
