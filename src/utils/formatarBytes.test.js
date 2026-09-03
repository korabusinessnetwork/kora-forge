import { describe, it, expect } from 'vitest';
import { formatarBytes, pastaDe } from './formatarBytes.js';

describe('formatarBytes', () => {
  it.each([
    [0, '0 B'],
    [512, '512 B'],
    [1024, '1.0 kB'],
    [1536, '1.5 kB'],
    [1024 * 200, '200 kB'],
    [1024 * 1024, '1.0 MB'],
  ])('%i vira %s', (bytes, esperado) => {
    expect(formatarBytes(bytes)).toBe(esperado);
  });

  it('valor inválido devolve vazio, nunca NaN na tela', () => {
    expect(formatarBytes(-1)).toBe('');
    expect(formatarBytes('x')).toBe('');
    expect(formatarBytes(undefined)).toBe('');
  });
});

describe('pastaDe', () => {
  it('separa a pasta do arquivo, e a raiz vira ponto', () => {
    expect(pastaDe('docs/08_DECISOES/adr-001.md')).toBe('docs/08_DECISOES');
    expect(pastaDe('memory/bugs.md')).toBe('memory');
    expect(pastaDe('CLAUDE.md')).toBe('.');
  });
});
