import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TOKENS_PADRAO } from '@shared/schemas/design.js';
import { trocarToken } from '../../../features/studio/campos.js';
import PreviewProjeto from './PreviewProjeto.jsx';
import { mensagens } from '../../../mensagens.js';

const m = mensagens.studio.preview;
const palco = () => screen.getByRole('region', { name: m.regiao });

describe('PreviewProjeto', () => {
  it('é uma região anunciável, com uma amostra de cada peça que o token afeta', () => {
    render(<PreviewProjeto tokens={TOKENS_PADRAO} />);
    expect(palco()).toBeInTheDocument();
    for (const texto of [m.amostra.titulo, m.amostra.botao, m.amostra.cartaoTitulo, m.amostra.campoRotulo, m.amostra.mono, m.amostra.estados.perigo]) {
      expect(screen.getByText(texto), texto).toBeInTheDocument();
    }
  });

  it('aplica os tokens como custom property no próprio elemento, com o alias do projeto', () => {
    render(<PreviewProjeto tokens={TOKENS_PADRAO} />);
    const estilo = palco().getAttribute('style');
    expect(estilo).toContain(`--projeto-cor-acento: ${TOKENS_PADRAO.cor.acento}`);
    expect(estilo).toContain('--projeto-espaco-1: 4px');
    expect(estilo).not.toContain('--forge-');
  });

  it('trocar um token muda o preview no mesmo render, que é o que faz o preview ser ao vivo', () => {
    const { rerender } = render(<PreviewProjeto tokens={TOKENS_PADRAO} />);
    expect(palco().style.getPropertyValue('--projeto-cor-acento')).toBe(TOKENS_PADRAO.cor.acento);
    rerender(<PreviewProjeto tokens={trocarToken(TOKENS_PADRAO, 'cor.acento', '#ff0055')} />);
    expect(palco().style.getPropertyValue('--projeto-cor-acento')).toBe('#ff0055');
  });

  it('o tema escuro não vira estado do preview: ele é media query no arquivo gerado', () => {
    render(<PreviewProjeto tokens={trocarToken(TOKENS_PADRAO, 'corEscuro.fundo', '#123456')} />);
    expect(palco().getAttribute('style')).not.toContain('#123456');
  });
});
