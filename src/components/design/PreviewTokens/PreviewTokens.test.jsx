import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TOKENS_PADRAO, CATALOGO_TOKENS } from '@shared/schemas/design.js';
import PreviewTokens from './PreviewTokens.jsx';
import { mensagens } from '../../../mensagens.js';

const m = mensagens.design.preview;
const palco = () => screen.getByTestId('palco-preview');

describe('PreviewTokens', () => {
  it('mostra um pedaço de interface de verdade, não só um quadrado colorido', () => {
    render(<PreviewTokens tokens={TOKENS_PADRAO} />);
    expect(screen.getByText(m.amostraTitulo)).toBeInTheDocument();
    expect(screen.getByText(m.amostraTexto)).toBeInTheDocument();
    expect(screen.getByText(m.amostraBotao)).toBeInTheDocument();
    expect(screen.getByText(m.amostraSucesso)).toBeInTheDocument();
  });

  it('aplica os tokens do projeto como variáveis no palco', () => {
    render(<PreviewTokens tokens={{ ...TOKENS_PADRAO, COR_ACENTO: '#ff0000', ESPACO_4: '99px' }} />);
    const estilo = palco().getAttribute('style');
    expect(estilo).toContain('--cor-acento: #ff0000');
    expect(estilo).toContain('--espaco-4: 99px');
  });

  it('mudar o token muda o palco, sem salvar nada', () => {
    const { rerender } = render(<PreviewTokens tokens={TOKENS_PADRAO} />);
    expect(palco().getAttribute('style')).toContain(`--cor-fundo: ${TOKENS_PADRAO.COR_FUNDO}`);

    rerender(<PreviewTokens tokens={{ ...TOKENS_PADRAO, COR_FUNDO: '#123456' }} />);
    expect(palco().getAttribute('style')).toContain('--cor-fundo: #123456');
  });

  // P-06 e ADR-005: o design do projeto não pode vazar para a interface do Forge, e o preview não
  // pode mentir usando token do Forge por baixo.
  it('não injeta nenhum token do Forge no palco', () => {
    render(<PreviewTokens tokens={TOKENS_PADRAO} />);
    expect(palco().getAttribute('style')).not.toContain('--forge-');
  });

  it('os tokens do escuro não entram, porque colidiriam com os do claro', () => {
    render(<PreviewTokens tokens={{ ...TOKENS_PADRAO, ESCURO_COR_FUNDO: '#000000' }} />);
    const estilo = palco().getAttribute('style');
    // `--cor-fundo` aparece uma vez só, com o valor do modo claro.
    expect(estilo).toContain(`--cor-fundo: ${TOKENS_PADRAO.COR_FUNDO}`);
    expect(estilo).not.toContain('#000000');
  });

  it('injeta todos os tokens do modo claro do catálogo', () => {
    render(<PreviewTokens tokens={TOKENS_PADRAO} />);
    const estilo = palco().getAttribute('style');
    for (const token of CATALOGO_TOKENS.filter((t) => t.grupo !== 'escuro')) {
      expect(estilo).toContain(`${token.css}:`);
    }
  });
});
