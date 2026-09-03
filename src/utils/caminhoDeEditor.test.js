import { describe, it, expect } from 'vitest';
import { caminhoDeEditor } from './caminhoDeEditor.js';

describe('caminhoDeEditor', () => {
  it('monta o link a partir de um caminho do Windows, preservando a letra de unidade', () => {
    expect(caminhoDeEditor('D:\\dev\\kora\\meu-app')).toBe('vscode://file/D:/dev/kora/meu-app');
  });

  it('monta o link a partir de um caminho POSIX', () => {
    expect(caminhoDeEditor('/home/mat/dev/kora/meu-app')).toBe('vscode://file/home/mat/dev/kora/meu-app');
  });

  // Risco R-01: espaço e acento no caminho são o caso comum no Windows, não o excepcional.
  it('codifica espaço e acento sem quebrar a estrutura do caminho', () => {
    expect(caminhoDeEditor('C:\\Users\\Meu Usuário\\dev\\app')).toBe('vscode://file/C:/Users/Meu%20Usu%C3%A1rio/dev/app');
  });

  it('codifica caractere que teria significado na URL', () => {
    expect(caminhoDeEditor('/dev/a#b/c?d')).toBe('vscode://file/dev/a%23b/c%3Fd');
  });

  it('devolve null para caminho vazio, ausente ou que não é texto', () => {
    for (const entrada of ['', '   ', null, undefined, 42, {}]) {
      expect(caminhoDeEditor(entrada)).toBeNull();
    }
  });

  it('devolve null quando não sobra segmento nenhum', () => {
    expect(caminhoDeEditor('/')).toBeNull();
  });

  it('nunca produz um esquema diferente de vscode://file/', () => {
    for (const entrada of ['javascript:alert(1)', 'D:\\dev', '/tmp/x']) {
      expect(caminhoDeEditor(entrada).startsWith('vscode://file/')).toBe(true);
    }
  });
});
