import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import VisualizadorDiff, { linhasDoDiff } from './VisualizadorDiff.jsx';

describe('linhasDoDiff', () => {
  it('preserva o contexto e marca remoções e adições', () => {
    expect(linhasDoDiff('antes\nvelho\ndepois', 'antes\nnovo\ndepois')).toEqual([
      { tipo: 'igual', texto: 'antes' },
      { tipo: 'removida', texto: 'velho' },
      { tipo: 'adicionada', texto: 'novo' },
      { tipo: 'igual', texto: 'depois' },
    ]);
  });
});

describe('VisualizadorDiff', () => {
  it('fica fechado até a pessoa pedir para ver as diferenças', () => {
    render(<VisualizadorDiff arquivo={{ caminho: 'src/App.jsx', conteudoAtual: 'velho', conteudo: 'novo' }} />);
    expect(screen.queryByText(/− velho/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Ver diferenças' }));
    expect(screen.getByText(/− velho/)).toBeInTheDocument();
    expect(screen.getByText(/\+ novo/)).toBeInTheDocument();
  });
});
