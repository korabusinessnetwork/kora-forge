import { describe, it, expect } from 'vitest';
import { lerCampo, avaliarCondicao, avaliar, ordenarRegras } from './avaliador.js';

const contexto = {
  arquitetura: { stack: ['react', 'supabase'], multiTenant: false, deploy: 'vercel' },
  seguranca: { tierGratuito: true, compliance: [] },
  numero: 7,
  texto: 'aplicação web',
  nulo: null,
  vazios: { texto: '', lista: [], objeto: {} },
};

describe('lerCampo', () => {
  it('lê caminho aninhado, índice de lista e devolve undefined para o que não existe', () => {
    expect(lerCampo(contexto, 'arquitetura.deploy')).toBe('vercel');
    expect(lerCampo(contexto, 'arquitetura.stack.1')).toBe('supabase');
    expect(lerCampo(contexto, 'arquitetura.naoExiste')).toBeUndefined();
    expect(lerCampo(contexto, 'nulo.qualquer')).toBeUndefined();
    expect(lerCampo(contexto, 'arquitetura.stack.x')).toBeUndefined();
    expect(lerCampo(contexto, '')).toBeUndefined();
    expect(lerCampo(contexto, null)).toBeUndefined();
  });

  it('não atravessa o protótipo', () => {
    expect(lerCampo(contexto, '__proto__')).toBeUndefined();
    expect(lerCampo(contexto, 'arquitetura.constructor')).toBeUndefined();
    expect(lerCampo(contexto, 'arquitetura.__proto__.polluido')).toBeUndefined();
    expect(lerCampo(contexto, 'texto.prototype')).toBeUndefined();
    expect(lerCampo(contexto, 'texto.length')).toBeUndefined();
  });
});

describe('operadores de folha', () => {
  const avalia = (operador, campo, valor) => avaliarCondicao({ campo, operador, valor }, contexto);

  it('igual e diferente comparam por valor', () => {
    expect(avalia('igual', 'arquitetura.multiTenant', false)).toBe(true);
    expect(avalia('igual', 'arquitetura.multiTenant', true)).toBe(false);
    expect(avalia('diferente', 'arquitetura.deploy', 'nenhum')).toBe(true);
  });

  it('contem e nao_contem valem para lista e texto', () => {
    expect(avalia('contem', 'arquitetura.stack', 'supabase')).toBe(true);
    expect(avalia('contem', 'arquitetura.stack', 'fastify')).toBe(false);
    expect(avalia('contem', 'texto', 'web')).toBe(true);
    expect(avalia('nao_contem', 'arquitetura.stack', 'fastify')).toBe(true);
    expect(avalia('contem', 'numero', 7)).toBe(false);
  });

  it('maior_que e menor_que só comparam número, sem coerção', () => {
    expect(avalia('maior_que', 'numero', 5)).toBe(true);
    expect(avalia('menor_que', 'numero', 5)).toBe(false);
    expect(avalia('maior_que', 'texto', 5)).toBe(false);
    expect(avalia('maior_que', 'numero', '5')).toBe(false);
    expect(avalia('menor_que', 'naoExiste', 5)).toBe(false);
  });

  it('existe e vazio tratam ausência, nulo e coleção vazia', () => {
    expect(avalia('existe', 'numero')).toBe(true);
    expect(avalia('existe', 'nulo')).toBe(false);
    expect(avalia('existe', 'naoExiste')).toBe(false);
    expect(avalia('vazio', 'vazios.texto')).toBe(true);
    expect(avalia('vazio', 'vazios.lista')).toBe(true);
    expect(avalia('vazio', 'vazios.objeto')).toBe(true);
    expect(avalia('vazio', 'nulo')).toBe(true);
    expect(avalia('vazio', 'naoExiste')).toBe(true);
    expect(avalia('vazio', 'texto')).toBe(false);
  });

  it('operador desconhecido e condição inválida devolvem falso, nunca lançam', () => {
    expect(avaliarCondicao({ campo: 'numero', operador: 'explode', valor: 1 }, contexto)).toBe(false);
    expect(avaliarCondicao(null, contexto)).toBe(false);
    expect(avaliarCondicao('nao é objeto', contexto)).toBe(false);
  });
});

describe('e, ou e aninhamento', () => {
  it('e exige todas, ou exige uma, em qualquer profundidade', () => {
    const todas = { operador: 'e', condicoes: [{ campo: 'numero', operador: 'igual', valor: 7 }, { campo: 'arquitetura.stack', operador: 'contem', valor: 'react' }] };
    expect(avaliarCondicao(todas, contexto)).toBe(true);
    expect(avaliarCondicao({ operador: 'e', condicoes: [todas, { campo: 'nulo', operador: 'existe' }] }, contexto)).toBe(false);
    expect(avaliarCondicao({ operador: 'ou', condicoes: [{ campo: 'nulo', operador: 'existe' }, todas] }, contexto)).toBe(true);
    expect(avaliarCondicao({ operador: 'ou', condicoes: [{ campo: 'nulo', operador: 'existe' }, { campo: 'naoExiste', operador: 'existe' }] }, contexto)).toBe(false);
  });
});

describe('avaliar', () => {
  const regras = [
    { id: 'z-info', severidade: 'info', quando: { campo: 'numero', operador: 'existe' } },
    { id: 'a-bloqueio', severidade: 'bloqueio', quando: { campo: 'numero', operador: 'existe' } },
    { id: 'b-aviso', severidade: 'aviso', quando: { campo: 'numero', operador: 'existe' } },
    { id: 'a-aviso', severidade: 'aviso', quando: { campo: 'numero', operador: 'existe' } },
    { id: 'nao-dispara', severidade: 'bloqueio', quando: { campo: 'nulo', operador: 'existe' } },
  ];

  it('devolve só o que dispara, em ordem estável de severidade e id', () => {
    const hits = avaliar(regras, contexto);
    expect(hits.map((h) => h.id)).toEqual(['a-bloqueio', 'a-aviso', 'b-aviso', 'z-info']);
  });

  it('é determinístico: mesma entrada, mesma saída', () => {
    expect(avaliar(regras, contexto).map((h) => h.id)).toEqual(avaliar(regras, contexto).map((h) => h.id));
    expect(ordenarRegras(regras).map((r) => r.id)).toEqual(ordenarRegras([...regras].reverse()).map((r) => r.id));
  });
});
