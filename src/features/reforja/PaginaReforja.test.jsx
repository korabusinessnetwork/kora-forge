import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, within, waitFor } from '@testing-library/react';
import { renderizarComProvedores } from '../../testes/renderizar.jsx';
import { mensagens } from '../../mensagens.js';
import PaginaReforja from './PaginaReforja.jsx';

vi.mock('../../services/reforja.js', () => ({
  obterDiagnostico: vi.fn(),
  listarMelhorias: vi.fn(),
  criarMelhoria: vi.fn(),
  transformarSinalEmMelhoria: vi.fn(),
  mudarEstadoDaMelhoria: vi.fn(),
  preverSpec: vi.fn(),
  gravarSpec: vi.fn(),
  obterEstadoSugestoes: vi.fn(),
  pedirSugestoes: vi.fn(),
}));
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
} from '../../services/reforja.js';

const m = mensagens.reforja;

const sinal = (extra = {}) => ({
  id: 'console-log-em-produto',
  titulo: 'console.log esquecido em código de produto',
  severidade: 'media',
  unidade: 'ocorrencias',
  sugestao: 'Troque por log estruturado.',
  total: 2,
  ocorrencias: 3,
  evidencias: [{ arquivo: 'server/index.js', contagem: 2 }, { arquivo: 'cli/forge.js', contagem: 1 }],
  evidenciasOcultas: 0,
  ...extra,
});

const diagnostico = (sinais = [sinal()]) => ({
  sinais,
  resumo: { total: sinais.length, alta: 0, media: sinais.length, baixa: 0 },
  arquivosLidos: 313,
  limites: { linhas: 400, bytes: 1048576, evidencias: 20 },
});

const item = (extra = {}) => ({
  id: 'i1', titulo: 'Tirar console.log', descricao: null, origem: 'manual', sinal: null, estado: 'proposta', prioridade: 'media',
  specCaminho: null, criadoEm: '2026-09-14T00:00:00.000Z', atualizadoEm: '2026-09-14T00:00:00.000Z', ...extra,
});

const lista = (itens = []) => {
  const contagem = { proposta: 0, especificada: 0, em_construcao: 0, em_revisao: 0, concluida: 0, descartada: 0 };
  for (const cada of itens) contagem[cada.estado] += 1;
  return { itens, contagem };
};

const secao = (nome) => screen.getByRole('region', { name: nome });

beforeEach(() => {
  vi.clearAllMocks();
  obterDiagnostico.mockResolvedValue(diagnostico());
  listarMelhorias.mockResolvedValue(lista());
  obterEstadoSugestoes.mockResolvedValue({ disponivel: false, motivo: 'desligado' });
});

describe('PaginaReforja: estados', () => {
  it('mostra carregando e depois o sucesso dos três painéis', async () => {
    renderizarComProvedores(<PaginaReforja />);
    expect(screen.getByRole('heading', { level: 1, name: m.titulo })).toBeInTheDocument();
    expect(screen.getAllByRole('status').some((no) => no.textContent === mensagens.estados.carregando)).toBe(true);

    expect(await screen.findByRole('heading', { name: sinal().titulo })).toBeInTheDocument();
    expect(screen.getByText(m.diagnostico.resumo(1, 313))).toBeInTheDocument();
    expect(await screen.findByText(m.backlog.vazioTitulo)).toBeInTheDocument();
    expect(screen.getByText(m.backlog.vazioAcao)).toBeInTheDocument();
  });

  it('diagnóstico sem sinais mostra o vazio com a próxima ação', async () => {
    obterDiagnostico.mockResolvedValue(diagnostico([]));
    renderizarComProvedores(<PaginaReforja />);
    expect(await screen.findByText(m.diagnostico.vazioTitulo)).toBeInTheDocument();
    expect(screen.getByText(m.diagnostico.vazioAcao)).toBeInTheDocument();
  });

  it('erro no diagnóstico mostra a mensagem e tentar de novo refaz a consulta, sem derrubar o resto', async () => {
    obterDiagnostico.mockRejectedValueOnce(new Error('A API local caiu.'));
    renderizarComProvedores(<PaginaReforja />);
    const alerta = await within(secao(m.diagnostico.titulo)).findByRole('alert');
    expect(alerta).toHaveTextContent('A API local caiu.');
    expect(await screen.findByText(m.backlog.vazioTitulo)).toBeInTheDocument();

    fireEvent.click(within(alerta).getByRole('button', { name: mensagens.estados.tentarDeNovo }));
    expect(await screen.findByRole('heading', { name: sinal().titulo })).toBeInTheDocument();
    expect(obterDiagnostico).toHaveBeenCalledTimes(2);
  });

  it('erro no backlog tem tentar de novo', async () => {
    listarMelhorias.mockRejectedValueOnce(new Error('Banco ocupado.'));
    renderizarComProvedores(<PaginaReforja />);
    const alerta = await within(secao(m.backlog.titulo)).findByRole('alert');
    expect(alerta).toHaveTextContent('Banco ocupado.');
    fireEvent.click(within(alerta).getByRole('button', { name: mensagens.estados.tentarDeNovo }));
    expect(await screen.findByText(m.backlog.vazioTitulo)).toBeInTheDocument();
  });
});

describe('PaginaReforja: diagnóstico para backlog', () => {
  it('transformar em melhoria chama o serviço e dá feedback', async () => {
    transformarSinalEmMelhoria.mockResolvedValue({ item: item({ origem: 'diagnostico', sinal: 'console-log-em-produto' }), criado: true });
    renderizarComProvedores(<PaginaReforja />);
    fireEvent.click(await screen.findByRole('button', { name: m.diagnostico.transformar }));
    await waitFor(() => expect(transformarSinalEmMelhoria).toHaveBeenCalledWith('console-log-em-produto'));
    expect(await screen.findByText(m.diagnostico.transformado('Tirar console.log'))).toHaveAttribute('role', 'status');
    expect(listarMelhorias).toHaveBeenCalledTimes(2);
  });

  it('sinal com item aberto mostra o botão desabilitado; com item descartado, volta a oferecer', async () => {
    listarMelhorias.mockResolvedValue(lista([item({ sinal: 'console-log-em-produto', estado: 'em_construcao' })]));
    const { unmount } = renderizarComProvedores(<PaginaReforja />);
    expect(await screen.findByRole('button', { name: m.diagnostico.jaNoBacklog })).toBeDisabled();
    unmount();

    listarMelhorias.mockResolvedValue(lista([item({ sinal: 'console-log-em-produto', estado: 'descartada' })]));
    renderizarComProvedores(<PaginaReforja />);
    await screen.findByText(m.backlog.descartadas(1));
    expect(await screen.findByRole('button', { name: m.diagnostico.transformar })).toBeEnabled();
  });
});

describe('PaginaReforja: trilho do ciclo', () => {
  const itens = [
    item({ id: 'a', titulo: 'Item proposto', estado: 'proposta' }),
    item({ id: 'b', titulo: 'Item em revisão', estado: 'em_revisao' }),
    item({ id: 'c', titulo: 'Item concluído', estado: 'concluida' }),
    item({ id: 'd', titulo: 'Item descartado', estado: 'descartada' }),
  ];

  it('mostra as cinco colunas com contagem e o que acontece depois, e as descartadas recolhidas', async () => {
    listarMelhorias.mockResolvedValue(lista(itens));
    const { container } = renderizarComProvedores(<PaginaReforja />);
    await screen.findByText('Item proposto');

    const colunas = container.querySelectorAll('[data-coluna]');
    expect([...colunas].map((coluna) => coluna.getAttribute('data-coluna'))).toEqual(['proposta', 'especificada', 'em_construcao', 'em_revisao', 'concluida']);
    for (const coluna of colunas) {
      const estado = coluna.getAttribute('data-coluna');
      expect(within(coluna).getByText(m.backlog.depois[estado])).toBeInTheDocument();
    }
    expect(within(container.querySelector('[data-coluna="proposta"]')).getByRole('heading', { level: 3 })).toHaveTextContent(`${m.backlog.estados.proposta} 1`);
    expect(within(container.querySelector('[data-coluna="especificada"]')).getByText(m.backlog.colunaVazia)).toBeInTheDocument();

    const grupo = screen.getByText(m.backlog.descartadas(1)).closest('details');
    expect(grupo).not.toHaveAttribute('open');
    expect(within(grupo).getByText('Item descartado')).toBeInTheDocument();
  });

  it('cada cartão só oferece as ações da máquina de estados', async () => {
    listarMelhorias.mockResolvedValue(lista(itens));
    renderizarComProvedores(<PaginaReforja />);
    const nomes = (titulo) => within(screen.getByRole('article', { name: titulo })).getAllByRole('button').map((botao) => botao.textContent);

    await screen.findByText('Item proposto');
    expect(nomes('Item proposto')).toEqual([m.backlog.acoes.gerarSpec, m.backlog.acoes.avancar('especificada'), m.backlog.acoes.descartar]);
    expect(nomes('Item em revisão')).toEqual([m.backlog.acoes.gerarSpec, m.backlog.acoes.avancar('concluída'), m.backlog.acoes.voltar('em construção'), m.backlog.acoes.descartar]);
    expect(nomes('Item concluído')).toEqual([m.backlog.acoes.voltar('em revisão')]);
    expect(nomes('Item descartado')).toEqual([m.backlog.acoes.restaurar]);
  });

  it('avançar muda o estado pelo serviço e dá feedback', async () => {
    listarMelhorias.mockResolvedValue(lista(itens));
    mudarEstadoDaMelhoria.mockResolvedValue(item({ id: 'a', titulo: 'Item proposto', estado: 'especificada' }));
    renderizarComProvedores(<PaginaReforja />);
    const cartao = await screen.findByRole('article', { name: 'Item proposto' });
    fireEvent.click(within(cartao).getByRole('button', { name: m.backlog.acoes.avancar('especificada') }));
    await waitFor(() => expect(mudarEstadoDaMelhoria).toHaveBeenCalledWith('a', 'especificada'));
    expect(await screen.findByText(m.backlog.estadoMudou('Item proposto', 'especificada'))).toHaveAttribute('role', 'status');
  });

  it('descartar pede confirmação na linha, manter cancela, e só confirmar envia', async () => {
    listarMelhorias.mockResolvedValue(lista(itens));
    mudarEstadoDaMelhoria.mockResolvedValue(item({ id: 'a', titulo: 'Item proposto', estado: 'descartada' }));
    renderizarComProvedores(<PaginaReforja />);
    const cartao = await screen.findByRole('article', { name: 'Item proposto' });

    fireEvent.click(within(cartao).getByRole('button', { name: m.backlog.acoes.descartar }));
    expect(within(cartao).getByText(m.backlog.confirmarDescarte)).toBeInTheDocument();
    expect(mudarEstadoDaMelhoria).not.toHaveBeenCalled();
    fireEvent.click(within(cartao).getByRole('button', { name: m.backlog.confirmarDescarteNao }));
    expect(within(cartao).queryByText(m.backlog.confirmarDescarte)).not.toBeInTheDocument();
    expect(mudarEstadoDaMelhoria).not.toHaveBeenCalled();

    fireEvent.click(within(cartao).getByRole('button', { name: m.backlog.acoes.descartar }));
    fireEvent.click(within(cartao).getByRole('button', { name: m.backlog.confirmarDescarteSim }));
    await waitFor(() => expect(mudarEstadoDaMelhoria).toHaveBeenCalledWith('a', 'descartada'));
  });

  it('transição recusada mostra o erro do servidor', async () => {
    listarMelhorias.mockResolvedValue(lista(itens));
    mudarEstadoDaMelhoria.mockRejectedValue(new Error('Essa mudança de estado não é permitida.'));
    renderizarComProvedores(<PaginaReforja />);
    const cartao = await screen.findByRole('article', { name: 'Item concluído' });
    fireEvent.click(within(cartao).getByRole('button', { name: m.backlog.acoes.voltar('em revisão') }));
    expect(await within(secao(m.backlog.titulo)).findByRole('alert')).toHaveTextContent('Essa mudança de estado não é permitida.');
  });
});

describe('PaginaReforja: spec por prévia', () => {
  const previa = (extra = {}) => ({ caminho: 'specs/reforja-item-proposto.md', conteudo: '# Item proposto\n\n## 1. Escopo', existe: false, versaoTemplate: '1.0.0', ...extra });

  it('gerar spec abre a prévia sem gravar; gravar só no confirmar', async () => {
    listarMelhorias.mockResolvedValue(lista([item({ id: 'a', titulo: 'Item proposto' })]));
    preverSpec.mockResolvedValue(previa());
    gravarSpec.mockResolvedValue({ item: item({ id: 'a', estado: 'especificada', specCaminho: 'specs/reforja-item-proposto.md' }), caminho: 'specs/reforja-item-proposto.md', sobrescrito: false });
    renderizarComProvedores(<PaginaReforja />);

    fireEvent.click(within(await screen.findByRole('article', { name: 'Item proposto' })).getByRole('button', { name: m.backlog.acoes.gerarSpec }));
    const regiao = await screen.findByRole('region', { name: m.spec.tituloDe('Item proposto') });
    const caminho = await within(regiao).findByText('specs/reforja-item-proposto.md');
    expect(caminho.tagName).toBe('CODE');
    expect(within(regiao).getByLabelText(m.spec.titulo)).toHaveTextContent('# Item proposto');
    expect(preverSpec).toHaveBeenCalledWith('a');
    expect(gravarSpec).not.toHaveBeenCalled();

    fireEvent.click(within(regiao).getByRole('button', { name: m.spec.confirmar }));
    await waitFor(() => expect(gravarSpec).toHaveBeenCalledWith('a', {}));
    expect(await screen.findByText(m.spec.gravada('specs/reforja-item-proposto.md'))).toHaveAttribute('role', 'status');
    expect(screen.queryByRole('region', { name: m.spec.tituloDe('Item proposto') })).not.toBeInTheDocument();
  });

  it('arquivo existente avisa e só grava com a caixa de substituição marcada', async () => {
    listarMelhorias.mockResolvedValue(lista([item({ id: 'a', titulo: 'Item proposto' })]));
    preverSpec.mockResolvedValue(previa({ existe: true }));
    gravarSpec.mockResolvedValue({ item: item({ id: 'a' }), caminho: 'specs/reforja-item-proposto.md', sobrescrito: true });
    renderizarComProvedores(<PaginaReforja />);

    fireEvent.click(within(await screen.findByRole('article', { name: 'Item proposto' })).getByRole('button', { name: m.backlog.acoes.gerarSpec }));
    const regiao = await screen.findByRole('region', { name: m.spec.tituloDe('Item proposto') });
    expect(await within(regiao).findByText(m.spec.existe)).toBeInTheDocument();
    const confirmar = within(regiao).getByRole('button', { name: m.spec.confirmar });
    expect(confirmar).toBeDisabled();

    fireEvent.click(within(regiao).getByRole('checkbox', { name: m.spec.sobrescrever }));
    expect(confirmar).toBeEnabled();
    fireEvent.click(confirmar);
    await waitFor(() => expect(gravarSpec).toHaveBeenCalledWith('a', { sobrescrever: true }));
  });

  it('fechar a prévia não grava nada', async () => {
    listarMelhorias.mockResolvedValue(lista([item({ id: 'a', titulo: 'Item proposto' })]));
    preverSpec.mockResolvedValue(previa());
    renderizarComProvedores(<PaginaReforja />);
    fireEvent.click(within(await screen.findByRole('article', { name: 'Item proposto' })).getByRole('button', { name: m.backlog.acoes.gerarSpec }));
    const regiao = await screen.findByRole('region', { name: m.spec.tituloDe('Item proposto') });
    await within(regiao).findByText('specs/reforja-item-proposto.md');
    fireEvent.click(within(regiao).getByRole('button', { name: m.spec.cancelar }));
    expect(screen.queryByRole('region', { name: m.spec.tituloDe('Item proposto') })).not.toBeInTheDocument();
    expect(gravarSpec).not.toHaveBeenCalled();
  });
});

describe('PaginaReforja: nova melhoria', () => {
  it('título vazio avisa junto do campo e não chama o serviço', async () => {
    renderizarComProvedores(<PaginaReforja />);
    fireEvent.click(await screen.findByRole('button', { name: m.novo.criar }));
    expect(await screen.findByText(m.novo.tituloObrigatorio)).toBeInTheDocument();
    expect(criarMelhoria).not.toHaveBeenCalled();
  });

  it('cria com prioridade no padrão Kora e dá feedback', async () => {
    criarMelhoria.mockResolvedValue(item({ titulo: 'Melhorar a página' }));
    renderizarComProvedores(<PaginaReforja />);
    fireEvent.change(await screen.findByLabelText(m.novo.campoTitulo), { target: { value: 'Melhorar a página' } });
    fireEvent.change(screen.getByLabelText(m.novo.campoDescricao), { target: { value: 'Porque sim' } });
    fireEvent.click(screen.getByRole('button', { name: m.novo.criar }));
    await waitFor(() => expect(criarMelhoria).toHaveBeenCalledWith({ titulo: 'Melhorar a página', descricao: 'Porque sim', prioridade: 'media' }));
    expect(await screen.findByText(m.novo.criada('Melhorar a página'))).toHaveAttribute('role', 'status');
    expect(screen.getByLabelText(m.novo.campoTitulo)).toHaveValue('');
  });
});

describe('PaginaReforja: sugestões', () => {
  it('indisponível desabilita com o motivo e link para Configurações', async () => {
    renderizarComProvedores(<PaginaReforja />);
    const regiao = secao(m.sugestoes.titulo);
    expect(await within(regiao).findByRole('button', { name: m.sugestoes.pedir })).toBeDisabled();
    expect(within(regiao).getByText(m.sugestoes.indisponivel.desligado)).toBeInTheDocument();
    expect(within(regiao).getByRole('link', { name: m.sugestoes.irConfiguracoes })).toHaveAttribute('href', '/config');
    expect(pedirSugestoes).not.toHaveBeenCalled();
    expect(await screen.findByRole('heading', { name: sinal().titulo })).toBeInTheDocument();
  });

  it('cada motivo tem o seu texto', async () => {
    obterEstadoSugestoes.mockResolvedValue({ disponivel: false, motivo: 'sem_modelos' });
    renderizarComProvedores(<PaginaReforja />);
    expect(await screen.findByText(m.sugestoes.indisponivel.sem_modelos)).toBeInTheDocument();
  });

  it('disponível: propostas chegam sem gravar, aceitar cria com origem modelo e dispensar só tira da lista', async () => {
    obterEstadoSugestoes.mockResolvedValue({ disponivel: true, motivo: null });
    pedirSugestoes.mockResolvedValue({
      propostas: [{ titulo: 'Criar teste das rotas', descricao: 'Cobrir o 404.' }, { titulo: 'Quebrar mensagens.js', descricao: '' }],
      descartadas: 1,
      formatoReconhecido: true,
      modelo: 'gratis-1',
    });
    criarMelhoria.mockResolvedValue(item({ titulo: 'Criar teste das rotas', origem: 'modelo' }));
    renderizarComProvedores(<PaginaReforja />);
    const regiao = secao(m.sugestoes.titulo);

    const pedir = await within(regiao).findByRole('button', { name: m.sugestoes.pedir });
    await waitFor(() => expect(pedir).toBeEnabled());
    fireEvent.click(pedir);
    expect(await within(regiao).findByText('Criar teste das rotas')).toBeInTheDocument();
    expect(within(regiao).getByText(m.sugestoes.doModelo('gratis-1'))).toBeInTheDocument();
    expect(within(regiao).getByText(m.sugestoes.descartadas(1))).toBeInTheDocument();
    expect(criarMelhoria).not.toHaveBeenCalled();

    const [primeira, segunda] = within(regiao).getAllByRole('listitem');
    fireEvent.click(within(segunda).getByRole('button', { name: m.sugestoes.dispensar }));
    expect(within(regiao).queryByText('Quebrar mensagens.js')).not.toBeInTheDocument();
    expect(criarMelhoria).not.toHaveBeenCalled();

    fireEvent.click(within(primeira).getByRole('button', { name: m.sugestoes.aceitar }));
    await waitFor(() => expect(criarMelhoria).toHaveBeenCalledWith({ titulo: 'Criar teste das rotas', descricao: 'Cobrir o 404.', origem: 'modelo' }));
    expect(await within(regiao).findByText(m.sugestoes.aceita('Criar teste das rotas'))).toHaveAttribute('role', 'status');
    expect(within(regiao).getByText(m.sugestoes.todasResolvidas)).toBeInTheDocument();
  });

  it('resposta sem formato reconhecido explica, e erro ao pedir mostra a mensagem com link', async () => {
    obterEstadoSugestoes.mockResolvedValue({ disponivel: true, motivo: null });
    pedirSugestoes.mockResolvedValueOnce({ propostas: [], descartadas: 0, formatoReconhecido: false, modelo: 'gratis-1' });
    pedirSugestoes.mockRejectedValueOnce(new Error('Os modelos gratuitos estão desligados. Ligue em Configurações.'));
    renderizarComProvedores(<PaginaReforja />);
    const regiao = secao(m.sugestoes.titulo);
    const pedir = await within(regiao).findByRole('button', { name: m.sugestoes.pedir });
    await waitFor(() => expect(pedir).toBeEnabled());

    fireEvent.click(pedir);
    expect(await within(regiao).findByText(m.sugestoes.formatoNaoReconhecido)).toBeInTheDocument();

    fireEvent.click(within(regiao).getByRole('button', { name: m.sugestoes.pedir }));
    const alerta = await within(regiao).findByRole('alert');
    expect(alerta).toHaveTextContent('Ligue em Configurações.');
    expect(within(alerta).getByRole('link', { name: m.sugestoes.irConfiguracoes })).toHaveAttribute('href', '/config');
  });
});
