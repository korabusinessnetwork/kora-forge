import { describe, it, expect } from 'vitest';
import { documentoDesignSchema, PROFUNDIDADE_MAXIMA } from '@shared/schemas/design.js';
import {
  adicionarNo,
  adicionarPagina,
  alturaDe,
  contarDescendentes,
  destinoDe,
  encontrarNo,
  encontrarPagina,
  idsDoDocumento,
  listarLinhas,
  moverNo,
  moverPagina,
  novaRota,
  novoId,
  ondePodeEntrar,
  podeMover,
  propsPadrao,
  removerNo,
  removerPagina,
  slugificar,
  trocarCampoDaPagina,
  trocarProp,
} from './documento.js';

// Catálogo de teste. Tem a mesma forma do real, mas é escrito aqui para que cada caso diga na
// cara o que está sendo exercitado: quem aceita quem é o assunto de metade destes testes.
const ITENS = [
  { id: 'cabecalho', papel: 'regiao', nome: 'Cabeçalho', props: [], aceita: ['titulo', 'botao'] },
  {
    id: 'secao',
    papel: 'regiao',
    nome: 'Seção',
    props: [{ id: 'espacamento', tipo: 'opcao', rotulo: 'Espaçamento', padrao: 'normal', opcoes: ['compacto', 'normal'] }],
    aceita: ['titulo', 'texto', 'cartao'],
  },
  { id: 'rodape', papel: 'regiao', nome: 'Rodapé', props: [], aceita: ['texto'] },
  {
    id: 'titulo',
    papel: 'componente',
    nome: 'Título',
    props: [
      { id: 'texto', tipo: 'texto', rotulo: 'Texto', padrao: 'Título da página', obrigatoria: true },
      { id: 'nivel', tipo: 'opcao', rotulo: 'Nível', padrao: '2', opcoes: ['1', '2', '3'] },
    ],
    aceita: [],
  },
  { id: 'texto', papel: 'componente', nome: 'Texto', props: [{ id: 'conteudo', tipo: 'texto', rotulo: 'Conteúdo', padrao: 'Um parágrafo.' }], aceita: [] },
  { id: 'botao', papel: 'componente', nome: 'Botão', props: [{ id: 'texto', tipo: 'texto', rotulo: 'Texto', padrao: 'Ação' }], aceita: [] },
  { id: 'cartao', papel: 'componente', nome: 'Cartão', props: [], aceita: ['titulo', 'texto'] },
];

const VAZIO = documentoDesignSchema.parse({});

const no = (id, tipo, filhos = [], props = {}) => ({ id, tipo, props, filhos });

function comPagina(regioes = []) {
  return { ...VAZIO, paginas: [{ id: 'inicio', nome: 'Início', rota: '/', regioes }] };
}

function congelar(valor) {
  if (valor && typeof valor === 'object') {
    Object.freeze(valor);
    for (const dentro of Object.values(valor)) congelar(dentro);
  }
  return valor;
}

const selecao = (pagina, alvo = null) => ({ pagina, no: alvo });

describe('slug, id e rota', () => {
  it('slugifica nome com acento, espaço e pontuação', () => {
    expect(slugificar('Página Inicial')).toBe('pagina-inicial');
    expect(slugificar('  Ação!  ')).toBe('acao');
    expect(slugificar('Configurações do Usuário')).toBe('configuracoes-do-usuario');
  });

  it('nome que não sobra nada usa a reserva, para nunca gerar id vazio', () => {
    expect(slugificar('!!!', 'pagina')).toBe('pagina');
    expect(slugificar('')).toBe('item');
  });

  it('id novo é único no documento inteiro, e página e nó dividem o mesmo espaço', () => {
    const documento = comPagina([no('titulo', 'titulo')]);
    // `documentoDesignSchema` junta id de página com id de nó e recusa repetido, então gerar id
    // olhando só para os nós deixaria passar colisão com o id de uma página.
    expect(idsDoDocumento(documento)).toEqual(new Set(['inicio', 'titulo']));
    expect(novoId(documento, 'titulo')).toBe('titulo-2');
    expect(novoId(documento, 'inicio')).toBe('inicio-2');
    expect(novoId(documento, 'texto')).toBe('texto');
  });

  it('o id gerado é determinístico: mesmo documento, mesmo tipo, mesmo id', () => {
    const documento = comPagina([no('titulo', 'titulo'), no('titulo-2', 'titulo')]);
    expect(novoId(documento, 'titulo')).toBe('titulo-3');
    expect(novoId(documento, 'titulo')).toBe('titulo-3');
  });

  it('a primeira página fica na raiz, e as outras derivam do nome, sem ninguém digitar caminho', () => {
    expect(novaRota(VAZIO, 'Início')).toBe('/');
    const comInicio = comPagina();
    expect(novaRota(comInicio, 'Painel do Cliente')).toBe('/painel-do-cliente');
  });

  it('rota repetida ganha sufixo em vez de perguntar', () => {
    const documento = { ...VAZIO, paginas: [
      { id: 'a', nome: 'A', rota: '/', regioes: [] },
      { id: 'b', nome: 'Painel', rota: '/painel', regioes: [] },
    ] };
    expect(novaRota(documento, 'Painel')).toBe('/painel-2');
  });
});

describe('navegação na árvore', () => {
  const documento = comPagina([no('secao', 'secao', [no('cartao', 'cartao', [no('titulo', 'titulo')])])]);

  it('encontra o nó com o contexto que toda edição precisa', () => {
    const achado = encontrarNo(documento, 'titulo');
    expect(achado.no.tipo).toBe('titulo');
    expect(achado.pai.id).toBe('cartao');
    expect(achado.indice).toBe(0);
    expect(achado.profundidade).toBe(3);
    expect(achado.pagina.id).toBe('inicio');
  });

  it('região no topo tem profundidade 1 e pai nulo, como o schema conta', () => {
    const achado = encontrarNo(documento, 'secao');
    expect(achado.profundidade).toBe(1);
    expect(achado.pai).toBe(null);
  });

  it('id que não existe devolve null em vez de estourar', () => {
    expect(encontrarNo(documento, 'nao-existe')).toBe(null);
    expect(encontrarPagina(documento, 'nao-existe')).toBe(null);
  });

  it('altura e descendentes contam a subárvore', () => {
    expect(alturaDe(documento.paginas[0].regioes[0])).toBe(3);
    expect(contarDescendentes(documento.paginas[0].regioes[0])).toBe(2);
    expect(alturaDe(no('x', 'texto'))).toBe(1);
  });
});

describe('o que o catálogo deixa entrar', () => {
  it('região só entra no topo da página, e componente nunca entra direto na página', () => {
    const documento = comPagina();
    const oferecidos = ondePodeEntrar(ITENS, documento, selecao('inicio')).map((item) => item.id);
    expect(oferecidos).toEqual(['cabecalho', 'secao', 'rodape']);
  });

  it('com uma região selecionada, a paleta oferece as regiões e o que aquela região aceita', () => {
    const documento = comPagina([no('secao', 'secao')]);
    const oferecidos = ondePodeEntrar(ITENS, documento, selecao('inicio', 'secao')).map((item) => item.id);
    expect(oferecidos).toEqual(['cabecalho', 'secao', 'rodape', 'titulo', 'texto', 'cartao']);
  });

  it('com uma folha selecionada, o que vale é o que o pai aceita, e o item entra como irmão', () => {
    const documento = comPagina([no('secao', 'secao', [no('titulo', 'titulo')])]);
    expect(destinoDe(ITENS, documento, selecao('inicio', 'titulo'), 'texto')).toEqual({ idPai: 'secao', indice: 1 });
    // O rodapé aceita texto, mas a seção não aceita botão, e o título também não: não cabe.
    expect(destinoDe(ITENS, documento, selecao('inicio', 'titulo'), 'botao')).toBe(null);
  });

  it('nó pendente não aceita nada, porque não dá para saber o que ele aceitava', () => {
    const documento = comPagina([no('antigo', 'carrossel')]);
    expect(destinoDe(ITENS, documento, selecao('inicio', 'antigo'), 'titulo')).toBe(null);
  });

  it('sem página selecionada nada entra, e a paleta fica vazia em vez de mentir', () => {
    expect(ondePodeEntrar(ITENS, VAZIO, selecao(null))).toEqual([]);
    expect(destinoDe(ITENS, VAZIO, selecao(null), 'secao')).toBe(null);
  });

  it('tipo que não existe no catálogo nunca tem destino', () => {
    expect(destinoDe(ITENS, comPagina(), selecao('inicio'), 'carrossel')).toBe(null);
  });

  it('a região nova entra logo depois da região que contém a seleção, que é onde a pessoa olha', () => {
    const documento = comPagina([no('cabecalho', 'cabecalho'), no('secao', 'secao', [no('titulo', 'titulo')]), no('rodape', 'rodape')]);
    expect(destinoDe(ITENS, documento, selecao('inicio', 'titulo'), 'secao')).toEqual({ idPai: null, indice: 2 });
  });

  it('o teto de profundidade fecha a porta antes de o documento ficar inválido', () => {
    // Cartão dentro de cartão até o teto: no último nível não cabe mais nada dentro.
    let fundo = no('c1', 'cartao');
    for (let nivel = 2; nivel < PROFUNDIDADE_MAXIMA; nivel += 1) fundo = no(`c${nivel}`, 'cartao', [fundo]);
    const documento = comPagina([no('secao', 'secao', [fundo])]);
    const maisFundo = encontrarNo(documento, 'c1');
    expect(maisFundo.profundidade).toBe(PROFUNDIDADE_MAXIMA);
    expect(destinoDe(ITENS, documento, selecao('inicio', 'c1'), 'titulo')).toEqual({ idPai: 'c2', indice: 1 });
  });
});

describe('props nascem com o padrão do catálogo', () => {
  it('propsPadrao preenche tudo o que o item declara', () => {
    expect(propsPadrao(ITENS.find((item) => item.id === 'titulo'))).toEqual({ texto: 'Título da página', nivel: '2' });
  });

  it('o nó nasce válido: inserir e salvar em seguida nunca é recusa por obrigatória ausente', () => {
    const { documento } = adicionarNo(ITENS, comPagina([no('secao', 'secao')]), selecao('inicio', 'secao'), 'titulo');
    const inserido = encontrarNo(documento, 'titulo').no;
    expect(inserido.props).toEqual({ texto: 'Título da página', nivel: '2' });
    expect(() => documentoDesignSchema.parse(documento)).not.toThrow();
  });
});

describe('edições não mutam o documento que receberam', () => {
  it('nenhuma função escreve no argumento', () => {
    const documento = congelar(comPagina([no('secao', 'secao', [no('titulo', 'titulo', [], { texto: 'Oi' })])]));
    const alvo = selecao('inicio', 'secao');
    expect(() => {
      adicionarPagina(documento, 'Outra');
      removerPagina(documento, 'inicio');
      moverPagina(documento, 'inicio', 'cima');
      trocarCampoDaPagina(documento, 'inicio', 'nome', 'Novo');
      adicionarNo(ITENS, documento, alvo, 'texto');
      removerNo(documento, 'titulo');
      moverNo(ITENS, documento, 'titulo', 'cima');
      trocarProp(documento, 'titulo', 'texto', 'Outro');
    }).not.toThrow();
    expect(encontrarNo(documento, 'titulo').no.props.texto).toBe('Oi');
  });
});

describe('páginas', () => {
  it('página nova nasce com id e rota derivados do nome', () => {
    const { documento, id } = adicionarPagina(VAZIO, 'Início');
    expect(id).toBe('inicio');
    expect(documento.paginas[0]).toEqual({ id: 'inicio', nome: 'Início', rota: '/', regioes: [] });
  });

  it('remover página tira só ela', () => {
    const documento = { ...VAZIO, paginas: [
      { id: 'a', nome: 'A', rota: '/', regioes: [] },
      { id: 'b', nome: 'B', rota: '/b', regioes: [] },
    ] };
    expect(removerPagina(documento, 'a').paginas.map((p) => p.id)).toEqual(['b']);
  });

  it('mover página reordena, e no limite devolve o documento intacto', () => {
    const documento = { ...VAZIO, paginas: [
      { id: 'a', nome: 'A', rota: '/', regioes: [] },
      { id: 'b', nome: 'B', rota: '/b', regioes: [] },
    ] };
    expect(moverPagina(documento, 'b', 'cima').paginas.map((p) => p.id)).toEqual(['b', 'a']);
    expect(moverPagina(documento, 'a', 'cima')).toBe(documento);
    expect(moverPagina(documento, 'b', 'baixo')).toBe(documento);
  });

  it('trocar nome e rota da página', () => {
    const documento = trocarCampoDaPagina(trocarCampoDaPagina(comPagina(), 'inicio', 'nome', 'Home'), 'inicio', 'rota', '/home');
    expect(documento.paginas[0]).toMatchObject({ nome: 'Home', rota: '/home' });
  });
});

describe('inserir, remover e trocar prop', () => {
  it('componente entra como último filho de quem o aceita', () => {
    const base = comPagina([no('secao', 'secao', [no('titulo', 'titulo')])]);
    const { documento } = adicionarNo(ITENS, base, selecao('inicio', 'secao'), 'texto');
    expect(documento.paginas[0].regioes[0].filhos.map((filho) => filho.id)).toEqual(['titulo', 'texto']);
  });

  it('inserção que o catálogo recusa não muda nada e não inventa id', () => {
    const base = comPagina([no('rodape', 'rodape')]);
    const resultado = adicionarNo(ITENS, base, selecao('inicio', 'rodape'), 'cartao');
    expect(resultado.id).toBe(null);
    expect(resultado.documento).toBe(base);
  });

  it('remover leva a subárvore junto, e só ela', () => {
    const base = comPagina([no('secao', 'secao', [no('cartao', 'cartao', [no('titulo', 'titulo')]), no('texto', 'texto')])]);
    const documento = removerNo(base, 'cartao');
    expect(documento.paginas[0].regioes[0].filhos.map((filho) => filho.id)).toEqual(['texto']);
    expect(encontrarNo(documento, 'titulo')).toBe(null);
  });

  it('trocar prop mexe só na prop pedida', () => {
    const base = comPagina([no('secao', 'secao', [no('titulo', 'titulo', [], { texto: 'A', nivel: '2' })])]);
    const documento = trocarProp(base, 'titulo', 'texto', 'B');
    expect(encontrarNo(documento, 'titulo').no.props).toEqual({ texto: 'B', nivel: '2' });
  });

  it('remover ou editar id que não existe devolve o documento intacto', () => {
    const base = comPagina();
    expect(removerNo(base, 'fantasma')).toBe(base);
    expect(trocarProp(base, 'fantasma', 'x', 1)).toBe(base);
  });
});

describe('mover nó', () => {
  const base = comPagina([
    no('secao', 'secao', [no('titulo', 'titulo'), no('cartao', 'cartao', [no('texto', 'texto')])]),
    no('rodape', 'rodape'),
  ]);

  it('sobe e desce entre irmãos', () => {
    const descido = moverNo(ITENS, base, 'titulo', 'baixo');
    expect(descido.paginas[0].regioes[0].filhos.map((f) => f.id)).toEqual(['cartao', 'titulo']);
    const subido = moverNo(ITENS, descido, 'titulo', 'cima');
    expect(subido.paginas[0].regioes[0].filhos.map((f) => f.id)).toEqual(['titulo', 'cartao']);
  });

  it('no limite da lista, o documento volta intacto em vez de erro', () => {
    expect(moverNo(ITENS, base, 'titulo', 'cima')).toBe(base);
    expect(moverNo(ITENS, base, 'rodape', 'baixo')).toBe(base);
    expect(podeMover(ITENS, base, 'titulo', 'cima')).toBe(false);
    expect(podeMover(ITENS, base, 'titulo', 'baixo')).toBe(true);
  });

  it('entrar vira último filho do irmão de cima, quando ele aceita', () => {
    const documento = moverNo(ITENS, moverNo(ITENS, base, 'titulo', 'baixo'), 'titulo', 'entrar');
    expect(encontrarNo(documento, 'titulo').pai.id).toBe('cartao');
    expect(encontrarNo(documento, 'cartao').no.filhos.map((f) => f.id)).toEqual(['texto', 'titulo']);
  });

  it('entrar em quem não aceita é recusado pela própria função', () => {
    // O botão não é aceito pela seção nem pelo cartão; nem entra na árvore, nem tem para onde ir.
    const comBotao = comPagina([no('cabecalho', 'cabecalho', [no('titulo', 'titulo'), no('botao', 'botao')])]);
    expect(moverNo(ITENS, comBotao, 'botao', 'entrar')).toBe(comBotao);
    expect(podeMover(ITENS, comBotao, 'botao', 'entrar')).toBe(false);
  });

  it('sair vira o irmão seguinte do pai, quando o avô aceita', () => {
    const documento = moverNo(ITENS, base, 'texto', 'sair');
    expect(encontrarNo(documento, 'texto').pai.id).toBe('secao');
    expect(documento.paginas[0].regioes[0].filhos.map((f) => f.id)).toEqual(['titulo', 'cartao', 'texto']);
  });

  it('componente não sai para o topo da página, porque lá só entra região', () => {
    expect(moverNo(ITENS, base, 'titulo', 'sair')).toBe(base);
    expect(podeMover(ITENS, base, 'titulo', 'sair')).toBe(false);
  });

  it('região no topo não tem para onde sair nem entrar', () => {
    expect(moverNo(ITENS, base, 'secao', 'sair')).toBe(base);
    expect(moverNo(ITENS, base, 'rodape', 'entrar')).toBe(base);
  });

  it('movimento que estouraria o teto de profundidade é recusado', () => {
    // Cartões encadeados até o teto; mover o de fora para dentro do irmão desceria tudo um nível.
    let dentro = no('folha', 'texto');
    for (let nivel = 1; nivel <= PROFUNDIDADE_MAXIMA - 2; nivel += 1) dentro = no(`c${nivel}`, 'cartao', [dentro]);
    const documento = comPagina([no('secao', 'secao', [no('irmao', 'cartao'), dentro])]);
    const alto = encontrarNo(documento, `c${PROFUNDIDADE_MAXIMA - 2}`);
    expect(alto.profundidade + alturaDe(alto.no)).toBeGreaterThan(PROFUNDIDADE_MAXIMA);
    expect(moverNo(ITENS, documento, alto.no.id, 'entrar')).toBe(documento);
  });

  it('id que não existe não move nada', () => {
    expect(moverNo(ITENS, base, 'fantasma', 'cima')).toBe(base);
  });
});

describe('a árvore como lista, que é o que as camadas desenham', () => {
  it('achata na ordem de leitura, com o nível de cada linha', () => {
    const documento = comPagina([no('secao', 'secao', [no('titulo', 'titulo', [], { texto: 'Bem-vindo' })])]);
    expect(listarLinhas(documento, ITENS)).toEqual([
      { chave: 'inicio', escopo: 'pagina', id: 'inicio', pagina: 'inicio', nivel: 1, nome: 'Início', resumo: '/', pendente: false, dentro: 2 },
      { chave: 'secao', escopo: 'no', id: 'secao', pagina: 'inicio', nivel: 2, nome: 'Seção', resumo: null, pendente: false, dentro: 1 },
      { chave: 'titulo', escopo: 'no', id: 'titulo', pagina: 'inicio', nivel: 3, nome: 'Título', resumo: 'Bem-vindo', pendente: false, dentro: 0 },
    ]);
  });

  it('nó de tipo que saiu do catálogo aparece nomeado pelo tipo cru e marcado, nunca some', () => {
    const documento = comPagina([no('antigo', 'carrossel')]);
    const linha = listarLinhas(documento, ITENS)[1];
    expect(linha).toMatchObject({ id: 'antigo', nome: 'carrossel', pendente: true });
  });

  it('o resumo é o valor da primeira prop de texto, cortado quando é longo', () => {
    const longo = 'a'.repeat(60);
    const documento = comPagina([no('secao', 'secao', [no('texto', 'texto', [], { conteudo: longo })])]);
    expect(listarLinhas(documento, ITENS)[2].resumo).toBe(`${'a'.repeat(40)}…`);
  });

  it('documento sem página nenhuma vira lista vazia', () => {
    expect(listarLinhas(VAZIO, ITENS)).toEqual([]);
  });
});

describe('o documento continua válido depois de qualquer sequência de edições', () => {
  it('montar uma página inteira pela API pública dá documento que o schema aceita', () => {
    let documento = VAZIO;
    ({ documento } = adicionarPagina(documento, 'Início'));
    ({ documento } = adicionarPagina(documento, 'Painel'));
    ({ documento } = adicionarNo(ITENS, documento, selecao('inicio'), 'cabecalho'));
    ({ documento } = adicionarNo(ITENS, documento, selecao('inicio', 'cabecalho'), 'titulo'));
    ({ documento } = adicionarNo(ITENS, documento, selecao('inicio'), 'secao'));
    ({ documento } = adicionarNo(ITENS, documento, selecao('inicio', 'secao'), 'cartao'));
    ({ documento } = adicionarNo(ITENS, documento, selecao('inicio', 'cartao'), 'texto'));
    documento = trocarProp(documento, 'texto', 'conteudo', 'Um parágrafo de verdade.');
    documento = moverNo(ITENS, documento, 'secao', 'cima');
    documento = moverNo(ITENS, documento, 'texto', 'sair');
    documento = removerNo(documento, 'cabecalho');
    documento = trocarCampoDaPagina(documento, 'painel', 'rota', '/painel-do-cliente');

    expect(() => documentoDesignSchema.parse(documento)).not.toThrow();
    expect(documento.paginas.map((pagina) => pagina.rota)).toEqual(['/', '/painel-do-cliente']);
    expect(listarLinhas(documento, ITENS).some((linha) => linha.pendente)).toBe(false);
  });
});
