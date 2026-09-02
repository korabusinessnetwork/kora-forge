import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { capturarTokenDaUrl, obterToken, limparToken } from './sessao.js';

const local = (hash, pathname = '/', search = '') => ({ hash, pathname, search });

beforeEach(() => limparToken());
afterEach(() => vi.unstubAllGlobals());

describe('capturarTokenDaUrl', () => {
  it('captura #token, guarda em sessionStorage e limpa a URL', () => {
    const historico = { replaceState: vi.fn() };
    expect(capturarTokenDaUrl(local('#token=abc123'), historico)).toBe('abc123');
    expect(sessionStorage.getItem('forge.token')).toBe('abc123');
    expect(obterToken()).toBe('abc123');
    expect(historico.replaceState).toHaveBeenCalledWith(null, '', '/');
  });

  it('preserva o resto do hash, o caminho e a query', () => {
    const historico = { replaceState: vi.fn() };
    capturarTokenDaUrl(local('#aba=x&token=abc&y=1', '/config', '?z=2'), historico);
    expect(historico.replaceState).toHaveBeenCalledWith(null, '', '/config?z=2#aba=x&y=1');
  });

  it('sem token no hash devolve o que já estava e não mexe na URL', () => {
    sessionStorage.setItem('forge.token', 'antigo');
    const historico = { replaceState: vi.fn() };
    expect(capturarTokenDaUrl(local('#outra'), historico)).toBe('antigo');
    expect(capturarTokenDaUrl(local(''), historico)).toBe('antigo');
    expect(historico.replaceState).not.toHaveBeenCalled();
  });

  it('token com caractere fora do padrão é ignorado', () => {
    expect(capturarTokenDaUrl(local('#token=abc%3Cscript%3E'), { replaceState: vi.fn() })).toBeNull();
    expect(sessionStorage.getItem('forge.token')).toBeNull();
  });

  it('sem sessionStorage o token vale em memória nesta carga', () => {
    vi.stubGlobal('sessionStorage', undefined);
    expect(capturarTokenDaUrl(local('#token=mem'), { replaceState: vi.fn() })).toBe('mem');
    expect(obterToken()).toBe('mem');
  });

  it('obterToken devolve null sem token', () => {
    expect(obterToken()).toBeNull();
  });
});
