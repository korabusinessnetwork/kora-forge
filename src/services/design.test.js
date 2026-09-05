import { describe, it, expect, vi, beforeEach } from 'vitest';
import { documentoDesignSchema } from '@shared/schemas/design.js';
import { obterDesign, salvarDesign, listarVersoesDesign } from './design.js';

const resposta = (data) => ({ status: 200, ok: true, json: async () => ({ data, error: null, meta: { requestId: 'r', duracaoMs: 1 } }) });
const payload = documentoDesignSchema.parse({ paginas: [{ id: 'inicio', nome: 'Início', rota: '/', regioes: [] }] });
const registro = { versao: 2, ativo: true, criadoEm: '2026-09-05T00:00:00.000Z', payload };

beforeEach(() => sessionStorage.setItem('forge.token', 'tok'));

describe('serviço de design', () => {
  it('obterDesign devolve null quando o projeto ainda usa o padrão Kora', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(resposta({ design: null }));
    expect(await obterDesign('p1')).toBeNull();
    expect(globalThis.fetch.mock.calls[0][0]).toBe('/api/projects/p1/design');
  });

  it('obterDesign valida a resposta pelo schema compartilhado', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(resposta({ design: registro }));
    expect(await obterDesign('p1')).toEqual(registro);

    globalThis.fetch = vi.fn().mockResolvedValue(resposta({ design: { ...registro, payload: { ...payload, inventado: 1 } } }));
    await expect(obterDesign('p1')).rejects.toMatchObject({ codigo: 'FORGE_CONTRACT' });
  });

  it('salvarDesign envia POST com o documento e devolve o registro salvo', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(resposta({ design: registro }));
    expect(await salvarDesign('p1', payload)).toEqual(registro);
    const [url, opcoes] = globalThis.fetch.mock.calls[0];
    expect(url).toBe('/api/projects/p1/design');
    expect(opcoes.method).toBe('POST');
    expect(JSON.parse(opcoes.body)).toEqual(payload);
  });

  it('id com caractere especial é escapado na URL, e não montado por concatenação crua', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(resposta([]));
    await listarVersoesDesign('a/b?c');
    expect(globalThis.fetch.mock.calls[0][0]).toBe('/api/projects/a%2Fb%3Fc/design/versoes');
  });

  it('erro da API vira ErroApi com o código estável, sem virar exceção crua', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 400,
      ok: false,
      json: async () => ({ data: null, error: { codigo: 'FORGE_VALIDATION', mensagem: 'Entrada fora do contrato.', detalhe: {} }, meta: { requestId: 'r', duracaoMs: 1 } }),
    });
    await expect(salvarDesign('p1', payload)).rejects.toMatchObject({ codigo: 'FORGE_VALIDATION', status: 400 });
  });
});
