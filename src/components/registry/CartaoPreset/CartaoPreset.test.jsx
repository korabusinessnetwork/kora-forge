import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CartaoPreset from './CartaoPreset.jsx';

const preset = { id: 'criar-site', nome: 'Criar Site', descricao: 'Landing page.', categoria: 'site', icone: 'globe', versao: 1, origem: 'builtin', etapas: ['identidade', 'design', 'materializar'] };

describe('CartaoPreset', () => {
  it('como link mostra categoria, nome, descrição e etapas', () => {
    render(<MemoryRouter><CartaoPreset preset={preset} to="/novo?preset=criar-site" /></MemoryRouter>);
    const link = screen.getByRole('link', { name: /Criar Site/ });
    expect(link).toHaveAttribute('href', '/novo?preset=criar-site');
    expect(link).toHaveTextContent('Site');
    expect(link).toHaveTextContent('3 etapas');
    expect(link).toHaveTextContent('v1');
  });

  it('como botão chama onEscolher com o preset', () => {
    const onEscolher = vi.fn();
    render(<CartaoPreset preset={preset} onEscolher={onEscolher} />);
    fireEvent.click(screen.getByRole('button', { name: /Criar Site/ }));
    expect(onEscolher).toHaveBeenCalledWith(preset);
  });
});
