import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listarRegras, avaliarRegras, decidirSobreHit } from './regras.js';

const avaliacao = { hits: [], bloqueios: 0, podeMaterializar: true };
const resposta = (data) => ({ status: 200, ok: true, json: async () => ({ data, error: null, meta: { requestId: 'r', duracaoMs: 1 } }) });

beforeEach(() => sessionStorage.setItem('forge.token', 'tok'));

describe('serviço de regras', () => {
  it('listar usa GET, avaliar usa POST e decidir usa PATCH, todos validados', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(resposta(avaliacao));
    expect(await listarRegras('p1')).toEqual(avaliacao);
    expect(globalThis.fetch.mock.calls[0][0]).toBe('/api/projects/p1/regras');
    expect(globalThis.fetch.mock.calls[0][1].method).toBe('GET');

    await avaliarRegras('p1');
    expect(globalThis.fetch.mock.calls[1][0]).toBe('/api/projects/p1/regras/avaliar');
    expect(globalThis.fetch.mock.calls[1][1].method).toBe('POST');

    await decidirSobreHit('p1', 'h1', { estado: 'ignorado' });
    expect(globalThis.fetch.mock.calls[2][0]).toBe('/api/projects/p1/regras/h1');
    expect(globalThis.fetch.mock.calls[2][1].method).toBe('PATCH');
    expect(JSON.parse(globalThis.fetch.mock.calls[2][1].body)).toEqual({ estado: 'ignorado' });
  });

  it('resposta fora do contrato vira FORGE_CONTRACT', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(resposta({ hits: [{ id: 'x' }], bloqueios: 0, podeMaterializar: true }));
    await expect(listarRegras('p1')).rejects.toMatchObject({ codigo: 'FORGE_CONTRACT' });
  });
});
