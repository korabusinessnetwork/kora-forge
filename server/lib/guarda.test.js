import { describe, it, expect } from 'vitest';
import { avaliarRequisicao, criarAllowlists, tokensIguais } from './guarda.js';

const listas = { tokenSessao: 'segredo-de-teste', ...criarAllowlists({ porta: 7337, portaDev: 5173 }) };
const valida = { metodo: 'GET', host: '127.0.0.1:7337', origin: 'http://127.0.0.1:5173', token: 'segredo-de-teste' };
const avaliar = (parcial) => avaliarRequisicao({ ...valida, ...parcial }, listas);

describe('avaliarRequisicao', () => {
  it('aceita a requisição de referência', () => {
    expect(avaliar({})).toBe(true);
  });

  it('recusa sem token, com token errado e com token de outro tamanho', () => {
    expect(avaliar({ token: undefined })).toBe(false);
    expect(avaliar({ token: 'segredo-de-testE' })).toBe(false);
    expect(avaliar({ token: 'curto' })).toBe(false);
    expect(avaliar({ token: ['segredo-de-teste'] })).toBe(false);
  });

  it('recusa Origin fora da allowlist, inclusive "null"', () => {
    expect(avaliar({ origin: 'http://evil.example' })).toBe(false);
    expect(avaliar({ origin: 'null' })).toBe(false);
    expect(avaliar({ origin: 'http://127.0.0.1:9999' })).toBe(false);
  });

  it('aceita as origens locais das duas portas', () => {
    for (const origin of ['http://127.0.0.1:7337', 'http://localhost:7337', 'http://127.0.0.1:5173', 'http://localhost:5173']) {
      expect(avaliar({ origin })).toBe(true);
    }
  });

  it('exige Origin em método mutante e dispensa em GET', () => {
    expect(avaliar({ metodo: 'GET', origin: undefined })).toBe(true);
    for (const metodo of ['POST', 'PATCH', 'PUT', 'DELETE']) {
      expect(avaliar({ metodo, origin: undefined })).toBe(false);
      expect(avaliar({ metodo })).toBe(true);
    }
  });

  it('recusa Host fora da lista, inclusive IPv6 e outra porta', () => {
    expect(avaliar({ host: 'evil.example' })).toBe(false);
    expect(avaliar({ host: '[::1]:7337' })).toBe(false);
    expect(avaliar({ host: '127.0.0.1:5173' })).toBe(false);
    expect(avaliar({ host: undefined })).toBe(false);
    expect(avaliar({ host: 'LOCALHOST:7337' })).toBe(true);
  });
});

describe('tokensIguais', () => {
  it('compara strings de mesmo tamanho e recusa qualquer outra coisa', () => {
    expect(tokensIguais('abc', 'abc')).toBe(true);
    expect(tokensIguais('abc', 'abd')).toBe(false);
    expect(tokensIguais('abc', 'abcd')).toBe(false);
    expect(tokensIguais(undefined, 'abc')).toBe(false);
    expect(tokensIguais('abc', undefined)).toBe(false);
  });
});
