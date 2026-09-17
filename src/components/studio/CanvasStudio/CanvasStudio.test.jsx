import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import CanvasStudio, { ZOOMS, ZOOM_PADRAO } from './CanvasStudio.jsx';
import { TOKENS_PADRAO } from '@shared/schemas/design.js';
import { mensagens } from '../../../mensagens.js';

const m = mensagens.studio.canvas;

const ITENS = [
  { id: 'secao', papel: 'regiao', nome: 'Seção', props: [], aceita: ['titulo'] },
  {
    id: 'titulo',
    papel: 'componente',
    nome: 'Título',
    props: [
      { id: 'texto', tipo: 'texto', rotulo: 'Texto', padrao: 'Título da seção' },
      { id: 'nivel', tipo: 'opcao', rotulo: 'Nível', padrao: '2', opcoes: ['1', '2', '3'] },
    ],
    aceita: [],
  },
];

const pagina = (regioes) => ({ id: 'inicio', nome: 'Início', rota: '/', regioes });

const montar = (extras = {}) => {
  const props = {
    pagina: pagina([{ id: 'r1', tipo: 'secao', props: {}, filhos: [{ id: 'n1', tipo: 'titulo', props: { texto: 'Olá' }, filhos: [] }] }]),
    itens: ITENS,
    tokens: TOKENS_PADRAO,
    selecao: { pagina: 'inicio', no: null },
    onSelecionar: () => {},
    vista: 'pagina',
    onTrocarVista: () => {},
    zoom: ZOOM_PADRAO,
    onTrocarZoom: () => {},
    amostra: <p>amostra de tokens</p>,
    ...extras,
  };
  return { ...render(<CanvasStudio {...props} />), props };
};

describe('desenho', () => {
  it('desenha o item com o componente real, e prop ausente cai no padrão do catálogo', () => {
    montar();
    // `nivel` não está no nó: o desenho tem que sair como o gerador escreveria, que é h2.
    expect(screen.getByRole('heading', { level: 2, name: 'Olá' })).toBeInTheDocument();
  });

  it('clicar num nó seleciona só ele, e não os que o contêm', () => {
    const onSelecionar = vi.fn();
    montar({ onSelecionar });
    fireEvent.click(screen.getByRole('heading', { name: 'Olá' }));
    expect(onSelecionar).toHaveBeenCalledTimes(1);
    expect(onSelecionar).toHaveBeenCalledWith('n1');
  });

  it('item fora do catálogo vira caixa nomeada, e o que está dentro dele continua desenhado', () => {
    montar({ pagina: pagina([{ id: 'x', tipo: 'carrossel', props: {}, filhos: [{ id: 'n1', tipo: 'titulo', props: { texto: 'Preservado', nivel: '3' }, filhos: [] }] }]) });
    expect(screen.getByText(m.desconhecido('carrossel'))).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Preservado' })).toBeInTheDocument();
  });

  it('o palco carrega os tokens do projeto, e é o único lugar que carrega', () => {
    const { container } = montar();
    const regiao = screen.getByRole('region', { name: m.regiao });
    expect(regiao.style.getPropertyValue('--projeto-cor-fundo')).toBe(TOKENS_PADRAO.cor.fundo);
    for (const elemento of container.querySelectorAll('[style]')) {
      if (elemento === regiao) continue;
      expect(elemento.getAttribute('style')).not.toContain('--projeto-');
    }
  });
});

describe('estados', () => {
  it('sem página, diz o que fazer em vez de mostrar moldura vazia', () => {
    montar({ pagina: null });
    expect(screen.getByText(m.semPagina.titulo)).toBeInTheDocument();
    expect(screen.getByText(m.semPagina.texto)).toBeInTheDocument();
  });

  it('página sem região aponta o painel Adicionar, que é onde a próxima ação está', () => {
    montar({ pagina: pagina([]) });
    expect(screen.getByText(m.paginaVazia.titulo)).toBeInTheDocument();
    expect(screen.getByText(m.paginaVazia.texto)).toBeInTheDocument();
  });
});

describe('vista e zoom', () => {
  it('a vista de amostra mostra o que veio de fora, sem desenhar página nenhuma', () => {
    montar({ vista: 'amostra' });
    expect(screen.getByText('amostra de tokens')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Olá' })).not.toBeInTheDocument();
  });

  it('o zoom só aparece quando há página para ampliar', () => {
    const { unmount } = montar({ vista: 'amostra' });
    expect(screen.queryByLabelText(m.zoom)).not.toBeInTheDocument();
    unmount();
    montar();
    expect(screen.getByLabelText(m.zoom)).toBeInTheDocument();
  });

  it('os degraus de zoom são nomeados, com 100% marcado como padrão e em primeiro', () => {
    montar();
    const opcoes = within(screen.getByLabelText(m.zoom)).getAllByRole('option');
    expect(opcoes[0]).toHaveTextContent(`${ZOOM_PADRAO}%`);
    expect(opcoes).toHaveLength(ZOOMS.length);
  });

  it('trocar o zoom avisa quem manda, e o valor vira atributo, não estilo inline', () => {
    const onTrocarZoom = vi.fn();
    const { container } = montar({ onTrocarZoom, zoom: '75' });
    expect(container.querySelector('[data-zoom="75"]')).not.toBeNull();
    fireEvent.change(screen.getByLabelText(m.zoom), { target: { value: '50' } });
    expect(onTrocarZoom).toHaveBeenCalledWith('50');
  });

  it('trocar a vista avisa quem manda', () => {
    const onTrocarVista = vi.fn();
    montar({ onTrocarVista });
    fireEvent.change(screen.getByLabelText(m.vista), { target: { value: 'amostra' } });
    expect(onTrocarVista).toHaveBeenCalledWith('amostra');
  });
});
