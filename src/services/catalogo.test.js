import { describe, it, expect, vi, beforeEach } from 'vitest';
import { obterCatalogo } from './catalogo.js';

const resposta = (data) => ({ status: 200, ok: true, json: async () => ({ data, error: null, meta: { requestId: 'r', duracaoMs: 1 } }) });

const item = {
  id: 'titulo', versao: 1, papel: 'componente', nome: 'Título',
  descricao: 'um título de seção', microtexto: 'vira uma tag de título',
  props: [{ id: 'texto', tipo: 'texto', rotulo: 'Texto', microtexto: 'o que aparece', padrao: 'Título', obrigatoria: true }],
  aceita: [],
};

beforeEach(() => sessionStorage.setItem('forge.token', 'tok'));

describe('serviço do catálogo', () => {
  it('busca o catálogo na rota da API local, sem id de projeto', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(resposta({ versao: 1, itens: [item] }));
    expect(await obterCatalogo()).toEqual({ versao: 1, itens: [item] });
    expect(globalThis.fetch.mock.calls[0][0]).toBe('/api/catalog');
  });

  it('resposta fora do contrato vira FORGE_CONTRACT, e não item quebrado na paleta', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(resposta({ versao: 1, itens: [{ ...item, papel: 'widget' }] }));
    await expect(obterCatalogo()).rejects.toMatchObject({ codigo: 'FORGE_CONTRACT' });
  });

  it('erro da API vira ErroApi com código estável', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 401, ok: false,
      json: async () => ({ data: null, error: { codigo: 'FORGE_UNAUTHORIZED', mensagem: 'Acesso negado à API local.', detalhe: {} }, meta: { requestId: 'r', duracaoMs: 1 } }),
    });
    await expect(obterCatalogo()).rejects.toMatchObject({ codigo: 'FORGE_UNAUTHORIZED', status: 401 });
  });
});
