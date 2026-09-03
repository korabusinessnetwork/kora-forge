import { describe, it, expect } from 'vitest';
import { compararTexto, porCampo } from './ordenar.js';

describe('compararTexto', () => {
  it('ordena por código de caractere, sem depender de locale', () => {
    expect(['package.json', 'README.md', 'CLAUDE.md'].sort(compararTexto)).toEqual(['CLAUDE.md', 'README.md', 'package.json']);
    expect(['a', 'A'].sort(compararTexto)).toEqual(['A', 'a']);
    expect(compararTexto('igual', 'igual')).toBe(0);
  });

  it('bate com o sort padrão de string, que também é por código', () => {
    const itens = ['docs/00', 'CLAUDE.md', 'src/App.jsx', 'README.md', '.gitignore', 'memory/bugs.md'];
    expect([...itens].sort(compararTexto)).toEqual([...itens].sort());
  });

  it('porCampo ordena objetos por um campo de texto', () => {
    expect([{ id: 'b' }, { id: 'a' }].sort(porCampo('id')).map((o) => o.id)).toEqual(['a', 'b']);
  });
});
