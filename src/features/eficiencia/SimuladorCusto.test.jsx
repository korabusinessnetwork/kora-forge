import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { mensagens } from '../../mensagens.js';
import SimuladorCusto, { interpretarNumero } from './SimuladorCusto.jsx';

const m = mensagens.eficiencia.simulador;

function linhas() {
  return within(screen.getByRole('table')).getAllByRole('row').slice(1);
}
// Intl separa moeda e número com espaço não quebrável; o teste compara em espaço comum.
function celulas(linha) {
  return within(linha).getAllByRole('cell').map((c) => c.textContent.replace(/\u00a0/g, ' '));
}

describe('SimuladorCusto', () => {
  it('com os defaults ordena do mais barato ao mais caro e mostra o percentual do teto', () => {
    render(<SimuladorCusto tetoUsd={5} />);
    const todas = linhas();
    expect(todas[0]).toHaveAttribute('data-modelo', 'claude-haiku-4-5');
    expect(todas.at(-1)).toHaveAttribute('data-modelo', 'claude-fable-5-1');
    // Haiku, 3000 entrada com 60% em cache (1800 × 0.1 + 1200 × 1) + 1000 saída × 5 = 6380 / 1e6 por chamada, × 60
    expect(celulas(todas[0])).toEqual(['US$ 0,0064', 'US$ 0,3828', '7,7%']);
  });

  it('sem teto mostra "sem teto"; ligar o lote reduz pela metade', () => {
    render(<SimuladorCusto />);
    const antes = celulas(linhas()[0]);
    expect(antes[2]).toBe(m.semTeto);
    fireEvent.change(screen.getByLabelText(m.lote.rotulo), { target: { value: 'ligado' } });
    expect(celulas(linhas()[0])[1]).toBe('US$ 0,1914');
  });

  it('valor negativo ou vazio vira zero com aviso junto do campo, sem quebrar a tabela', () => {
    render(<SimuladorCusto tetoUsd={5} />);
    const campo = screen.getByLabelText(m.entrada.rotulo);
    fireEvent.change(campo, { target: { value: '-5' } });
    expect(screen.getByRole('alert')).toHaveTextContent(m.invalido);
    expect(campo).toHaveAttribute('aria-invalid', 'true');
    // Só a saída conta: 1000 × 5 = 0.005 por chamada no Haiku
    expect(celulas(linhas()[0])[0]).toBe('US$ 0,0050');
  });
});

describe('interpretarNumero', () => {
  it('trata vazio, negativo e texto como zero inválido, e arredonda o válido', () => {
    expect(interpretarNumero('')).toEqual({ valor: 0, invalido: true });
    expect(interpretarNumero('-1')).toEqual({ valor: 0, invalido: true });
    expect(interpretarNumero('abc')).toEqual({ valor: 0, invalido: true });
    expect(interpretarNumero(' 12.6 ')).toEqual({ valor: 13, invalido: false });
    expect(interpretarNumero('0')).toEqual({ valor: 0, invalido: false });
  });
});
