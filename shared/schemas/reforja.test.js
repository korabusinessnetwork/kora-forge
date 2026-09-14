import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { ESTADOS_ITEM } from '../reforja/estados.js';
import { LIMITES_PROPOSTA } from '../reforja/propostas.js';
import { ORIGENS_ITEM, PRIORIDADES_ITEM, criarItemSchema, estadoSugestoesSchema, gerarSpecSchema, itemSchema, sugestoesSchema } from './reforja.js';

const MIGRACAO = fs.readFileSync(path.join(process.cwd(), 'server', 'db', 'migrations', '20260914_reforja.sql'), 'utf8');
const valoresDoCheck = (coluna) => {
  const achado = new RegExp(`${coluna}\\s+IN\\s*\\(([^)]*)\\)`).exec(MIGRACAO);
  return achado[1].split(',').map((valor) => valor.trim().replace(/'/g, ''));
};

describe('contratos da reforja', () => {
  it('os enums batem com os CHECK da migração', () => {
    expect(valoresDoCheck('estado')).toEqual([...ESTADOS_ITEM]);
    expect(valoresDoCheck('origem')).toEqual([...ORIGENS_ITEM]);
    expect(valoresDoCheck('prioridade')).toEqual([...PRIORIDADES_ITEM]);
  });

  it('item é estrito', () => {
    const item = {
      id: 'i', titulo: 't', descricao: null, origem: 'manual', sinal: null, estado: 'proposta', prioridade: 'media',
      specCaminho: null, criadoEm: 'a', atualizadoEm: 'a',
    };
    expect(itemSchema.safeParse(item).success).toBe(true);
    expect(itemSchema.safeParse({ ...item, extra: 1 }).success).toBe(false);
  });

  it('criar apara o título e aceita só o que o dono pode escolher', () => {
    expect(criarItemSchema.parse({ titulo: '  x  ', prioridade: 'baixa', origem: 'modelo' })).toEqual({ titulo: 'x', prioridade: 'baixa', origem: 'modelo' });
  });

  it('sobrescrever só aceita booleano', () => {
    expect(gerarSpecSchema.safeParse({}).success).toBe(true);
    expect(gerarSpecSchema.safeParse({ sobrescrever: true }).success).toBe(true);
    expect(gerarSpecSchema.safeParse({ sobrescrever: 'true' }).success).toBe(false);
  });

  it('sugestões limitam a quantidade e o tamanho', () => {
    const proposta = { titulo: 't', descricao: '' };
    const base = { descartadas: 0, formatoReconhecido: true, modelo: null };
    expect(sugestoesSchema.safeParse({ ...base, propostas: Array(LIMITES_PROPOSTA.maximo).fill(proposta) }).success).toBe(true);
    expect(sugestoesSchema.safeParse({ ...base, propostas: Array(LIMITES_PROPOSTA.maximo + 1).fill(proposta) }).success).toBe(false);
    expect(sugestoesSchema.safeParse({ ...base, propostas: [{ titulo: 'a'.repeat(LIMITES_PROPOSTA.titulo + 1), descricao: '' }] }).success).toBe(false);
    expect(estadoSugestoesSchema.safeParse({ disponivel: false, motivo: 'outro' }).success).toBe(false);
  });
});
