import { describe, it, expect } from 'vitest';
import { renderizar, chavesUsadas, ErroTemplate } from './template.js';

describe('renderizar', () => {
  it('troca a chave pelo valor, quantas vezes aparecer', () => {
    expect(renderizar('# {{P}}\n{{P}} faz {{V}}', { P: 'Alfa', V: 'coisas' })).toBe('# Alfa\nAlfa faz coisas');
    expect(renderizar('sem chave', {})).toBe('sem chave');
  });

  it('chave sem valor lança FORGE_TEMPLATE_INCOMPLETO citando a chave e o arquivo', () => {
    let erro;
    try { renderizar('{{A}} {{FALTANDO}}', { A: '1' }, 'fundacao-kora/CLAUDE.md'); } catch (e) { erro = e; }
    expect(erro).toBeInstanceOf(ErroTemplate);
    expect(erro.codigo).toBe('FORGE_TEMPLATE_INCOMPLETO');
    expect(erro.message).toContain('FALTANDO');
    expect(erro.message).toContain('fundacao-kora/CLAUDE.md');
    expect(erro.detalhe.issues[0].caminho).toBe('fundacao-kora/CLAUDE.md');
  });

  it('valor vazio, zero e false são valores, não ausência', () => {
    expect(renderizar('[{{A}}][{{B}}][{{C}}]', { A: '', B: 0, C: false })).toBe('[][0][false]');
  });

  it('não trata como placeholder o que não é MAIÚSCULA entre chaves duplas', () => {
    const texto = '{{ espaco }} {{minuscula}} {{Misto}} {{ABERTO {{123}} ${js} {umachave}';
    expect(renderizar(texto, {})).toBe(texto);
  });

  it('não avalia expressão: o que está dentro da chave é nome, não código', () => {
    expect(renderizar('{{A}}', { A: '{{B}}' })).toBe('{{B}}');
    expect(() => renderizar('{{A_B}}', { A_B: 'ok' })).not.toThrow();
  });
});

describe('chavesUsadas', () => {
  it('lista as chaves, sem repetir, em ordem', () => {
    expect(chavesUsadas('{{B}} {{A}} {{B}} texto {{C_D}}')).toEqual(['A', 'B', 'C_D']);
    expect(chavesUsadas('nada aqui')).toEqual([]);
  });
});
