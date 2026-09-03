import { describe, it, expect } from 'vitest';
import { formatarData } from './formatarData.js';

describe('formatarData', () => {
  it('formata ISO em pt-BR curto e devolve vazio para data inválida', () => {
    const texto = formatarData('2026-09-02T18:41:00.000Z');
    expect(texto).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    expect(formatarData('nada')).toBe('');
  });
});
