import { describe, it, expect, vi, beforeEach } from 'vitest';
import { materializar, obterMaterializacao, decidirMaterializacao, pararRun } from './materializacao.js';

const estado = {
  projetoId: 'p1', raiz: '/dev/kora/alfa', estado: 'rodando',
  arquivos: { criados: 32, sobrescritos: 0, pulados: 0 },
  comandos: [{ id: 'git-init', cmd: 'git', args: ['init'], obrigatorio: true, longaDuracao: false, estado: 'sucesso', runId: 'r1', exitCode: 0, erro: null }],
  indice: 1, iniciadaEm: '2026-09-03T00:00:00.000Z', terminadaEm: null,
};
const resposta = (data) => ({ status: 200, ok: true, json: async () => ({ data, error: null, meta: { requestId: 'r', duracaoMs: 1 } }) });

beforeEach(() => sessionStorage.setItem('forge.token', 'tok'));

describe('serviço de materialização', () => {
  it('materializar manda só o hash, e nada de conteúdo de arquivo', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(resposta(estado));
    expect(await materializar('p1', `sha256:${'a'.repeat(64)}`)).toEqual(estado);
    const [url, opcoes] = globalThis.fetch.mock.calls[0];
    expect(url).toBe('/api/projects/p1/materializar');
    expect(opcoes.method).toBe('POST');
    expect(JSON.parse(opcoes.body)).toEqual({ hashBlueprint: `sha256:${'a'.repeat(64)}` });
  });

  it('obter devolve null quando não há materialização', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(resposta({ materializacao: null }));
    expect(await obterMaterializacao('p1')).toBeNull();
    globalThis.fetch = vi.fn().mockResolvedValue(resposta({ materializacao: estado }));
    expect(await obterMaterializacao('p1')).toEqual(estado);
  });

  it('decidir e parar chamam as rotas certas', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(resposta(estado));
    await decidirMaterializacao('p1', 'pular');
    expect(globalThis.fetch.mock.calls[0][0]).toBe('/api/projects/p1/materializar/decidir');
    expect(JSON.parse(globalThis.fetch.mock.calls[0][1].body)).toEqual({ acao: 'pular' });

    globalThis.fetch = vi.fn().mockResolvedValue(resposta({ runId: 'r1', estado: 'cancelado' }));
    expect(await pararRun('r1')).toEqual({ runId: 'r1', estado: 'cancelado' });
    expect(globalThis.fetch.mock.calls[0][0]).toBe('/api/runs/r1/parar');
  });

  it('resposta fora do contrato vira FORGE_CONTRACT', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(resposta({ ...estado, estado: 'inventado' }));
    await expect(materializar('p1', `sha256:${'a'.repeat(64)}`)).rejects.toMatchObject({ codigo: 'FORGE_CONTRACT' });
  });
});
