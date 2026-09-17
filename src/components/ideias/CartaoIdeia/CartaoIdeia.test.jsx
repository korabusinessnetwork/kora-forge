import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CartaoIdeia from './CartaoIdeia.jsx';
import { mensagens } from '../../../mensagens.js';

const m = mensagens.ideias;

const ideia = (extra = {}) => ({
  id: 'i1', titulo: 'Exportar o blueprint em PDF', proximoPasso: null, origem: null,
  estado: 'aberta', criadoEm: '2026-09-08T12:30:00.000Z', ...extra,
});

const renderizar = (extra, props = {}) => {
  const onDescartar = vi.fn();
  render(<CartaoIdeia ideia={ideia(extra)} onDescartar={onDescartar} {...props} />, {
    wrapper: ({ children }) => <ul>{children}</ul>,
  });
  return { onDescartar };
};

describe('CartaoIdeia', () => {
  it('mostra o título e a data', () => {
    renderizar();
    expect(screen.getByText('Exportar o blueprint em PDF')).toBeInTheDocument();
    expect(screen.getByText(/08\/09\/2026/)).toBeInTheDocument();
  });

  it('mostra o próximo passo quando existe', () => {
    renderizar({ proximoPasso: 'ver se dá para reusar o gerador' });
    expect(screen.getByText('ver se dá para reusar o gerador')).toBeInTheDocument();
  });

  it('sem próximo passo não inventa linha vazia', () => {
    const { container } = render(<CartaoIdeia ideia={ideia()} onDescartar={vi.fn()} />, {
      wrapper: ({ children }) => <ul>{children}</ul>,
    });
    expect(container.querySelectorAll('p')).toHaveLength(2);
  });

  it('mostra de que tela a ideia saiu', () => {
    renderizar({ origem: '/projetos/p1/wizard/dados' });
    expect(screen.getByText(new RegExp(m.origemDe('/projetos/p1/wizard/dados')))).toBeInTheDocument();
  });

  it('descartar avisa quem sabe descartar, com o id', () => {
    const { onDescartar } = renderizar();
    fireEvent.click(screen.getByRole('button', { name: m.descartarIdeia('Exportar o blueprint em PDF') }));
    expect(onDescartar).toHaveBeenCalledWith('i1');
  });

  it('enquanto descarta o botão não aceita outro clique', () => {
    renderizar({}, { descartando: true });
    expect(screen.getByRole('button', { name: m.descartarIdeia('Exportar o blueprint em PDF') })).toBeDisabled();
  });
});
