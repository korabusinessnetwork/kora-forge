import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LayoutStudio from './LayoutStudio.jsx';
import { mensagens } from '../../../mensagens.js';

const m = mensagens.studio.layout;

describe('LayoutStudio', () => {
  it('põe cada slot no seu lugar e nomeia as duas colunas laterais', () => {
    render(<LayoutStudio cabecalho={<h1>Studio</h1>} esquerda={<p>camadas</p>} centro={<p>canvas</p>} direita={<p>ajustes</p>} />);

    expect(screen.getByRole('heading', { name: 'Studio' })).toBeInTheDocument();
    // Nomear as laterais dá a quem navega por landmark um jeito de pular direto para a coluna
    // certa, em vez de percorrer a árvore inteira para chegar nos tokens.
    expect(screen.getByRole('complementary', { name: m.esquerda })).toHaveTextContent('camadas');
    expect(screen.getByRole('complementary', { name: m.direita })).toHaveTextContent('ajustes');
    expect(screen.getByText('canvas')).toBeInTheDocument();
  });

  it('a ordem no DOM é a ordem de leitura: estrutura, canvas, ajustes', () => {
    const { container } = render(<LayoutStudio cabecalho={null} esquerda={<p>um</p>} centro={<p>dois</p>} direita={<p>três</p>} />);
    expect([...container.querySelectorAll('p')].map((p) => p.textContent)).toEqual(['um', 'dois', 'três']);
  });

  it('slot vazio não quebra nem deixa coluna fantasma com conteúdo de outra', () => {
    render(<LayoutStudio cabecalho={null} esquerda={null} centro={<p>só o centro</p>} direita={null} />);
    expect(screen.getByRole('complementary', { name: m.esquerda })).toBeEmptyDOMElement();
    expect(screen.getByText('só o centro')).toBeInTheDocument();
  });
});
