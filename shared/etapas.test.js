import { describe, it, expect } from 'vitest';
import { etapaEstaCompleta, podePular, proximaEtapa, etapaAnterior, ehEtapaConhecida, CAMPOS_OBRIGATORIOS } from './etapas.js';

const etapasSite = ['identidade', 'escopo', 'design', 'seguranca', 'fundacao', 'materializar'];

describe('etapaEstaCompleta', () => {
  it('identidade exige essência, problema e valor', () => {
    expect(etapaEstaCompleta('identidade', {})).toBe(false);
    expect(etapaEstaCompleta('identidade', { identidade: { essencia: 'a', problema: 'b' } })).toBe(false);
    expect(etapaEstaCompleta('identidade', { identidade: { essencia: 'a', problema: 'b', valor: '  ' } })).toBe(false);
    expect(etapaEstaCompleta('identidade', { identidade: { essencia: 'a', problema: 'b', valor: 'c' } })).toBe(true);
  });

  it('escopo exige público e aha moment', () => {
    expect(etapaEstaCompleta('escopo', { escopo: { publico: 'devs' } })).toBe(false);
    expect(etapaEstaCompleta('escopo', { escopo: { publico: 'devs', ahaMoment: 'ver rodar' } })).toBe(true);
  });

  it('dados exige ao menos uma entidade com nome', () => {
    expect(etapaEstaCompleta('dados', { dados: { entidades: [] } })).toBe(false);
    expect(etapaEstaCompleta('dados', { dados: { entidades: [{ nome: '  ' }] } })).toBe(false);
    expect(etapaEstaCompleta('dados', { dados: { entidades: [{ nome: 'pedido' }] } })).toBe(true);
  });

  it('etapa sem campo obrigatório é sempre completa', () => {
    for (const etapa of ['arquitetura', 'design', 'apis', 'seguranca', 'fundacao', 'materializar']) {
      expect(CAMPOS_OBRIGATORIOS[etapa]).toEqual([]);
      expect(etapaEstaCompleta(etapa, {})).toBe(true);
    }
  });
});

describe('navegação', () => {
  it('anda na ordem do preset e devolve null nas pontas', () => {
    expect(proximaEtapa(etapasSite, 'identidade')).toBe('escopo');
    expect(proximaEtapa(etapasSite, 'design')).toBe('seguranca');
    expect(proximaEtapa(etapasSite, 'materializar')).toBeNull();
    expect(proximaEtapa(etapasSite, 'dados')).toBeNull();
    expect(etapaAnterior(etapasSite, 'escopo')).toBe('identidade');
    expect(etapaAnterior(etapasSite, 'identidade')).toBeNull();
    expect(etapaAnterior(etapasSite, 'dados')).toBeNull();
  });

  it('identidade e materializar não são puláveis', () => {
    expect(podePular('identidade')).toBe(false);
    expect(podePular('materializar')).toBe(false);
    for (const etapa of ['escopo', 'arquitetura', 'design', 'dados', 'apis', 'seguranca', 'fundacao']) {
      expect(podePular(etapa)).toBe(true);
    }
  });

  it('reconhece etapa do catálogo', () => {
    expect(ehEtapaConhecida('dados')).toBe(true);
    expect(ehEtapaConhecida('voar')).toBe(false);
  });
});
