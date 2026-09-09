import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CATALOGO_TOKENS, CHAVES_TOKENS, TOKENS_PADRAO, GRUPOS, TIPOS,
  tokensSchema, completarTokens, salvarDesignSchema,
} from './design.js';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));

describe('catálogo', () => {
  it('toda entrada está completa e dentro dos enums', () => {
    for (const token of CATALOGO_TOKENS) {
      expect(token.chave).toMatch(/^[A-Z][A-Z0-9_]*$/);
      expect(token.css).toMatch(/^--[a-z0-9-]+$/);
      expect(GRUPOS).toContain(token.grupo);
      expect(TIPOS).toContain(token.tipo);
      expect(typeof token.padrao).toBe('string');
      expect(token.rotulo.length).toBeGreaterThan(0);
    }
  });

  it('não repete chave de template', () => {
    expect(new Set(CHAVES_TOKENS).size).toBe(CHAVES_TOKENS.length);
  });

  it('todo default é válido pelo próprio schema', () => {
    expect(tokensSchema.safeParse(TOKENS_PADRAO).success).toBe(true);
  });

  // A regra do bloco: token entra no catálogo e no template no mesmo commit. Um sem o outro deixa
  // placeholder sem valor, que o gerador rejeita, ou valor sem uso, que ninguém percebe.
  it('o template usa exatamente as chaves do catálogo', () => {
    const molde = fs.readFileSync(path.join(RAIZ, 'templates/design-tokens/arquivos/src/styles/tokens.css'), 'utf8');
    const noTemplate = new Set([...molde.matchAll(/\{\{([A-Z][A-Z0-9_]*)\}\}/g)].map((achado) => achado[1]));
    noTemplate.delete('PROJETO');
    noTemplate.delete('WHITE_LABEL');

    expect([...noTemplate].sort()).toEqual([...CHAVES_TOKENS].sort());
  });
});

describe('validação', () => {
  it.each([
    ['hexadecimal de 6', 'COR_ACENTO', '#2f6fed'],
    ['hexadecimal de 3', 'COR_ACENTO', '#abc'],
    ['função de cor', 'COR_ACENTO', 'rgb(47 111 237)'],
    ['medida em px', 'ESPACO_4', '16px'],
    ['medida em rem', 'ESPACO_4', '1.5rem'],
    ['zero puro', 'ESPACO_4', '0'],
    ['pilha de fontes', 'FONTE_UI', 'Inter, system-ui, sans-serif'],
    ['sombra composta', 'SOMBRA_1', '0 1px 2px rgba(0, 0, 0, 0.08)'],
  ])('aceita %s', (_rotulo, chave, valor) => {
    expect(tokensSchema.safeParse({ [chave]: valor }).success).toBe(true);
  });

  it.each([
    ['nome de cor solto', 'COR_ACENTO', 'rebeccapurple'],
    ['cor sem cerquilha', 'COR_ACENTO', '2f6fed'],
    ['medida sem unidade', 'ESPACO_4', '16'],
    ['medida com unidade inventada', 'ESPACO_4', '16pt'],
    ['chave de CSS injetada na fonte', 'FONTE_UI', 'Inter; } body { display: none'],
    ['texto com chave', 'SOMBRA_1', '0 1px 2px {oi}'],
    ['valor vazio', 'FONTE_UI', ''],
  ])('recusa %s', (_rotulo, chave, valor) => {
    expect(tokensSchema.safeParse({ [chave]: valor }).success).toBe(false);
  });

  it('token desconhecido é recusado com o nome apontado', () => {
    const resultado = tokensSchema.safeParse({ COR_INVENTADA: '#000000' });
    expect(resultado.success).toBe(false);
    expect(resultado.error.issues[0].path).toEqual(['COR_INVENTADA']);
    expect(resultado.error.issues[0].message).toMatch(/desconhecido/i);
  });

  it('a mensagem de erro diz o formato esperado', () => {
    const resultado = tokensSchema.safeParse({ ESPACO_4: 'grande' });
    expect(resultado.error.issues[0].message).toMatch(/número com unidade/);
  });

  it('o corpo de salvar é estrito: campo a mais é recusado', () => {
    expect(salvarDesignSchema.safeParse({ tokens: {} }).success).toBe(true);
    expect(salvarDesignSchema.safeParse({ tokens: {}, paginas: [] }).success).toBe(false);
  });
});

describe('completarTokens', () => {
  it('o que falta cai para o default', () => {
    const completos = completarTokens({ COR_ACENTO: '#ff0000' });
    expect(completos.COR_ACENTO).toBe('#ff0000');
    expect(completos.COR_FUNDO).toBe(TOKENS_PADRAO.COR_FUNDO);
    expect(Object.keys(completos).sort()).toEqual([...CHAVES_TOKENS].sort());
  });

  it('sem nada, devolve os defaults inteiros', () => {
    expect(completarTokens()).toEqual(TOKENS_PADRAO);
  });
});
