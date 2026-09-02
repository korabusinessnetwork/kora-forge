import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderizarComProvedores } from '../../testes/renderizar.jsx';
import { mensagens } from '../../mensagens.js';
import PaginaInicio from './PaginaInicio.jsx';

vi.mock('../../services/health.js', () => ({ obterHealth: vi.fn() }));
import { obterHealth } from '../../services/health.js';

const health = (extra = {}) => ({
  versao: '0.1.0',
  workspace: { configurado: false, caminho: null },
  cofre: 'ausente',
  copiloto: { ligado: false },
  ...extra,
});

beforeEach(() => {
  obterHealth.mockReset();
});

describe('PaginaInicio', () => {
  it('mostra carregando antes da resposta', () => {
    obterHealth.mockReturnValue(new Promise(() => {}));
    renderizarComProvedores(<PaginaInicio />);
    expect(screen.getByRole('status')).toHaveTextContent(mensagens.estados.carregando);
  });

  it('sem workspace mostra a ação de configurar', async () => {
    obterHealth.mockResolvedValue(health());
    renderizarComProvedores(<PaginaInicio />);
    expect(await screen.findByText('0.1.0')).toBeInTheDocument();
    expect(screen.getByText(mensagens.inicio.workspaceVazio)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: mensagens.inicio.configurar })).toHaveAttribute('href', '/config');
    expect(screen.getByText(mensagens.inicio.cofreAusente)).toBeInTheDocument();
    expect(screen.getByText(mensagens.inicio.copilotoDesligado)).toBeInTheDocument();
  });

  it('com workspace mostra o caminho em mono', async () => {
    obterHealth.mockResolvedValue(health({ workspace: { configurado: true, caminho: '/dev/kora' }, cofre: 'trancado' }));
    renderizarComProvedores(<PaginaInicio />);
    expect(await screen.findByText('/dev/kora')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: mensagens.inicio.configurar })).toBeNull();
    expect(screen.getByText(mensagens.inicio.cofreTrancado)).toBeInTheDocument();
  });

  it('erro mostra alerta com a mensagem e permite tentar de novo', async () => {
    obterHealth.mockRejectedValueOnce(new Error('A API local não respondeu.')).mockResolvedValueOnce(health());
    renderizarComProvedores(<PaginaInicio />);
    expect(await screen.findByRole('alert')).toHaveTextContent('A API local não respondeu.');
    fireEvent.click(screen.getByRole('button', { name: mensagens.estados.tentarDeNovo }));
    expect(await screen.findByText('0.1.0')).toBeInTheDocument();
  });
});
