import { describe, it, expect } from 'vitest';
import { caminhoDaSpec, montarSpec, slugDoItem, valoresDaSpec } from './spec.js';
import { chavesUsadas } from '../template.js';

const template = {
  manifesto: {
    id: 'reforja-spec',
    versao: '9.9.9',
    vazios: { descricao: '_a definir_', sinal: 'nenhum', aDefinir: '_a definir_' },
    origens: { manual: 'à mão', diagnostico: 'diagnóstico', modelo: 'modelo' },
    prioridades: { alta: 'alta', media: 'média', baixa: 'baixa' },
  },
  texto: '# {{TITULO}} ({{ITEM_ID}})\n{{ORIGEM}} {{PRIORIDADE}} {{SINAL}} {{DATA}} {{CAMINHO}} v{{VERSAO_TEMPLATE}}\n{{DESCRICAO}}\n{{A_DEFINIR}}',
};

const item = (extra = {}) => ({
  id: '1b2c3d4e-aaaa-bbbb-cccc-000000000000',
  titulo: 'Dividir o arquivo de mensagens',
  descricao: null,
  origem: 'manual',
  sinal: null,
  estado: 'proposta',
  prioridade: 'media',
  specCaminho: null,
  criadoEm: '2026-09-14T10:20:30.000Z',
  atualizadoEm: '2026-09-14T10:20:30.000Z',
  ...extra,
});

describe('caminho da spec', () => {
  it('é specs/reforja-<slug>.md, sem acento', () => {
    expect(caminhoDaSpec(item({ titulo: 'Remover console.log do índice' }))).toBe('specs/reforja-remover-console-log-do-indice.md');
  });

  it('título com tentativa de path traversal vira slug inofensivo', () => {
    expect(caminhoDaSpec(item({ titulo: '../../Windows/System32' }))).toBe('specs/reforja-windows-system32.md');
    expect(caminhoDaSpec(item({ titulo: 'C:\\temp\\x' }))).toBe('specs/reforja-c-temp-x.md');
  });

  it('título só de símbolos cai para o id', () => {
    expect(slugDoItem(item({ titulo: '!!! ??? ###' }))).toBe('item-1b2c3d4e');
  });
});

describe('montarSpec', () => {
  it('preenche todo placeholder, com lacuna honesta onde o item não tem dado', () => {
    const texto = montarSpec(item(), template);
    expect(chavesUsadas(texto)).toEqual([]);
    expect(texto).toContain('# Dividir o arquivo de mensagens (1b2c3d4e-aaaa-bbbb-cccc-000000000000)');
    expect(texto).toContain('à mão média nenhum 2026-09-14 specs/reforja-dividir-o-arquivo-de-mensagens.md v9.9.9');
    expect(texto.split('\n')[2]).toBe('_a definir_');
  });

  it('usa descrição e sinal quando existem', () => {
    const valores = valoresDaSpec(item({ descricao: '  quebrar por área  ', sinal: 'arquivos-grandes', origem: 'diagnostico' }), template);
    expect(valores.DESCRICAO).toBe('quebrar por área');
    expect(valores.SINAL).toBe('arquivos-grandes');
    expect(valores.ORIGEM).toBe('diagnóstico');
  });

  it('é determinística: a data vem do item, e duas montagens dão o mesmo texto', () => {
    expect(montarSpec(item(), template)).toBe(montarSpec(item(), template));
  });

  it('descrição com cara de placeholder entra como texto, sem ser reinterpretada', () => {
    expect(montarSpec(item({ descricao: '{{TITULO}}' }), template)).toContain('\n{{TITULO}}\n');
  });
});
