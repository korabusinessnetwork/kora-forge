import { describe, it, expect } from 'vitest';
import { gerarSlug } from './slug.js';

describe('gerarSlug', () => {
  it.each([
    ['Meu App', 'meu-app'],
    ['  Café  da   Manhã ', 'cafe-da-manha'],
    ['GASTROMUNDI 2.0!', 'gastromundi-2-0'],
    ['--já--formatado--', 'ja-formatado'],
    ['ação & reação', 'acao-reacao'],
    ['🚀', ''],
    ['', ''],
    [null, ''],
  ])('%j vira %j', (entrada, esperado) => {
    expect(gerarSlug(entrada)).toBe(esperado);
  });

  it('corta em 60 caracteres sem deixar hífen no fim', () => {
    const slug = gerarSlug('a'.repeat(59) + ' b');
    expect(slug.length).toBeLessThanOrEqual(60);
    expect(slug.endsWith('-')).toBe(false);
  });
});
