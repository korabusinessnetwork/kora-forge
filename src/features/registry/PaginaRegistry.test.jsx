import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderizarComProvedores } from '../../testes/renderizar.jsx';
import { mensagens } from '../../mensagens.js';
import PaginaRegistry from './PaginaRegistry.jsx';

vi.mock('../../services/projetos.js', () => ({ listarProjetos: vi.fn() }));
vi.mock('../../services/presets.js', () => ({ listarPresets: vi.fn() }));
vi.mock('../../services/health.js', () => ({ obterHealth: vi.fn() }));
import { listarProjetos } from '../../services/projetos.js';
import { listarPresets } from '../../services/presets.js';
import { obterHealth } from '../../services/health.js';

const preset = { id: 'criar-site', nome: 'Criar Site', descricao: 'd', categoria: 'site', icone: 'globe', versao: 1, origem: 'builtin', etapas: ['identidade', 'materializar'] };
const projeto = (id, nome) => ({
  id, nome, slug: nome.toLowerCase(), presetId: 'criar-site', presetNome: 'Criar Site', presetVersao: 1,
  status: 'rascunho', etapaAtual: 'identidade', caminhoDisco: null, criadoEm: '2026-09-02T00:00:00.000Z', atualizadoEm: '2026-09-02T00:00:00.000Z',
});
const health = (configurado) => ({ versao: '0.1.0', workspace: { configurado, caminho: configurado ? '/dev' : null }, cofre: 'ausente', copiloto: { ligado: false } });

beforeEach(() => {
  listarProjetos.mockReset();
  listarPresets.mockReset();
  obterHealth.mockReset();
  listarPresets.mockResolvedValue([preset]);
  obterHealth.mockResolvedValue(health(true));
});

describe('PaginaRegistry', () => {
  it('carregando, depois vazio inicial com os menus como próxima ação', async () => {
    listarProjetos.mockResolvedValue([]);
    renderizarComProvedores(<PaginaRegistry />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(await screen.findByText(mensagens.registry.vazio.titulo)).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: /Criar Site/ })).toHaveAttribute('href', '/novo?preset=criar-site');
    expect(screen.getByRole('link', { name: mensagens.registry.novo })).toHaveAttribute('href', '/novo');
  });

  it('lista os projetos e leva filtros para a API', async () => {
    listarProjetos.mockResolvedValue([projeto('1', 'Alfa'), projeto('2', 'Beta')]);
    renderizarComProvedores(<PaginaRegistry />);
    expect(await screen.findByRole('link', { name: /Alfa/ })).toHaveAttribute('href', '/projetos/1');
    expect(listarProjetos).toHaveBeenCalledWith({ status: undefined, busca: undefined });
    fireEvent.change(screen.getByLabelText(mensagens.registry.filtro.rotulo), { target: { value: 'arquivado' } });
    await waitFor(() => expect(listarProjetos).toHaveBeenCalledWith({ status: 'arquivado', busca: undefined }));
    fireEvent.change(screen.getByLabelText(mensagens.registry.busca.rotulo), { target: { value: 'al' } });
    await waitFor(() => expect(listarProjetos).toHaveBeenCalledWith({ status: 'arquivado', busca: 'al' }));
  });

  it('busca sem resultado mostra o estado próprio e limpar filtros volta ao padrão', async () => {
    listarProjetos.mockResolvedValue([]);
    renderizarComProvedores(<PaginaRegistry />, { rota: '/?busca=zzz' });
    expect(await screen.findByText(mensagens.registry.semResultado.titulo)).toBeInTheDocument();
    expect(listarProjetos).toHaveBeenCalledWith({ status: undefined, busca: 'zzz' });
    fireEvent.click(screen.getByRole('button', { name: mensagens.registry.semResultado.limpar }));
    expect(await screen.findByText(mensagens.registry.vazio.titulo)).toBeInTheDocument();
  });

  it('erro mostra alerta e tentar de novo recarrega', async () => {
    listarProjetos.mockRejectedValueOnce(new Error('caiu')).mockResolvedValueOnce([projeto('1', 'Alfa')]);
    renderizarComProvedores(<PaginaRegistry />);
    expect(await screen.findByRole('alert')).toHaveTextContent('caiu');
    fireEvent.click(screen.getByRole('button', { name: mensagens.estados.tentarDeNovo }));
    expect(await screen.findByRole('link', { name: /Alfa/ })).toBeInTheDocument();
  });

  it('avisa quando o workspace não está configurado', async () => {
    obterHealth.mockResolvedValue(health(false));
    listarProjetos.mockResolvedValue([]);
    renderizarComProvedores(<PaginaRegistry />);
    expect(await screen.findByRole('note')).toHaveTextContent(mensagens.registry.avisoWorkspace);
    expect(screen.getByRole('link', { name: mensagens.registry.configurar })).toHaveAttribute('href', '/config');
  });
});
