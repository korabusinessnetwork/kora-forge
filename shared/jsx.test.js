import { describe, it, expect } from 'vitest';
import { escaparValorJsx, escaparAtributoJsx, valorParaJsx } from './jsx.js';

describe('escapar valor de prop para JSX', () => {
  it('texto comum atravessa inteiro, com acento e pontuação', () => {
    expect(escaparValorJsx('Preço à vista, com condições')).toBe('Preço à vista, com condições');
    expect(escaparValorJsx('')).toBe('');
  });

  // O ataque que importa: fechar a tag do fragmento e abrir outra coisa.
  it('não dá para fechar a tag do fragmento nem abrir uma nova', () => {
    expect(escaparValorJsx('</h1><script>alert(1)</script>'))
      .toBe('&lt;/h1&gt;&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(escaparValorJsx('</h1><script>')).not.toContain('<');
    expect(escaparValorJsx('</h1><script>')).not.toContain('>');
  });

  // A chave é o que abre expressão em JSX, e é por onde entraria código de verdade.
  it('não dá para abrir expressão JSX com chave', () => {
    expect(escaparValorJsx('{process.env.SECRET}')).toBe('&#123;process.env.SECRET&#125;');
    expect(escaparValorJsx('{')).not.toContain('{');
    expect(escaparValorJsx('}')).not.toContain('}');
  });

  it('aspas não escapam do atributo', () => {
    expect(escaparAtributoJsx('foto" onError="roubar()')).toBe('foto&quot; onError=&quot;roubar()');
    expect(escaparAtributoJsx("ele disse 'oi'")).toBe('ele disse &#39;oi&#39;');
  });

  // Escapar o `&` primeiro, senão `&lt;` viraria `&amp;lt;` na segunda passada. O replace único
  // com tabela resolve isso por construção, e o teste é quem prova que continua resolvido.
  it('o e-comercial é escapado uma vez só, sem escapar o próprio escape', () => {
    expect(escaparValorJsx('Tom & Jerry')).toBe('Tom &amp; Jerry');
    expect(escaparValorJsx('&lt;')).toBe('&amp;lt;');
  });

  it('nenhum caractere perigoso sobra, qualquer que seja a mistura', () => {
    const saida = escaparValorJsx('<>&"\'{}');
    for (const caractere of ['<', '>', '"', "'", '{', '}']) {
      expect(saida.includes(caractere), caractere).toBe(false);
    }
  });
});

describe('valor de prop para JSX, por tipo', () => {
  it('booleano e número saem sem aspas e sem escape, porque o schema já garantiu o tipo', () => {
    expect(valorParaJsx(true)).toBe('true');
    expect(valorParaJsx(false)).toBe('false');
    expect(valorParaJsx(3)).toBe('3');
    expect(valorParaJsx(1.5)).toBe('1.5');
  });

  it('número não finito vira zero, para o arquivo gerado nunca sair com Infinity ou NaN', () => {
    expect(valorParaJsx(Number.POSITIVE_INFINITY)).toBe('0');
    expect(valorParaJsx(Number.NaN)).toBe('0');
  });

  it('texto passa pelo escape, mesmo vindo por este caminho', () => {
    expect(valorParaJsx('<b>')).toBe('&lt;b&gt;');
  });
});
