import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PainelPropriedades from './PainelPropriedades.jsx';
import { mensagens } from '../../../mensagens.js';

const m = mensagens.studio.propriedades;

// Um item com uma prop de cada tipo, que é o contrato do catálogo. Se um tipo novo entrar lá sem
// campo aqui, é este arquivo que grita.
const ITEM = {
  id: 'cartao',
  papel: 'componente',
  nome: 'Cartão',
  descricao: 'Um cartão.',
  microtexto: 'Vira um <article>.',
  aceita: [],
  props: [
    { id: 'titulo', tipo: 'texto', rotulo: 'Título', microtexto: 'O que o cartão diz.', padrao: 'Cartão', obrigatoria: true },
    { id: 'colunas', tipo: 'numero', rotulo: 'Colunas', microtexto: 'Quantas colunas.', padrao: 2, obrigatoria: false },
    { id: 'sombra', tipo: 'booleano', rotulo: 'Sombra', microtexto: 'Eleva o cartão.', padrao: true, obrigatoria: false },
    { id: 'alinhamento', tipo: 'opcao', rotulo: 'Alinhamento', microtexto: 'Onde o texto encosta.', padrao: 'inicio', obrigatoria: false, opcoes: ['inicio', 'centro'] },
  ],
};

const PAGINAS = [
  { id: 'inicio', nome: 'Início', rota: '/', regioes: [] },
  { id: 'painel', nome: 'Painel', rota: '/painel', regioes: [] },
];

const montar = (extras = {}) => {
  const props = {
    selecionado: null,
    paginas: PAGINAS,
    onTrocarCampoDaPagina: () => {},
    onTrocarProp: () => {},
    onRemover: () => {},
    ...extras,
  };
  render(<PainelPropriedades {...props} />);
  return props;
};

const noSelecionado = (props = {}) => ({ escopo: 'no', no: { id: 'c1', tipo: 'cartao', props, filhos: [] }, item: ITEM });

describe('sem seleção', () => {
  it('diz o que fazer, em vez de ficar em branco', () => {
    montar();
    expect(screen.getByText(m.semSelecao)).toBeInTheDocument();
  });
});

describe('props do item', () => {
  it('cada tipo do catálogo vira o controle certo, com o valor gravado', () => {
    montar({ selecionado: noSelecionado({ titulo: 'Meu cartão', colunas: 3, sombra: false, alinhamento: 'centro' }) });
    expect(screen.getByLabelText('Título')).toHaveValue('Meu cartão');
    expect(screen.getByLabelText('Colunas')).toHaveAttribute('type', 'number');
    expect(screen.getByLabelText('Colunas')).toHaveValue(3);
    expect(screen.getByLabelText('Sombra')).toHaveValue('nao');
    expect(screen.getByLabelText('Alinhamento')).toHaveValue('centro');
  });

  it('prop ausente no nó mostra o padrão do catálogo: nenhuma pergunta chega sem default', () => {
    montar({ selecionado: noSelecionado({}) });
    expect(screen.getByLabelText('Título')).toHaveValue('Cartão');
    expect(screen.getByLabelText('Colunas')).toHaveValue(2);
    expect(screen.getByLabelText('Sombra')).toHaveValue('sim');
  });

  it('todo campo carrega o microtexto que o item declarou', () => {
    montar({ selecionado: noSelecionado({}) });
    expect(screen.getByText(/O que o cartão diz\./)).toBeInTheDocument();
    expect(screen.getByText(/Eleva o cartão\./)).toBeInTheDocument();
  });

  it('editar devolve a prop inteira e o valor, com número saindo como número', () => {
    const onTrocarProp = vi.fn();
    montar({ selecionado: noSelecionado({}), onTrocarProp });

    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Outro' } });
    expect(onTrocarProp).toHaveBeenLastCalledWith(ITEM.props[0], 'Outro');

    fireEvent.change(screen.getByLabelText('Colunas'), { target: { value: '4' } });
    expect(onTrocarProp).toHaveBeenLastCalledWith(ITEM.props[1], 4);

    fireEvent.change(screen.getByLabelText('Sombra'), { target: { value: 'nao' } });
    expect(onTrocarProp).toHaveBeenLastCalledWith(ITEM.props[2], false);

    fireEvent.change(screen.getByLabelText('Alinhamento'), { target: { value: 'centro' } });
    expect(onTrocarProp).toHaveBeenLastCalledWith(ITEM.props[3], 'centro');
  });

  it('prop obrigatória vazia é avisada junto do campo', () => {
    montar({ selecionado: noSelecionado({ titulo: '  ' }) });
    expect(screen.getByRole('alert')).toHaveTextContent(mensagens.campo.obrigatorio);
  });

  it('item sem prop nenhuma mostra a descrição, e não um painel vazio', () => {
    const semProps = { ...ITEM, props: [] };
    montar({ selecionado: { escopo: 'no', no: { id: 'r1', tipo: 'cartao', props: {}, filhos: [] }, item: semProps } });
    expect(screen.getByText(semProps.descricao)).toBeInTheDocument();
  });

  it('em projeto arquivado nenhum controle aceita edição', () => {
    montar({ selecionado: noSelecionado({}), somenteLeitura: true });
    expect(screen.getByLabelText('Título')).toBeDisabled();
    expect(screen.getByLabelText('Colunas')).toBeDisabled();
    expect(screen.getByLabelText('Sombra')).toBeDisabled();
    expect(screen.getByLabelText('Alinhamento')).toBeDisabled();
  });
});

describe('campos da página', () => {
  const pagina = (extras = {}) => ({ escopo: 'pagina', pagina: { ...PAGINAS[0], ...extras } });

  it('mostra nome e rota da página selecionada', () => {
    montar({ selecionado: pagina() });
    expect(screen.getByLabelText(m.pagina.nome)).toHaveValue('Início');
    expect(screen.getByLabelText(m.pagina.rota)).toHaveValue('/');
  });

  it('rota fora do formato é avisada no campo, com exemplo do que serve', () => {
    montar({ selecionado: pagina({ rota: 'sem-barra' }) });
    expect(screen.getByRole('alert')).toHaveTextContent(m.pagina.rotaInvalida);
  });

  it('rota repetida nomeia a página que já usa aquele caminho', () => {
    montar({ selecionado: pagina({ id: 'painel', nome: 'Painel', rota: '/' }) });
    expect(screen.getByRole('alert')).toHaveTextContent(m.pagina.rotaRepetida('Início'));
  });

  it('a própria rota não conta como repetida', () => {
    montar({ selecionado: pagina() });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('nome em branco é avisado, porque a página apareceria sem identificação nas camadas', () => {
    montar({ selecionado: pagina({ nome: '   ' }) });
    expect(screen.getByRole('alert')).toHaveTextContent(m.pagina.nomeVazio);
  });

  it('editar devolve campo e valor', () => {
    const onTrocarCampoDaPagina = vi.fn();
    montar({ selecionado: pagina(), onTrocarCampoDaPagina });
    fireEvent.change(screen.getByLabelText(m.pagina.rota), { target: { value: '/painel' } });
    expect(onTrocarCampoDaPagina).toHaveBeenCalledWith('rota', '/painel');
  });
});

describe('item que saiu do catálogo', () => {
  const pendente = { escopo: 'no', no: { id: 'x', tipo: 'carrossel', props: { velocidade: 3, laco: true }, filhos: [] }, item: null };

  it('não inventa formulário: mostra o que está gravado, exatamente como está', () => {
    montar({ selecionado: pendente });
    expect(screen.getByText(m.pendente.titulo)).toBeInTheDocument();
    expect(screen.getByText(m.pendente.texto('carrossel'))).toBeInTheDocument();
    expect(screen.getByText('velocidade')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('laco')).toBeInTheDocument();
    expect(screen.getByText('true')).toBeInTheDocument();
  });

  it('a única saída oferecida é remover, e ela é destrutiva de verdade', () => {
    const onRemover = vi.fn();
    montar({ selecionado: pendente, onRemover });
    fireEvent.click(screen.getByRole('button', { name: mensagens.studio.camadas.remover }));
    expect(onRemover).toHaveBeenCalled();
  });

  it('em projeto arquivado nem a remoção fica disponível', () => {
    montar({ selecionado: pendente, somenteLeitura: true });
    expect(screen.getByRole('button', { name: mensagens.studio.camadas.remover })).toBeDisabled();
  });
});
