import { describe, it, expect } from 'vitest';
import { formatarUsd, formatarPercentual, formatarMs, preencher } from './formatar.js';

// Intl separa moeda e número com espaço não quebrável; o teste compara em espaço comum.
const comum = (texto) => texto.replace(/\u00a0/g, ' ');

describe('formatar', () => {
  it('dólar com quatro casas abaixo de um e duas acima', () => {
    expect(comum(formatarUsd(0.0074))).toBe('US$ 0,0074');
    expect(comum(formatarUsd(0))).toBe('US$ 0,00');
    expect(comum(formatarUsd(12.5))).toBe('US$ 12,50');
    expect(formatarUsd(null)).toBeNull();
  });

  it('percentual a partir de fração ou de percentual pronto', () => {
    expect(formatarPercentual(0.8333)).toBe('83,3%');
    expect(formatarPercentual(3.4, { jaEmPercentual: true })).toBe('3,4%');
    expect(formatarPercentual(undefined)).toBeNull();
  });

  it('milissegundos viram segundos a partir de 1000', () => {
    expect(formatarMs(850)).toBe('850 ms');
    expect(formatarMs(1333.33)).toBe('1,3 s');
  });

  it('preencher substitui chaves e ignora as ausentes', () => {
    expect(preencher('v{versao} em {data}', { versao: 1, data: '2026-09-03' })).toBe('v1 em 2026-09-03');
    expect(preencher('{nada}', {})).toBe('');
  });
});
