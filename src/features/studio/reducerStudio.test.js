import { describe, it, expect } from 'vitest';
import { documentoDesignSchema, TOKENS_PADRAO } from '@shared/schemas/design.js';
import { ESTADO_INICIAL, reducerStudio, rotuloDeDesfazer, rotuloDeRefazer, selecaoValida } from './reducerStudio.js';
import { encontrarNo } from './documento.js';
import { mensagens } from '../../mensagens.js';

const m = mensagens.studio;

const ITENS = [
  { id: 'secao', papel: 'regiao', nome: 'Seção', props: [], aceita: ['titulo', 'texto', 'cartao'] },
  { id: 'rodape', papel: 'regiao', nome: 'Rodapé', props: [], aceita: ['texto'] },
  { id: 'titulo', papel: 'componente', nome: 'Título', props: [{ id: 'texto', tipo: 'texto', rotulo: 'Texto', padrao: 'Título' }], aceita: [] },
  { id: 'texto', papel: 'componente', nome: 'Texto', props: [{ id: 'conteudo', tipo: 'texto', rotulo: 'Conteúdo', padrao: 'Parágrafo' }], aceita: [] },
  { id: 'cartao', papel: 'componente', nome: 'Cartão', props: [], aceita: ['texto'] },
];

const VAZIO = documentoDesignSchema.parse({});

// Aplica uma sequência de ações e devolve o estado final. Nenhum componente é montado: desfazer é
// a parte que mais quebra em editor, e a forma honesta de conferir isso é exercitar sequências.
function rodar(acoes, documento = VAZIO) {
  return acoes.reduce(reducerStudio, reducerStudio(ESTADO_INICIAL, { tipo: 'iniciar', documento, itens: ITENS }));
}

const comPagina = () => ({ ...VAZIO, paginas: [{ id: 'inicio', nome: 'Início', rota: '/', regioes: [] }] });

describe('início e seleção', () => {
  it('começa na primeira página, sem nada selecionado dentro dela', () => {
    const estado = rodar([], comPagina());
    expect(estado.selecao).toEqual({ pagina: 'inicio', no: null });
    expect(estado.passado).toEqual([]);
    expect(estado.futuro).toEqual([]);
  });

  it('documento sem página nenhuma começa sem seleção, e isso não é erro', () => {
    expect(rodar([]).selecao).toEqual({ pagina: null, no: null });
  });

  it('seleção que aponta para o que não existe mais é corrigida em um lugar só', () => {
    const documento = { ...VAZIO, paginas: [{ id: 'inicio', nome: 'Início', rota: '/', regioes: [{ id: 'secao', tipo: 'secao', props: {}, filhos: [] }] }] };
    expect(selecaoValida(documento, { pagina: 'sumiu', no: 'sumiu' })).toEqual({ pagina: 'inicio', no: null });
    expect(selecaoValida(documento, { pagina: 'inicio', no: 'secao' })).toEqual({ pagina: 'inicio', no: 'secao' });
    expect(selecaoValida(null, { pagina: 'inicio', no: 'secao' })).toEqual({ pagina: null, no: null });
  });

  it('selecionar não entra na história: seleção não é edição', () => {
    const estado = rodar([{ tipo: 'selecionar', pagina: 'inicio' }], comPagina());
    expect(estado.passado).toEqual([]);
  });
});

describe('páginas', () => {
  it('página nova é criada e já fica selecionada, para a próxima ação continuar de onde se está', () => {
    const estado = rodar([{ tipo: 'adicionarPagina', nome: 'Início' }]);
    expect(estado.documento.paginas).toHaveLength(1);
    expect(estado.selecao).toEqual({ pagina: 'inicio', no: null });
    expect(rotuloDeDesfazer(estado)).toBe(m.acoes.adicionarPagina);
  });

  it('remover a página selecionada leva a seleção para a vizinha', () => {
    const estado = rodar([
      { tipo: 'adicionarPagina', nome: 'Início' },
      { tipo: 'adicionarPagina', nome: 'Painel' },
      { tipo: 'removerPagina', id: 'painel' },
    ]);
    expect(estado.selecao).toEqual({ pagina: 'inicio', no: null });
  });

  it('remover a única página deixa o Studio sem seleção, sem quebrar', () => {
    const estado = rodar([{ tipo: 'removerPagina', id: 'inicio' }], comPagina());
    expect(estado.documento.paginas).toEqual([]);
    expect(estado.selecao).toEqual({ pagina: null, no: null });
  });

  it('renomear e mudar rota entram na história com rótulos diferentes', () => {
    const renomeada = rodar([{ tipo: 'trocarCampoDaPagina', id: 'inicio', campo: 'nome', valor: 'Home' }], comPagina());
    expect(rotuloDeDesfazer(renomeada)).toBe(m.acoes.renomearPagina);
    const comRota = reducerStudio(renomeada, { tipo: 'trocarCampoDaPagina', id: 'inicio', campo: 'rota', valor: '/home' });
    expect(rotuloDeDesfazer(comRota)).toBe(m.acoes.trocarRota);
  });
});

describe('nós', () => {
  const montar = (extras = []) => rodar([
    { tipo: 'adicionarPagina', nome: 'Início' },
    { tipo: 'adicionarNo', item: 'secao' },
    { tipo: 'adicionarNo', item: 'titulo' },
    ...extras,
  ]);

  it('o nó recém-criado fica selecionado, e o próximo entra dentro do certo', () => {
    const estado = montar();
    expect(estado.selecao).toEqual({ pagina: 'inicio', no: 'titulo' });
    // O título é folha, então o texto entra como irmão dele, dentro da seção.
    const comTexto = reducerStudio(estado, { tipo: 'adicionarNo', item: 'texto' });
    expect(encontrarNo(comTexto.documento, 'texto').pai.id).toBe('secao');
  });

  it('inserção que o catálogo recusa não muda estado nenhum, nem cria entrada na história', () => {
    const estado = rodar([{ tipo: 'adicionarPagina', nome: 'Início' }]);
    const depois = reducerStudio(estado, { tipo: 'adicionarNo', item: 'titulo' });
    expect(depois).toBe(estado);
  });

  it('remover um nó sobe a seleção para o pai', () => {
    const estado = reducerStudio(montar(), { tipo: 'removerNo', id: 'titulo' });
    expect(estado.selecao).toEqual({ pagina: 'inicio', no: 'secao' });
    expect(rotuloDeDesfazer(estado)).toBe(m.acoes.remover('Título'));
  });

  it('remover uma região no topo leva a seleção para a página', () => {
    const estado = reducerStudio(montar(), { tipo: 'removerNo', id: 'secao' });
    expect(estado.selecao).toEqual({ pagina: 'inicio', no: null });
  });

  it('movimento que a regra recusa não gera entrada de história: desfazer que não desfaz é pior que botão nenhum', () => {
    const estado = montar();
    const antes = estado.passado.length;
    const depois = reducerStudio(estado, { tipo: 'moverNo', id: 'titulo', direcao: 'cima' });
    expect(depois).toBe(estado);
    expect(depois.passado).toHaveLength(antes);
  });

  it('trocar prop muda só a prop e nomeia a ação pelo rótulo do campo', () => {
    const estado = reducerStudio(montar(), { tipo: 'trocarProp', id: 'titulo', prop: 'texto', valor: 'Bem-vindo', rotulo: 'Texto' });
    expect(encontrarNo(estado.documento, 'titulo').no.props.texto).toBe('Bem-vindo');
    expect(rotuloDeDesfazer(estado)).toBe(m.acoes.editarProp('Texto'));
  });
});

describe('tokens passam pela mesma história, porque o documento é um só', () => {
  it('trocar token entra na pilha', () => {
    const estado = rodar([{ tipo: 'trocarToken', caminho: 'cor.fundo', valor: '#111111' }], comPagina());
    expect(estado.documento.tokens.cor.fundo).toBe('#111111');
    expect(rotuloDeDesfazer(estado)).toBe(m.acoes.editarToken(m.tokens.rotulos['cor.fundo']));
  });

  it('restaurar grupo e restaurar tudo também', () => {
    const estado = rodar([
      { tipo: 'trocarToken', caminho: 'cor.fundo', valor: '#111111' },
      { tipo: 'restaurarGrupo', grupo: 'cor' },
    ], comPagina());
    expect(estado.documento.tokens.cor.fundo).toBe(TOKENS_PADRAO.cor.fundo);
    expect(rotuloDeDesfazer(estado)).toBe(m.acoes.restaurarGrupo(m.tokens.grupos.cor.titulo));

    const tudo = reducerStudio(
      rodar([{ tipo: 'trocarToken', caminho: 'raio.md', valor: '99px' }], comPagina()),
      { tipo: 'restaurarTokens' },
    );
    expect(tudo.documento.tokens).toEqual(TOKENS_PADRAO);
    expect(rotuloDeDesfazer(tudo)).toBe(m.acoes.restaurarTokens);
  });
});

describe('desfazer e refazer', () => {
  it('desfazer volta o documento e refazer traz de volta', () => {
    const estado = rodar([{ tipo: 'adicionarPagina', nome: 'Início' }, { tipo: 'adicionarNo', item: 'secao' }]);
    const desfeito = reducerStudio(estado, { tipo: 'desfazer' });
    expect(desfeito.documento.paginas[0].regioes).toEqual([]);
    const refeito = reducerStudio(desfeito, { tipo: 'refazer' });
    expect(refeito.documento).toEqual(estado.documento);
  });

  it('desfazer e refazer com a pilha vazia devolvem o mesmo estado, sem inventar nada', () => {
    const estado = rodar([], comPagina());
    expect(reducerStudio(estado, { tipo: 'desfazer' })).toBe(estado);
    expect(reducerStudio(estado, { tipo: 'refazer' })).toBe(estado);
    expect(rotuloDeDesfazer(estado)).toBe(null);
    expect(rotuloDeRefazer(estado)).toBe(null);
  });

  it('digitar no mesmo campo é um desfazer, não vinte', () => {
    const digitar = (valor) => ({ tipo: 'trocarProp', id: 'titulo', prop: 'texto', valor, rotulo: 'Texto' });
    const estado = rodar([
      { tipo: 'adicionarPagina', nome: 'Início' },
      { tipo: 'adicionarNo', item: 'secao' },
      { tipo: 'adicionarNo', item: 'titulo' },
      digitar('B'), digitar('Be'), digitar('Bem'), digitar('Bem-vindo'),
    ]);
    const antes = estado.passado.length;
    const desfeito = reducerStudio(estado, { tipo: 'desfazer' });
    // Um desfazer devolve o campo ao valor de antes da primeira letra, e não a "Bem".
    expect(encontrarNo(desfeito.documento, 'titulo').no.props.texto).toBe('Título');
    expect(desfeito.passado).toHaveLength(antes - 1);
  });

  it('a coalescência é por campo: trocar de campo abre entrada nova', () => {
    const estado = rodar([
      { tipo: 'trocarToken', caminho: 'cor.fundo', valor: '#111111' },
      { tipo: 'trocarToken', caminho: 'cor.fundo', valor: '#222222' },
      { tipo: 'trocarToken', caminho: 'cor.acento', valor: '#333333' },
    ], comPagina());
    expect(estado.passado).toHaveLength(2);
  });

  it('edição nova joga fora o refazer, senão a história vira galho', () => {
    const estado = rodar([{ tipo: 'adicionarPagina', nome: 'Início' }, { tipo: 'adicionarNo', item: 'secao' }]);
    const desfeito = reducerStudio(estado, { tipo: 'desfazer' });
    expect(desfeito.futuro).toHaveLength(1);
    const novaEdicao = reducerStudio(desfeito, { tipo: 'adicionarNo', item: 'rodape' });
    expect(novaEdicao.futuro).toEqual([]);
  });

  it('depois de desfazer, a seleção que apontava para o que sumiu é corrigida sozinha', () => {
    const estado = rodar([
      { tipo: 'adicionarPagina', nome: 'Início' },
      { tipo: 'adicionarNo', item: 'secao' },
      { tipo: 'adicionarNo', item: 'titulo' },
    ]);
    expect(estado.selecao.no).toBe('titulo');
    const desfeito = reducerStudio(estado, { tipo: 'desfazer' });
    expect(desfeito.selecao).toEqual({ pagina: 'inicio', no: null });
  });

  it('o botão diz o que será desfeito, em vez de obrigar a pessoa a lembrar', () => {
    const estado = rodar([
      { tipo: 'adicionarPagina', nome: 'Início' },
      { tipo: 'adicionarNo', item: 'secao' },
    ]);
    expect(rotuloDeDesfazer(estado)).toBe(m.acoes.adicionar('Seção'));
    const desfeito = reducerStudio(estado, { tipo: 'desfazer' });
    expect(rotuloDeRefazer(desfeito)).toBe(m.acoes.adicionar('Seção'));
    expect(rotuloDeDesfazer(desfeito)).toBe(m.acoes.adicionarPagina);
  });

  it('descartar é uma edição como outra qualquer, e dá para desfazer', () => {
    const salvo = comPagina();
    const estado = rodar([{ tipo: 'adicionarPagina', nome: 'Painel' }], salvo);
    const descartado = reducerStudio(estado, { tipo: 'descartar', documento: salvo });
    expect(descartado.documento).toBe(salvo);
    expect(rotuloDeDesfazer(descartado)).toBe(m.acoes.descartar);
    expect(reducerStudio(descartado, { tipo: 'desfazer' }).documento).toEqual(estado.documento);
  });

  it('uma sequência longa termina em documento que o schema aceita, desfazendo e refazendo no meio', () => {
    let estado = rodar([
      { tipo: 'adicionarPagina', nome: 'Início' },
      { tipo: 'adicionarNo', item: 'secao' },
      { tipo: 'adicionarNo', item: 'cartao' },
      { tipo: 'adicionarNo', item: 'texto' },
      { tipo: 'trocarProp', id: 'texto', prop: 'conteudo', valor: 'Oi', rotulo: 'Conteúdo' },
      { tipo: 'desfazer' },
      { tipo: 'desfazer' },
      { tipo: 'refazer' },
      { tipo: 'adicionarPagina', nome: 'Painel' },
      { tipo: 'trocarToken', caminho: 'cor.acento', valor: '#00ff88' },
    ]);
    estado = reducerStudio(estado, { tipo: 'desfazer' });
    expect(() => documentoDesignSchema.parse(estado.documento)).not.toThrow();
    expect(estado.documento.tokens.cor.acento).toBe(TOKENS_PADRAO.cor.acento);
  });
});

describe('ação desconhecida', () => {
  it('não muda nada, em vez de estourar', () => {
    const estado = rodar([], comPagina());
    expect(reducerStudio(estado, { tipo: 'nao-existe' })).toBe(estado);
  });
});
