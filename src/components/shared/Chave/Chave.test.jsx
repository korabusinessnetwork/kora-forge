import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Chave from './Chave.jsx';
import { mensagens } from '../../../mensagens.js';

afterEach(() => {
  delete navigator.clipboard;
});

describe('Chave', () => {
  it('mostra o valor em mono e copia ao clicar', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    render(<Chave valor="/dev/kora" rotulo="Workspace" />);
    expect(screen.getByText('/dev/kora').tagName).toBe('CODE');
    fireEvent.click(screen.getByRole('button', { name: `${mensagens.chave.copiar} Workspace` }));
    expect(writeText).toHaveBeenCalledWith('/dev/kora');
    expect(await screen.findByText(mensagens.chave.copiado)).toBeInTheDocument();
  });

  it('sem clipboard disponível não quebra nem finge que copiou', () => {
    render(<Chave valor="x" />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('button')).toHaveTextContent(mensagens.chave.copiar);
  });
});
