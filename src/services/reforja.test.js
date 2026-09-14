import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  criarMelhoria,
  gravarSpec,
  listarMelhorias,
  mudarEstadoDaMelhoria,
  obterDiagnostico,
  obterEstadoSugestoes,
  pedirSugestoes,
  preverSpec,
  transformarSinalEmMelhoria,
} from './reforja.js';
import { capturarTokenDaUrl, limparToken } from './sessao.js';

const envelope = (data) => ({ ok: true, json: async () => ({ data, error: null, meta: { requestId: 'r', duracaoMs: 1 } }), status: 200 });
const item = (extra = {}) => ({
  id: 'i1', titulo: 'x', descricao: null, origem: 'manual', sinal: null, estado: 'proposta', prioridade: 'media',
  specCaminho: null, criadoEm: '2026-09-14T00:00:00.000Z', atualizadoEm: '2026-09-14T00:00:00.000Z', ...extra,
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

const chamada = (indice = 0) => ({ url: fetchFalso.mock.calls[indice][0], metodo: fetchFalso.mock.calls[indice][1].method, corpo: fetchFalso.mock.calls[indice][1].body ? JSON.parse(fetchFalso.mock.calls[indice][1].body) : undefined });

describe('serviço da reforja', () => {
  it('diagnóstico e lista validam o contrato', async () => {
    fetchFalso.mockResolvedValueOnce(envelope({ sinais: [], resumo: { total: 0, alta: 0, media: 0, baixa: 0 }, arquivosLidos: 3, limites: { linhas: 400, bytes: 1, evidencias: 20 } }));
    await expect(obterDiagnostico()).resolves.toMatchObject({ arquivosLidos: 3 });
    expect(chamada().url).toBe('/api/reforja/diagnostico');

    fetchFalso.mockResolvedValueOnce(envelope({ itens: [{ titulo: 'sem id' }], contagem: {} }));
    await expect(listarMelhorias()).rejects.toMatchObject({ codigo: 'FORGE_CONTRACT' });
  });

  it('criar manda só o que tem conteúdo', async () => {
    fetchFalso.mockResolvedValue(envelope(item()));
    await criarMelhoria({ titulo: '  x  ', descricao: '   ' });
    expect(chamada().corpo).toEqual({ titulo: 'x' });
    await criarMelhoria({ titulo: 'x', descricao: ' d ', prioridade: 'alta', origem: 'modelo' });
    expect(chamada(1)).toEqual({ url: '/api/reforja/itens', metodo: 'POST', corpo: { titulo: 'x', descricao: 'd', prioridade: 'alta', origem: 'modelo' } });
  });

  it('transformar sinal, mudar estado e spec usam as rotas certas, com id escapado', async () => {
    fetchFalso.mockResolvedValueOnce(envelope({ item: item(), criado: true }));
    await transformarSinalEmMelhoria('arquivos-grandes');
    expect(chamada(0)).toEqual({ url: '/api/reforja/itens/do-sinal', metodo: 'POST', corpo: { sinalId: 'arquivos-grandes' } });

    fetchFalso.mockResolvedValueOnce(envelope(item({ estado: 'especificada' })));
    await mudarEstadoDaMelhoria('a/b', 'especificada');
    expect(chamada(1)).toEqual({ url: '/api/reforja/itens/a%2Fb/estado', metodo: 'PATCH', corpo: { para: 'especificada' } });

    fetchFalso.mockResolvedValueOnce(envelope({ caminho: 'specs/reforja-x.md', conteudo: '# x', existe: false, versaoTemplate: '1.0.0' }));
    await preverSpec('i1');
    expect(chamada(2)).toEqual({ url: '/api/reforja/itens/i1/spec/previa', metodo: 'POST', corpo: {} });

    fetchFalso.mockResolvedValue(envelope({ item: item(), caminho: 'specs/reforja-x.md', sobrescrito: false }));
    await gravarSpec('i1');
    expect(chamada(3).corpo).toEqual({});
    await gravarSpec('i1', { sobrescrever: true });
    expect(chamada(4).corpo).toEqual({ sobrescrever: true });
  });

  it('sugestões: estado e pedido', async () => {
    fetchFalso.mockResolvedValueOnce(envelope({ disponivel: false, motivo: 'desligado' }));
    await expect(obterEstadoSugestoes()).resolves.toEqual({ disponivel: false, motivo: 'desligado' });
    fetchFalso.mockResolvedValueOnce(envelope({ propostas: [{ titulo: 'a', descricao: '' }], descartadas: 0, formatoReconhecido: true, modelo: 'm' }));
    await expect(pedirSugestoes()).resolves.toMatchObject({ modelo: 'm' });
    expect(chamada(1)).toEqual({ url: '/api/reforja/sugestoes', metodo: 'POST', corpo: {} });
  });
});
