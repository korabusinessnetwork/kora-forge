import { describe, it, expect } from 'vitest';
import {
  itemCatalogoSchema, propCatalogoSchema, catalogoSchema, chaveDaProp, CHAVE_FILHOS,
  CATALOGO_VERSAO, conferirDocumento, listarPendencias, PAPEIS, TIPOS_DE_PROP,
} from './catalogo.js';
import { CATALOGO_VERSAO_ATUAL } from './design.js';

const prop = (extra = {}) => ({ id: 'texto', tipo: 'texto', rotulo: 'Texto', microtexto: 'o que aparece', padrao: 'Oi', ...extra });
const item = (extra = {}) => ({
  id: 'botao', versao: 1, papel: 'componente', nome: 'Botão',
  descricao: 'a ação da região', microtexto: 'vira um button',
  props: [prop()], aceita: [], ...extra,
});

describe('contrato do item de catálogo', () => {
  it('aceita um item completo e preenche os defaults do contrato', () => {
    const analisado = itemCatalogoSchema.parse({ ...item(), props: [prop()] });
    expect(analisado.props[0].obrigatoria).toBe(false);
    expect(analisado.aceita).toEqual([]);
  });

  it('é estrito: campo a mais é recusa, não silêncio', () => {
    const r = itemCatalogoSchema.safeParse({ ...item(), cor: '#ff0000' });
    expect(r.success).toBe(false);
  });

  it('papel só pode ser região ou componente, e isso é o que separa topo de dentro', () => {
    expect(PAPEIS).toEqual(['regiao', 'componente']);
    expect(itemCatalogoSchema.safeParse({ ...item(), papel: 'widget' }).success).toBe(false);
  });

  it('nome, descrição e microtexto são obrigatórios: item sem microtexto vira nome solto na paleta', () => {
    for (const campo of ['nome', 'descricao', 'microtexto']) {
      const bruto = { ...item() };
      delete bruto[campo];
      expect(itemCatalogoSchema.safeParse(bruto).success, campo).toBe(false);
    }
  });

  it('prop repetida é recusada, com o nome da prop', () => {
    const r = itemCatalogoSchema.safeParse({ ...item(), props: [prop(), prop()] });
    expect(r.success).toBe(false);
    expect(r.error.issues[0].message).toContain('texto');
  });

  it('prop não pode colidir com a chave reservada dos filhos', () => {
    const r = itemCatalogoSchema.safeParse({ ...item(), props: [prop({ id: 'filhos' })] });
    expect(r.success).toBe(false);
    expect(r.error.issues[0].message).toContain(CHAVE_FILHOS);
  });

  it('aceitar a si mesmo é recusado: seria aninhamento infinito por contrato', () => {
    const r = itemCatalogoSchema.safeParse({ ...item(), id: 'cartao', aceita: ['cartao'] });
    expect(r.success).toBe(false);
  });
});

describe('contrato da prop', () => {
  it('todo tipo declarado tem uma validação de padrão correspondente', () => {
    expect(TIPOS_DE_PROP).toEqual(['texto', 'numero', 'booleano', 'opcao']);
  });

  it('o padrão tem que ser do tipo declarado, senão a paleta abriria com valor inválido', () => {
    expect(propCatalogoSchema.safeParse(prop({ tipo: 'numero', padrao: 'dois' })).success).toBe(false);
    expect(propCatalogoSchema.safeParse(prop({ tipo: 'booleano', padrao: 'sim' })).success).toBe(false);
    expect(propCatalogoSchema.safeParse(prop({ tipo: 'numero', padrao: 2 })).success).toBe(true);
  });

  it('prop de opção declara as opções, e o padrão está entre elas', () => {
    expect(propCatalogoSchema.safeParse(prop({ tipo: 'opcao', padrao: 'a' })).success).toBe(false);
    const fora = propCatalogoSchema.safeParse(prop({ tipo: 'opcao', padrao: 'c', opcoes: ['a', 'b'] }));
    expect(fora.success).toBe(false);
    expect(fora.error.issues[0].message).toContain('não está entre as opções');
    expect(propCatalogoSchema.safeParse(prop({ tipo: 'opcao', padrao: 'a', opcoes: ['a', 'b'] })).success).toBe(true);
  });

  it('opções só valem para prop de opção', () => {
    const r = propCatalogoSchema.safeParse(prop({ tipo: 'texto', opcoes: ['a', 'b'] }));
    expect(r.success).toBe(false);
  });

  it('toda prop tem padrão: pergunta sem default é carga mental que o sistema já podia tirar', () => {
    const bruto = prop();
    delete bruto.padrao;
    expect(propCatalogoSchema.safeParse(bruto).success).toBe(false);
  });
});

describe('a chave do fragmento sai do id da prop, sem segunda tabela', () => {
  it('slug vira maiúscula com underscore', () => {
    expect(chaveDaProp('texto')).toBe('TEXTO');
    expect(chaveDaProp('texto-alternativo')).toBe('TEXTO_ALTERNATIVO');
  });
});

describe('versão do catálogo', () => {
  it('é a mesma que o documento de design grava, e as duas não podem divergir', () => {
    expect(CATALOGO_VERSAO).toBe(CATALOGO_VERSAO_ATUAL);
  });

  it('o catálogo servido tem versão e itens, e é estrito', () => {
    expect(catalogoSchema.safeParse({ versao: 1, itens: [item()] }).success).toBe(true);
    expect(catalogoSchema.safeParse({ versao: 1, itens: [item()], extra: 1 }).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------

const CATALOGO = [
  { id: 'secao', versao: 1, papel: 'regiao', nome: 'Seção', descricao: 'd', microtexto: 'm', props: [{ id: 'espacamento', tipo: 'opcao', rotulo: 'Espaçamento', microtexto: 'm', padrao: 'normal', opcoes: ['compacto', 'normal'], obrigatoria: false }], aceita: ['titulo', 'cartao'] },
  { id: 'titulo', versao: 1, papel: 'componente', nome: 'Título', descricao: 'd', microtexto: 'm', props: [{ id: 'texto', tipo: 'texto', rotulo: 'Texto', microtexto: 'm', padrao: 'T', obrigatoria: true }, { id: 'nivel', tipo: 'numero', rotulo: 'Nível', microtexto: 'm', padrao: 2, obrigatoria: false }], aceita: [] },
  { id: 'cartao', versao: 1, papel: 'componente', nome: 'Cartão', descricao: 'd', microtexto: 'm', props: [], aceita: ['titulo'] },
];

const doc = (regioes) => ({ catalogo: { versao: 1 }, paginas: [{ id: 'inicio', nome: 'Início', rota: '/', regioes }] });
const no = (tipo, extra = {}) => ({ id: `n-${tipo}`, tipo, props: {}, filhos: [], ...extra });

describe('documento conferido contra o catálogo', () => {
  it('documento sem página nenhuma é válido: é o que o painel de tokens salva', () => {
    expect(conferirDocumento({ catalogo: { versao: 1 }, paginas: [] }, CATALOGO)).toEqual([]);
    expect(conferirDocumento({}, CATALOGO)).toEqual([]);
  });

  it('desenho válido passa inteiro, com aninhamento e props', () => {
    const documento = doc([no('secao', {
      props: { espacamento: 'compacto' },
      filhos: [no('cartao', { filhos: [no('titulo', { props: { texto: 'Oi', nivel: 1 } })] })],
    })]);
    expect(conferirDocumento(documento, CATALOGO)).toEqual([]);
  });

  it('tipo que não existe é recusado, com o caminho do nó e o nome do tipo', () => {
    const [issue, ...resto] = conferirDocumento(doc([no('carrossel')]), CATALOGO);
    expect(resto).toEqual([]);
    expect(issue.caminho).toBe('paginas.0.regioes.0.tipo');
    expect(issue.mensagem).toContain('carrossel');
  });

  it('componente no topo da página é recusado, e região dentro da árvore também', () => {
    const noTopo = conferirDocumento(doc([no('titulo', { props: { texto: 'x' } })]), CATALOGO);
    expect(noTopo[0].mensagem).toContain('só entra dentro de uma região');

    const laDentro = conferirDocumento(doc([no('secao', { filhos: [no('secao')] })]), CATALOGO);
    expect(laDentro[0].caminho).toBe('paginas.0.regioes.0.filhos.0.tipo');
    expect(laDentro[0].mensagem).toContain('só entra no topo da página');
  });

  it('pai que não aceita aquele filho é recusado, dizendo o que ele aceita', () => {
    const issues = conferirDocumento(doc([no('secao', { filhos: [no('cartao', { filhos: [no('cartao')] })] })]), CATALOGO);
    expect(issues[0].caminho).toBe('paginas.0.regioes.0.filhos.0.filhos.0.tipo');
    expect(issues[0].mensagem).toContain('não aceita');
    expect(issues[0].mensagem).toContain('titulo');
  });

  it('prop não declarada é recusada com o nome da prop', () => {
    const issues = conferirDocumento(doc([no('secao', { props: { cor: 'azul' } })]), CATALOGO);
    expect(issues[0].caminho).toBe('paginas.0.regioes.0.props.cor');
    expect(issues[0].mensagem).toContain('cor');
  });

  it('valor fora do tipo declarado é recusado, dizendo o tipo esperado', () => {
    const issues = conferirDocumento(doc([no('secao', { filhos: [no('titulo', { props: { texto: 'x', nivel: 'dois' } })] })]), CATALOGO);
    expect(issues[0].caminho).toBe('paginas.0.regioes.0.filhos.0.props.nivel');
    expect(issues[0].mensagem).toContain('numero');
  });

  it('valor fora das opções é recusado, listando as opções', () => {
    const issues = conferirDocumento(doc([no('secao', { props: { espacamento: 'gigante' } })]), CATALOGO);
    expect(issues[0].mensagem).toContain('compacto, normal');
  });

  it('prop obrigatória ausente é recusada, e prop opcional ausente não', () => {
    const faltando = conferirDocumento(doc([no('secao', { filhos: [no('titulo')] })]), CATALOGO);
    expect(faltando).toHaveLength(1);
    expect(faltando[0].caminho).toBe('paginas.0.regioes.0.filhos.0.props.texto');

    const so = conferirDocumento(doc([no('secao', { filhos: [no('titulo', { props: { texto: 'x' } })] })]), CATALOGO);
    expect(so).toEqual([]);
  });

  it('cada nó com problema vira uma issue, e uma não esconde a outra', () => {
    const issues = conferirDocumento(doc([no('secao', { props: { cor: 'azul' }, filhos: [no('titulo')] })]), CATALOGO);
    expect(issues.map((i) => i.caminho)).toEqual([
      'paginas.0.regioes.0.props.cor',
      'paginas.0.regioes.0.filhos.0.props.texto',
    ]);
  });
});

describe('pendência de item que saiu do catálogo', () => {
  it('sem pendência a lista é vazia, nunca null', () => {
    const documento = doc([no('secao', { filhos: [no('titulo', { props: { texto: 'x' } })] })]);
    expect(listarPendencias(documento, CATALOGO)).toEqual([]);
  });

  it('item ausente vira pendência nomeada, com o nó, a página e as duas versões', () => {
    const documento = doc([no('secao', { filhos: [no('carrossel', { id: 'c1' })] })]);
    const pendencias = listarPendencias(documento, CATALOGO, 2);
    expect(pendencias).toEqual([{ no: 'c1', tipo: 'carrossel', pagina: 'inicio', catalogoDoDocumento: 1, catalogoDoForge: 2 }]);
  });

  it('a árvore inteira é varrida, em qualquer profundidade', () => {
    const documento = doc([no('secao', { filhos: [no('cartao', { filhos: [no('mapa', { id: 'm1' })] })] })]);
    expect(listarPendencias(documento, CATALOGO).map((p) => p.tipo)).toEqual(['mapa']);
  });
});
