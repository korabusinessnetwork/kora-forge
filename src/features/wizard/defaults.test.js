import { describe, it, expect } from 'vitest';
import { defaultsDaEtapa, respostasIniciais } from './defaults.js';

const preset = {
  id: 'criar-aplicacao-web',
  versao: 1,
  etapas: ['identidade', 'arquitetura', 'seguranca'],
  defaults: { modelo_arquitetura: 'A', stack: ['react', 'vite'], multi_tenant: true, white_label: true, auth: true, deploy: 'vercel' },
};
const projeto = { nome: 'Alfa' };

describe('defaultsDaEtapa', () => {
  it('arquitetura vem do preset, com os nomes de campo do blueprint', () => {
    expect(defaultsDaEtapa('arquitetura', preset, projeto)).toEqual({
      modelo: 'A', stack: ['react', 'vite'], multiTenant: true, whiteLabel: true, auth: true, deploy: 'vercel',
    });
  });

  it('preset local usa modelo B e sem multi-tenant', () => {
    const local = { defaults: { modelo_arquitetura: 'B', stack: ['fastify'], multi_tenant: false, deploy: 'nenhum' } };
    expect(defaultsDaEtapa('arquitetura', local, projeto)).toMatchObject({ modelo: 'B', multiTenant: false, whiteLabel: false, auth: false, deploy: 'nenhum' });
  });

  it('modelo inválido no preset cai no default do schema', () => {
    expect(defaultsDaEtapa('arquitetura', { defaults: { modelo_arquitetura: 'Z' } }, projeto).modelo).toBe('A');
  });

  it('identidade herda o nome do projeto e as demais vêm do schema', () => {
    expect(defaultsDaEtapa('identidade', preset, projeto)).toEqual({ nome: 'Alfa', essencia: '', problema: '', valor: '' });
    expect(defaultsDaEtapa('seguranca', preset, projeto).tierGratuito).toBe(true);
    expect(defaultsDaEtapa('voar', preset, projeto)).toEqual({});
  });
});

describe('respostasIniciais', () => {
  it('cobre toda etapa do preset, com o que já foi respondido por cima do default', () => {
    const payload = { respostas: { identidade: { essencia: 'uma frase' } } };
    const iniciais = respostasIniciais(payload, preset, projeto);
    expect(Object.keys(iniciais).sort()).toEqual(['arquitetura', 'identidade', 'seguranca']);
    expect(iniciais.identidade).toEqual({ nome: 'Alfa', essencia: 'uma frase', problema: '', valor: '' });
    expect(iniciais.arquitetura.deploy).toBe('vercel');
  });
});
