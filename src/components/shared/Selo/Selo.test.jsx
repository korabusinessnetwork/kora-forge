import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Selo, { ESTADOS_SELO } from './Selo.jsx';
import { mensagens } from '../../../mensagens.js';

describe('Selo', () => {
  it.each(ESTADOS_SELO)('estado %s mostra o texto e marca data-estado', (estado) => {
    render(<Selo estado={estado} />);
    const selo = screen.getByText(mensagens.selo[estado]);
    expect(selo).toHaveAttribute('data-estado', estado);
  });

  it('aceita texto próprio', () => {
    render(<Selo estado="ativa">conectada</Selo>);
    expect(screen.getByText('conectada')).toBeInTheDocument();
  });
});
