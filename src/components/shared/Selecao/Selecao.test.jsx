import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Selecao from './Selecao.jsx';
import { mensagens } from '../../../mensagens.js';

const opcoes = [
  { valor: 'a', rotulo: 'A' },
  { valor: 'b', rotulo: 'B', padraoKora: true },
  { valor: 'c', rotulo: 'C' },
];

describe('Selecao', () => {
  it('põe a opção padrão Kora primeiro, com selo, e mantém a ordem das outras', () => {
    render(<Selecao id="t" valor="b" onChange={() => {}} opcoes={opcoes} />);
    const itens = screen.getAllByRole('option');
    expect(itens.map((o) => o.value)).toEqual(['b', 'a', 'c']);
    expect(itens[0]).toHaveTextContent(`B · ${mensagens.selecao.padraoKora}`);
    expect(itens[1]).toHaveTextContent('A');
  });

  it('chama onChange com o valor escolhido', () => {
    const onChange = vi.fn();
    render(<Selecao id="t" valor="b" onChange={onChange} opcoes={opcoes} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'c' } });
    expect(onChange).toHaveBeenCalledWith('c');
  });
});
