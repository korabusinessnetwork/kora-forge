import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PaletaItens from './PaletaItens.jsx';
import { mensagens } from '../../../mensagens.js';

const m = mensagens.studio.paleta;

const ITEM = { id: 'texto', nome: 'Texto', microtexto: 'Vira um <p>.' };

// Os três vazios são o motivo deste arquivo existir: na página inteira só o primeiro é alcançável
// com um catálogo que tem região, e estado vazio sem teste é estado vazio que apodrece.
describe('estados vazios', () => {
  it('sem página, manda criar a página', () => {
    render(<PaletaItens itens={[]} temPagina={false} nomeDaSelecao={null} onAdicionar={() => {}} />);
    expect(screen.getByText(m.vazioSemPagina)).toBeInTheDocument();
  });

  it('com página e nada selecionado, manda selecionar uma região', () => {
    render(<PaletaItens itens={[]} temPagina nomeDaSelecao={null} onAdicionar={() => {}} />);
    expect(screen.getByText(m.vazioSemSelecao)).toBeInTheDocument();
  });

  it('com algo selecionado que não aceita nada, diz o nome do que está selecionado', () => {
    render(<PaletaItens itens={[]} temPagina nomeDaSelecao="Botão" onAdicionar={() => {}} />);
    expect(screen.getByText(m.vazioNaoAceita('Botão'))).toBeInTheDocument();
  });
});

describe('lista', () => {
  it('cada item vira um botão com o nome e o microtexto do catálogo', () => {
    render(<PaletaItens itens={[ITEM]} temPagina nomeDaSelecao="Seção" onAdicionar={() => {}} />);
    const acao = screen.getByRole('button', { name: m.adicionarRotulo('Texto') });
    expect(acao).toHaveTextContent('Texto');
    expect(acao).toHaveTextContent(ITEM.microtexto);
  });

  it('clicar devolve o item inteiro, e não só o id', () => {
    const adicionar = vi.fn();
    render(<PaletaItens itens={[ITEM]} temPagina nomeDaSelecao="Seção" onAdicionar={adicionar} />);
    fireEvent.click(screen.getByRole('button', { name: m.adicionarRotulo('Texto') }));
    expect(adicionar).toHaveBeenCalledWith(ITEM);
  });

  it('em projeto arquivado a lista aparece, mas nenhum botão insere', () => {
    const adicionar = vi.fn();
    render(<PaletaItens itens={[ITEM]} temPagina nomeDaSelecao="Seção" onAdicionar={adicionar} somenteLeitura />);
    const acao = screen.getByRole('button', { name: m.adicionarRotulo('Texto') });
    expect(acao).toBeDisabled();
    fireEvent.click(acao);
    expect(adicionar).not.toHaveBeenCalled();
  });
});
