import { describe, it, expect } from 'vitest';
import { serializarEstavel, saoIguais, limparRespostas } from './comparar.js';

describe('serializarEstavel', () => {
  it('ignora ordem de chave mas respeita ordem de lista', () => {
    expect(serializarEstavel({ b: 1, a: 2 })).toBe(serializarEstavel({ a: 2, b: 1 }));
    expect(saoIguais({ x: [1, 2] }, { x: [2, 1] })).toBe(false);
    expect(saoIguais({ a: { b: [true, 'x'] } }, { a: { b: [true, 'x'] } })).toBe(true);
    expect(saoIguais({ a: 1 }, { a: '1' })).toBe(false);
    expect(saoIguais(undefined, null)).toBe(true);
  });
});

describe('limparRespostas', () => {
  it('descarta item de lista em branco, apara texto e mantém só as etapas do preset', () => {
    const respostas = {
      identidade: { nome: '  Alfa  ', essencia: '' },
      escopo: { personas: ['  dev  ', '   ', ''], publico: 'x' },
      dados: { entidades: [{ nome: 'pedido' }] },
    };
    expect(limparRespostas(respostas, ['identidade', 'escopo'])).toEqual({
      identidade: { nome: 'Alfa', essencia: '' },
      escopo: { personas: ['dev'], publico: 'x' },
    });
  });

  it('preserva booleano e etapa ausente não vira chave', () => {
    expect(limparRespostas({ seguranca: { tierGratuito: false, dadoPessoal: true } }, ['seguranca', 'fundacao']))
      .toEqual({ seguranca: { tierGratuito: false, dadoPessoal: true } });
  });
});
