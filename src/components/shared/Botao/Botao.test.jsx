import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Botao from './Botao.jsx';

describe('Botao', () => {
  it('renderiza o texto e dispara onClick', () => {
    const onClick = vi.fn();
    render(<Botao onClick={onClick}>Salvar</Botao>);
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('carregando desabilita, marca aria-busy e não dispara clique', () => {
    const onClick = vi.fn();
    render(<Botao carregando onClick={onClick}>Salvar</Botao>);
    const botao = screen.getByRole('button');
    expect(botao).toBeDisabled();
    expect(botao).toHaveAttribute('aria-busy', 'true');
    fireEvent.click(botao);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('tipo padrão é button e aceita submit', () => {
    const { rerender } = render(<Botao>x</Botao>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
    rerender(<Botao tipo="submit">x</Botao>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
  });

  it.each(['primario', 'secundario', 'fantasma', 'destrutivo'])('variante %s renderiza', (variante) => {
    render(<Botao variante={variante}>x</Botao>);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});
