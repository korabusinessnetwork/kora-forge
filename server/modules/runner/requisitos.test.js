import { describe, it, expect } from 'vitest';
import { extrairVersao, versaoAtende, juntarRequisitos, checarRequisitos, REQUISITOS_BASE } from './requisitos.js';

describe('extrairVersao', () => {
  it.each([
    ['v22.22.2', '22.22.2'],
    ['git version 2.43.0', '2.43.0'],
    ['10.9.7', '10.9.7'],
    ['supabase 1.2', '1.2'],
    ['sem número', null],
  ])('%j vira %j', (saida, esperado) => {
    expect(extrairVersao(saida)).toBe(esperado);
  });
});

describe('versaoAtende', () => {
  it('compara a versão maior, e sem mínimo qualquer versão serve', () => {
    expect(versaoAtende('22.22.2', '20')).toBe(true);
    expect(versaoAtende('20.19.0', '20')).toBe(true);
    expect(versaoAtende('18.20.0', '20')).toBe(false);
    expect(versaoAtende('2.43.0', null)).toBe(true);
    expect(versaoAtende(null, null)).toBe(true);
    expect(versaoAtende(null, '20')).toBe(false);
  });
});

describe('juntarRequisitos', () => {
  it('junta base e preset sem duplicar, preferindo o que tem mínimo', () => {
    const lista = juntarRequisitos({ requisitos: [{ bin: 'node', min: '20' }, { bin: 'git' }, { bin: 'supabase' }] });
    expect(lista.map((r) => r.bin).sort()).toEqual(['git', 'node', 'supabase']);
    expect(lista.find((r) => r.bin === 'node').min).toBe('20');
    expect(juntarRequisitos(null).map((r) => r.bin)).toEqual(REQUISITOS_BASE.map((r) => r.bin));
  });
});

describe('checarRequisitos', () => {
  it('encontra node e git nesta máquina', async () => {
    const resultado = await checarRequisitos({ requisitos: [] }, process.cwd());
    const node = resultado.find((r) => r.bin === 'node');
    expect(node.ok).toBe(true);
    expect(node.encontrada).toMatch(/^\d+\.\d+/);
    expect(resultado.find((r) => r.bin === 'git').ok).toBe(true);
  });

  it('mínimo acima do instalado marca como ausente, mostrando a versão encontrada', async () => {
    const resultado = await checarRequisitos({ requisitos: [{ bin: 'node', min: '999' }] }, process.cwd());
    const node = resultado.find((r) => r.bin === 'node');
    expect(node.ok).toBe(false);
    expect(node.min).toBe('999');
    expect(node.encontrada).toMatch(/^\d+\.\d+/);
  });

  it('ferramenta fora da whitelist nunca é executada e conta como ausente', async () => {
    const resultado = await checarRequisitos({ requisitos: [{ bin: 'docker' }] }, process.cwd());
    const docker = resultado.find((r) => r.bin === 'docker');
    expect(docker).toMatchObject({ ok: false, encontrada: null });
  });
});
