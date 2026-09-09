import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TOKENS_PADRAO } from '@shared/schemas/design.js';
import { obterDesign, salvarDesign } from './design.js';
import { capturarTokenDaUrl, limparToken } from './sessao.js';

const envelope = (data) => ({ ok: true, status: 200, json: async () => ({ data, error: null, meta: { requestId: 'r', duracaoMs: 1 } }) });
const documento = (extra = {}) => ({ versao: 0, tokens: { ...TOKENS_PADRAO }, paginas: [], criadoEm: null, ...extra });

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

describe('obterDesign', () => {
  it('busca o documento do projeto e valida o contrato', async () => {
    fetchFalso.mockResolvedValue(envelope(documento()));
    await expect(obterDesign('p1')).resolves.toEqual(documento());
    expect(fetchFalso.mock.calls[0][0]).toBe('/api/projects/p1/design');
    expect(fetchFalso.mock.calls[0][1].method).toBe('GET');
  });

  it('escapa o id na URL', async () => {
    fetchFalso.mockResolvedValue(envelope(documento()));
    await obterDesign('a/b');
    expect(fetchFalso.mock.calls[0][0]).toBe('/api/projects/a%2Fb/design');
  });

  it('resposta fora do contrato vira erro de contrato', async () => {
    fetchFalso.mockResolvedValue(envelope({ versao: 1 }));
    await expect(obterDesign('p1')).rejects.toMatchObject({ codigo: 'FORGE_CONTRACT' });
  });

  it('versão zero com data nula é contrato válido, e quer dizer que nada foi salvo', async () => {
    fetchFalso.mockResolvedValue(envelope(documento({ versao: 0, criadoEm: null })));
    await expect(obterDesign('p1')).resolves.toMatchObject({ versao: 0, criadoEm: null });
  });
});

describe('salvarDesign', () => {
  it('manda PUT com os tokens no corpo', async () => {
    fetchFalso.mockResolvedValue(envelope(documento({ versao: 1, criadoEm: '2026-09-08T00:00:00.000Z' })));
    await salvarDesign('p1', { COR_ACENTO: '#ff0000' });

    expect(fetchFalso.mock.calls[0][1].method).toBe('PUT');
    expect(JSON.parse(fetchFalso.mock.calls[0][1].body)).toEqual({ tokens: { COR_ACENTO: '#ff0000' } });
  });
});
