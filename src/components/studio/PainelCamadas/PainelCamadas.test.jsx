import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import PainelCamadas from './PainelCamadas.jsx';
import { mensagens } from '../../../mensagens.js';

const m = mensagens.studio.camadas;

// A mesma forma que `listarLinhas()` produz, escrita à mão para que este arquivo teste o painel e
// não a função que o alimenta, que já tem os próprios testes.
const LINHAS = [
  { chave: 'inicio', escopo: 'pagina', id: 'inicio', pagina: 'inicio', nivel: 1, nome: 'Início', resumo: '/', pendente: false, dentro: 3 },
  { chave: 'r1', escopo: 'no', id: 'r1', pagina: 'inicio', nivel: 2, nome: 'Seção', resumo: null, pendente: false, dentro: 2 },
  { chave: 'n1', escopo: 'no', id: 'n1', pagina: 'inicio', nivel: 3, nome: 'Título', resumo: 'Bem-vindo', pendente: false, dentro: 0 },
  { chave: 'n2', escopo: 'no', id: 'n2', pagina: 'inicio', nivel: 3, nome: 'carrossel', resumo: null, pendente: true, dentro: 0 },
];

const montar = (extras = {}) => {
  const props = {
    linhas: LINHAS,
    selecao: { pagina: 'inicio', no: null },
    onSelecionar: () => {},
    onMover: () => {},
    onRemover: () => {},
    onNovaPagina: () => {},
    podeMover: () => true,
    ...extras,
  };
  render(<PainelCamadas {...props} />);
  return props;
};

const arvore = () => screen.getByRole('tree', { name: m.arvore });
const item = (nome) => within(arvore()).getByRole('treeitem', { name: new RegExp(nome) });

describe('a árvore', () => {
  it('o aninhamento vira aria-level, e a indentação vira atributo, não estilo inline', () => {
    montar();
    expect(item('Início')).toHaveAttribute('aria-level', '1');
    expect(item('Seção')).toHaveAttribute('aria-level', '2');
    expect(item('Título')).toHaveAttribute('data-nivel', '3');
    for (const linha of within(arvore()).getAllByRole('treeitem')) {
      expect(linha).not.toHaveAttribute('style');
    }
  });

  it('o resumo distingue linhas do mesmo tipo, e o pendente vem selado', () => {
    montar();
    expect(item('Título')).toHaveTextContent('Bem-vindo');
    expect(item('carrossel')).toHaveTextContent(m.pendente);
  });

  it('a tabulação entra na árvore uma vez só', () => {
    montar({ selecao: { pagina: 'inicio', no: 'n1' } });
    const linhas = within(arvore()).getAllByRole('treeitem');
    expect(linhas.filter((linha) => linha.getAttribute('tabindex') === '0')).toEqual([item('Título')]);
  });

  it('sem seleção válida, a tabulação cai na primeira linha, e não fora da árvore', () => {
    montar({ selecao: { pagina: null, no: null } });
    expect(item('Início')).toHaveAttribute('tabindex', '0');
  });
});

describe('teclado', () => {
  it('Home e End vão para as pontas da árvore', () => {
    const onSelecionar = vi.fn();
    montar({ onSelecionar });
    fireEvent.keyDown(item('Início'), { key: 'End' });
    expect(onSelecionar).toHaveBeenLastCalledWith(LINHAS.at(-1));
    fireEvent.keyDown(item('carrossel'), { key: 'Home' });
    expect(onSelecionar).toHaveBeenLastCalledWith(LINHAS[0]);
  });

  it('as setas selecionam enquanto andam, que é o comportamento de árvore de item único', () => {
    const onSelecionar = vi.fn();
    montar({ onSelecionar });
    fireEvent.keyDown(item('Início'), { key: 'ArrowDown' });
    expect(onSelecionar).toHaveBeenCalledWith(LINHAS[1]);
  });

  it('a seta esquerda sobe para o pai, pulando os irmãos que estiverem no caminho', () => {
    const onSelecionar = vi.fn();
    montar({ selecao: { pagina: 'inicio', no: 'n2' }, onSelecionar });
    fireEvent.keyDown(item('carrossel'), { key: 'ArrowLeft' });
    expect(onSelecionar).toHaveBeenCalledWith(LINHAS[1]);
  });

  it('a seta direita entra no primeiro filho, e na folha não faz nada', () => {
    const onSelecionar = vi.fn();
    montar({ selecao: { pagina: 'inicio', no: 'n1' }, onSelecionar });
    fireEvent.keyDown(item('Título'), { key: 'ArrowRight' });
    expect(onSelecionar).not.toHaveBeenCalled();
  });

  it('Alt com seta move, e a página não se move por aqui', () => {
    const onMover = vi.fn();
    montar({ onMover });
    fireEvent.keyDown(item('Seção'), { key: 'ArrowDown', altKey: true });
    expect(onMover).toHaveBeenCalledWith(LINHAS[1], 'baixo');

    onMover.mockClear();
    fireEvent.keyDown(item('Início'), { key: 'ArrowUp', altKey: true });
    expect(onMover).not.toHaveBeenCalled();
  });

  it('em projeto arquivado, nem Delete nem Alt com seta fazem alguma coisa', () => {
    const onRemover = vi.fn();
    const onMover = vi.fn();
    montar({ onRemover, onMover, somenteLeitura: true });
    fireEvent.keyDown(item('Título'), { key: 'Delete' });
    fireEvent.keyDown(item('Seção'), { key: 'ArrowDown', altKey: true });
    expect(onRemover).not.toHaveBeenCalled();
    expect(onMover).not.toHaveBeenCalled();
  });
});

describe('remoção', () => {
  it('folha sai na hora: confirmar sempre seria atrito sem proteção, porque nada foi para o disco', () => {
    const onRemover = vi.fn();
    montar({ onRemover });
    fireEvent.keyDown(item('Título'), { key: 'Delete' });
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(onRemover).toHaveBeenCalledWith(LINHAS[2]);
  });

  it('o que leva gente junto confirma, e a pergunta diz quantos vão', () => {
    const onRemover = vi.fn();
    montar({ onRemover });
    fireEvent.keyDown(item('Seção'), { key: 'Delete' });
    const dialogo = screen.getByRole('alertdialog');
    expect(dialogo).toHaveTextContent(m.confirmarRemocao('Seção', 2));
    expect(onRemover).not.toHaveBeenCalled();

    fireEvent.click(within(dialogo).getByRole('button', { name: m.confirmar }));
    expect(onRemover).toHaveBeenCalledWith(LINHAS[1]);
  });

  it('a página tem pergunta própria, porque remover uma rota inteira não é remover um bloco', () => {
    montar();
    fireEvent.keyDown(item('Início'), { key: 'Delete' });
    expect(screen.getByRole('alertdialog')).toHaveTextContent(m.confirmarPagina('Início', 3));
  });

  it('cancelar fecha a pergunta sem remover nada', () => {
    const onRemover = vi.fn();
    montar({ onRemover });
    fireEvent.keyDown(item('Seção'), { key: 'Delete' });
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: m.cancelar }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(onRemover).not.toHaveBeenCalled();
  });
});

describe('botões de ação', () => {
  it('movimento que a regra recusa nem chega habilitado', () => {
    montar({ selecao: { pagina: 'inicio', no: 'n1' }, podeMover: (linha, direcao) => direcao === 'baixo' });
    expect(screen.getByRole('button', { name: `${m.mover.cima}: Título` })).toBeDisabled();
    expect(screen.getByRole('button', { name: `${m.mover.baixo}: Título` })).toBeEnabled();
  });

  it('os botões de mover se referem ao que está selecionado, pelo nome', () => {
    montar({ selecao: { pagina: 'inicio', no: 'n2' } });
    expect(screen.getByRole('button', { name: m.removerRotulo('carrossel') })).toBeInTheDocument();
  });

  it('página selecionada não oferece mover: página se ordena por outro caminho', () => {
    montar();
    expect(screen.getByRole('button', { name: `${m.mover.cima}: Início` })).toBeDisabled();
  });
});

describe('vazio', () => {
  it('sem linha nenhuma, mostra o convite e não desenha árvore', () => {
    montar({ linhas: [] });
    expect(screen.queryByRole('tree')).not.toBeInTheDocument();
    expect(screen.getByText(m.vazio.titulo)).toBeInTheDocument();
    expect(screen.getByText(m.vazio.texto)).toBeInTheDocument();
  });

  it('o convite cria a página', () => {
    const onNovaPagina = vi.fn();
    montar({ linhas: [], onNovaPagina });
    fireEvent.click(screen.getByRole('button', { name: m.vazio.acao }));
    expect(onNovaPagina).toHaveBeenCalled();
  });

  it('em projeto arquivado, nem o convite cria', () => {
    montar({ linhas: [], somenteLeitura: true });
    expect(screen.getByRole('button', { name: m.vazio.acao })).toBeDisabled();
  });
});
