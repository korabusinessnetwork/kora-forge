import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CartaoProjeto from './CartaoProjeto.jsx';
import { mensagens } from '../../../mensagens.js';

const projeto = {
  id: 'p1', nome: 'Alfa', slug: 'alfa', presetId: 'criar-site', presetNome: 'Criar Site', presetVersao: 1,
  status: 'pronto_para_materializar', etapaAtual: 'design', caminhoDisco: null, criadoEm: '2026-09-02T00:00:00.000Z', atualizadoEm: '2026-09-02T00:00:00.000Z',
};

describe('CartaoProjeto', () => {
  it('mostra nome, preset, etapa, selo e ausência de pasta, e abre o projeto', () => {
    render(<MemoryRouter><CartaoProjeto projeto={projeto} /></MemoryRouter>);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/projetos/p1');
    expect(link).toHaveTextContent('Alfa');
    expect(link).toHaveTextContent('Criar Site');
    expect(link).toHaveTextContent(mensagens.etapas.design);
    expect(link).toHaveTextContent(mensagens.registry.semCaminho);
    expect(screen.getByText(mensagens.selo.pronto)).toHaveAttribute('data-estado', 'pronto');
  });

  it('mostra o caminho quando materializado', () => {
    render(<MemoryRouter><CartaoProjeto projeto={{ ...projeto, status: 'materializado', caminhoDisco: 'D:\\dev\\alfa' }} /></MemoryRouter>);
    expect(screen.getByText('D:\\dev\\alfa').tagName).toBe('CODE');
  });
});
