import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LinhaPlano from './LinhaPlano.jsx';
import { mensagens } from '../../../mensagens.js';

const m = mensagens.plano;
const arquivo = (extra = {}) => ({ caminho: 'CLAUDE.md', acao: 'criar', tamanho: 2048, tamanhoAtual: null, template: 'fundacao-kora', conteudo: 'x', ...extra });
const renderizar = (props) => render(<ul><LinhaPlano arquivo={arquivo(props)} /></ul>);

describe('LinhaPlano', () => {
  it('mostra caminho em mono, ação, tamanho e template de origem', () => {
    renderizar();
    expect(screen.getByText('CLAUDE.md').tagName).toBe('CODE');
    expect(screen.getByText(m.acao.criar)).toBeInTheDocument();
    expect(screen.getByText(/2\.0 kB/)).toBeInTheDocument();
    expect(screen.getByText('fundacao-kora')).toBeInTheDocument();
  });

  it('conflito mostra também o tamanho de hoje', () => {
    renderizar({ acao: 'sobrescrever', tamanhoAtual: 512 });
    expect(screen.getByText(m.acao.sobrescrever)).toBeInTheDocument();
    expect(screen.getByText(/512 B/)).toBeInTheDocument();
  });

  it('arquivo idêntico aparece como igual', () => {
    renderizar({ acao: 'pular', tamanhoAtual: 2048 });
    expect(screen.getByText(m.acao.pular)).toBeInTheDocument();
  });
});
