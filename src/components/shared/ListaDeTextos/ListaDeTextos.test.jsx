import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ListaDeTextos from './ListaDeTextos.jsx';
import { mensagens } from '../../../mensagens.js';

const m = mensagens.lista;
const renderizar = (props = {}) => {
  const onChange = vi.fn();
  render(<ListaDeTextos id="personas" rotulo="Personas" microtexto="Uma por pessoa." itens={[]} onChange={onChange} {...props} />);
  return onChange;
};

describe('ListaDeTextos', () => {
  it('vazio traz a próxima ação e adicionar exige texto', () => {
    const onChange = renderizar();
    expect(screen.getByText(m.vazio)).toBeInTheDocument();
    const adicionar = screen.getByRole('button', { name: m.adicionar });
    expect(adicionar).toBeDisabled();
    fireEvent.change(screen.getByLabelText(m.novoItem('Personas')), { target: { value: '  dev  ' } });
    fireEvent.click(adicionar);
    expect(onChange).toHaveBeenCalledWith(['dev']);
  });

  it('Enter adiciona sem enviar formulário', () => {
    const onChange = renderizar();
    const entrada = screen.getByLabelText(m.novoItem('Personas'));
    fireEvent.change(entrada, { target: { value: 'matheus' } });
    fireEvent.keyDown(entrada, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith(['matheus']);
  });

  it('edita e remove item existente', () => {
    const onChange = renderizar({ itens: ['dev', 'dono'] });
    expect(screen.queryByText(m.vazio)).toBeNull();
    fireEvent.change(screen.getByLabelText('Personas 1'), { target: { value: 'devs' } });
    expect(onChange).toHaveBeenCalledWith(['devs', 'dono']);
    fireEvent.click(screen.getByRole('button', { name: `${m.remover} dono` }));
    expect(onChange).toHaveBeenCalledWith(['dev']);
  });

  it('exige microtexto', () => {
    const silencio = vi.spyOn(console, 'error').mockImplementation(() => {});
    const engolir = (evento) => evento.preventDefault();
    window.addEventListener('error', engolir);
    try {
      expect(() => render(<ListaDeTextos id="x" rotulo="X" itens={[]} onChange={() => {}} />)).toThrow(/microtexto/);
    } finally {
      window.removeEventListener('error', engolir);
      silencio.mockRestore();
    }
  });
});
