import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ListaProjetos from './ListaProjetos.jsx';
import { mensagens } from '../../../mensagens.js';

const projeto = (id, nome) => ({
  id, nome, slug: nome.toLowerCase(), presetId: 'criar-site', presetNome: 'Criar Site', presetVersao: 1,
  status: 'rascunho', etapaAtual: 'identidade', caminhoDisco: null, criadoEm: '2026-09-02T00:00:00.000Z', atualizadoEm: '2026-09-02T00:00:00.000Z',
});
const base = {
  projetos: [], busca: '', status: '', onBuscaChange: vi.fn(), onStatusChange: vi.fn(), carregando: false, erro: null,
  onTentarDeNovo: vi.fn(), onLimparFiltros: vi.fn(), vazioInicial: <p>vazio inicial</p>,
};
const renderizar = (props) => render(<MemoryRouter><ListaProjetos {...base} {...props} /></MemoryRouter>);

describe('ListaProjetos', () => {
  it('sem projetos e sem filtro mostra o vazio inicial, sem barra', () => {
    renderizar({});
    expect(screen.getByText('vazio inicial')).toBeInTheDocument();
    expect(screen.queryByLabelText(mensagens.registry.busca.rotulo)).toBeNull();
  });

  it('com projetos mostra a barra e os cartões, e "ativos" é o padrão Kora', () => {
    renderizar({ projetos: [projeto('1', 'Alfa'), projeto('2', 'Beta')] });
    expect(screen.getAllByRole('link')).toHaveLength(2);
    const opcoes = screen.getAllByRole('option');
    expect(opcoes[0]).toHaveTextContent(`${mensagens.registry.filtro.ativos} · ${mensagens.selecao.padraoKora}`);
    fireEvent.change(screen.getByLabelText(mensagens.registry.busca.rotulo), { target: { value: 'al' } });
    expect(base.onBuscaChange).toHaveBeenCalledWith('al');
    fireEvent.change(screen.getByLabelText(mensagens.registry.filtro.rotulo), { target: { value: 'arquivado' } });
    expect(base.onStatusChange).toHaveBeenCalledWith('arquivado');
  });

  it('filtro sem resultado mostra "nenhum resultado" com limpar filtros', () => {
    renderizar({ busca: 'zzz' });
    expect(screen.getByText(mensagens.registry.semResultado.titulo)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: mensagens.registry.semResultado.limpar }));
    expect(base.onLimparFiltros).toHaveBeenCalled();
  });

  it('carregando e erro têm os papéis certos', () => {
    const { unmount } = renderizar({ carregando: true });
    expect(screen.getByRole('status')).toHaveTextContent(mensagens.estados.carregando);
    unmount();
    renderizar({ erro: 'caiu' });
    expect(screen.getByRole('alert')).toHaveTextContent('caiu');
    fireEvent.click(screen.getByRole('button', { name: mensagens.estados.tentarDeNovo }));
    expect(base.onTentarDeNovo).toHaveBeenCalled();
  });
});
