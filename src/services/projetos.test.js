import { describe, it, expect, vi, beforeEach } from 'vitest';
import { montarQueryProjetos, listarProjetos, criarProjeto } from './projetos.js';

const resposta = (data) => ({ status: 200, ok: true, json: async () => ({ data, error: null, meta: { requestId: 'r', duracaoMs: 1 } }) });
const projeto = {
  id: 'p1', nome: 'Alfa', slug: 'alfa', presetId: 'criar-site', presetNome: 'Criar Site', presetVersao: 1,
  status: 'rascunho', etapaAtual: 'identidade', caminhoDisco: null, criadoEm: '2026-09-02T00:00:00.000Z', atualizadoEm: '2026-09-02T00:00:00.000Z',
};

beforeEach(() => sessionStorage.setItem('forge.token', 'tok'));

describe('serviço de projetos', () => {
  it('monta a query só com o que foi informado', () => {
    expect(montarQueryProjetos()).toBe('');
    expect(montarQueryProjetos({ status: '', busca: '' })).toBe('');
    expect(montarQueryProjetos({ status: 'arquivado' })).toBe('?status=arquivado');
    expect(montarQueryProjetos({ busca: 'café & pão' })).toBe('?busca=caf%C3%A9+%26+p%C3%A3o');
  });

  it('listarProjetos valida a lista pelo schema compartilhado', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(resposta([projeto]));
    expect(await listarProjetos({ status: 'rascunho' })).toEqual([projeto]);
    expect(globalThis.fetch.mock.calls[0][0]).toBe('/api/projects?status=rascunho');
    globalThis.fetch = vi.fn().mockResolvedValue(resposta([{ ...projeto, status: 'roxo' }]));
    await expect(listarProjetos()).rejects.toMatchObject({ codigo: 'FORGE_CONTRACT' });
  });

  it('criarProjeto envia POST com o corpo e devolve projeto com blueprint', async () => {
    const blueprint = { versao: 1, ativo: true, criadoEm: '2026-09-02T00:00:00.000Z', payload: { preset: { id: 'criar-site', versao: 1 }, etapaAtual: 'identidade', etapasConcluidas: [], assumidas: [], respostas: {} } };
    globalThis.fetch = vi.fn().mockResolvedValue(resposta({ projeto, blueprint }));
    const resultado = await criarProjeto({ nome: 'Alfa', presetId: 'criar-site' });
    expect(resultado.projeto.id).toBe('p1');
    const [url, opcoes] = globalThis.fetch.mock.calls[0];
    expect(url).toBe('/api/projects');
    expect(opcoes.method).toBe('POST');
    expect(JSON.parse(opcoes.body)).toEqual({ nome: 'Alfa', presetId: 'criar-site' });
  });
});
