import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, within } from '@testing-library/react';
import { renderizarComProvedores } from '../../testes/renderizar.jsx';
import { mensagens } from '../../mensagens.js';
import { recomendarTodas } from '@shared/eficiencia/motor.js';
import PaginaEficiencia from './PaginaEficiencia.jsx';

vi.mock('../../services/eficiencia.js', () => ({ obterPainel: vi.fn(), obterRecomendacoes: vi.fn(), registrarChamada: vi.fn() }));
import { obterPainel, obterRecomendacoes } from '../../services/eficiencia.js';

const m = mensagens.eficiencia;

const painelVazio = {
  periodo: 'mes',
  intencao: 'aplicacao',
  tetoUsd: 5,
  totais: { chamadas: 0, sucessos: 0, taxaSucesso: 0, custoUsd: 0, percentualDoTeto: 0 },
  melhorModelo: null,
  ranking: [],
  porEtapa: [],
};

const painelComDados = {
  ...painelVazio,
  totais: { chamadas: 7, sucessos: 6, taxaSucesso: 0.8571, custoUsd: 0.17, percentualDoTeto: 3.4 },
  melhorModelo: 'claude-sonnet-5',
  ranking: [
    { modelo: 'claude-sonnet-5', nome: 'Claude Sonnet 5', tier: 'equilibrio', chamadas: 6, sucessos: 5, taxaSucesso: 0.8333, custoTotalUsd: 0.12, custoMedioUsd: 0.02, custoPorSucessoUsd: 0.024, sucessosPorDolar: 41.67, duracaoMediaMs: 1333.33, pontuacao: 100, amostraPequena: false },
    { modelo: 'claude-opus-5', nome: 'Claude Opus 5', tier: 'frontier', chamadas: 1, sucessos: 1, taxaSucesso: 1, custoTotalUsd: 0.05, custoMedioUsd: 0.05, custoPorSucessoUsd: 0.05, sucessosPorDolar: 20, duracaoMediaMs: null, pontuacao: 48, amostraPequena: true },
  ],
  porEtapa: [{ etapa: 'identidade-redigir', chamadas: 7, sucessos: 6, custoTotalUsd: 0.17, modeloMaisUsado: 'claude-sonnet-5' }],
};

beforeEach(() => {
  obterPainel.mockReset();
  obterRecomendacoes.mockReset();
  obterPainel.mockResolvedValue(painelVazio);
  obterRecomendacoes.mockImplementation(async (intencao) => recomendarTodas(intencao));
});

describe('PaginaEficiencia', () => {
  it('mostra carregando e depois o estado vazio, com recomendação e simulador utilizáveis', async () => {
    renderizarComProvedores(<PaginaEficiencia />);
    expect(screen.getAllByRole('status')[0]).toHaveTextContent(mensagens.estados.carregando);
    expect(await screen.findByText(m.vazio.titulo)).toBeInTheDocument();
    expect(screen.getByText(m.vazio.texto)).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: m.recomendacao.titulo })).toBeInTheDocument();
    expect(await screen.findByText(m.etapas['blueprint-revisar'])).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: m.simulador.titulo })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: m.ranking.titulo })).toBeNull();
    expect(obterPainel).toHaveBeenCalledWith({ intencao: 'aplicacao', periodo: 'mes' });
    expect(obterRecomendacoes).toHaveBeenCalledWith('aplicacao');
  });

  it('erro ao carregar o painel mostra alerta com tentar de novo', async () => {
    obterPainel.mockRejectedValueOnce(new Error('caiu')).mockResolvedValueOnce(painelVazio);
    renderizarComProvedores(<PaginaEficiencia />);
    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('caiu');
    fireEvent.click(within(alerta).getByRole('button', { name: mensagens.estados.tentarDeNovo }));
    expect(await screen.findByText(m.vazio.titulo)).toBeInTheDocument();
  });

  it('com dados mostra indicadores, ranking com selo de amostra pequena e gasto por etapa', async () => {
    obterPainel.mockResolvedValue(painelComDados);
    renderizarComProvedores(<PaginaEficiencia />);
    expect(await screen.findByRole('heading', { name: m.ranking.titulo })).toBeInTheDocument();
    expect(screen.queryByText(m.vazio.titulo)).toBeNull();

    const medidor = screen.getByRole('progressbar', { name: m.indicadores.gasto });
    expect(medidor).toHaveAttribute('aria-valuenow', '3');
    expect(screen.getByText(/3,4% do teto de/)).toBeInTheDocument();
    expect(screen.getAllByText('Claude Sonnet 5').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(mensagens.selo.amostra_pequena)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: m.ranking.grafico })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: m.porEtapa.titulo })).toBeInTheDocument();
    expect(screen.getByText(m.etapas['identidade-redigir'], { selector: 'th' })).toBeInTheDocument();
  });

  it('trocar período e intenção refaz a consulta; "todas" recomenda pela intenção padrão', async () => {
    renderizarComProvedores(<PaginaEficiencia />);
    await screen.findByText(m.vazio.titulo);

    fireEvent.change(screen.getByLabelText(m.filtros.periodo.rotulo), { target: { value: 'tudo' } });
    await vi.waitFor(() => expect(obterPainel).toHaveBeenCalledWith({ intencao: 'aplicacao', periodo: 'tudo' }));

    fireEvent.change(screen.getByLabelText(m.filtros.intencao.rotulo), { target: { value: 'site' } });
    await vi.waitFor(() => expect(obterPainel).toHaveBeenCalledWith({ intencao: 'site', periodo: 'tudo' }));
    await vi.waitFor(() => expect(obterRecomendacoes).toHaveBeenCalledWith('site'));

    fireEvent.change(screen.getByLabelText(m.filtros.intencao.rotulo), { target: { value: 'todas' } });
    await vi.waitFor(() => expect(obterPainel).toHaveBeenCalledWith({ intencao: 'todas', periodo: 'tudo' }));
    expect(obterRecomendacoes).not.toHaveBeenCalledWith('todas');
  });

  it('intenção padrão Kora vem primeiro no filtro', async () => {
    renderizarComProvedores(<PaginaEficiencia />);
    const opcoes = within(await screen.findByLabelText(m.filtros.intencao.rotulo)).getAllByRole('option');
    expect(opcoes[0]).toHaveValue('aplicacao');
    expect(opcoes[0]).toHaveTextContent(mensagens.selecao.padraoKora);
  });
});
