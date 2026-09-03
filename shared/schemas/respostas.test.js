import { describe, it, expect } from 'vitest';
import { SCHEMA_POR_ETAPA, respostasSchema, respostaArquiteturaSchema } from './respostas.js';
import { blueprintSchema } from './blueprint.js';

const blueprint = (extra = {}) => ({
  preset: { id: 'criar-site', versao: 1 },
  etapaAtual: 'identidade',
  etapasConcluidas: [],
  assumidas: [],
  respostas: {},
  ...extra,
});
const issues = (dados) => {
  const r = blueprintSchema.safeParse(dados);
  return r.success ? [] : r.error.issues.map((i) => i.path.join('.'));
};

describe('schemas de resposta', () => {
  it('objeto vazio vira defaults em toda etapa: resposta parcial é válida', () => {
    for (const [etapa, schema] of Object.entries(SCHEMA_POR_ETAPA)) {
      const resultado = schema.safeParse({});
      expect(resultado.success, etapa).toBe(true);
    }
    expect(respostaArquiteturaSchema.parse({})).toEqual({ modelo: 'A', stack: [], multiTenant: false, whiteLabel: false, auth: false, deploy: '' });
    expect(SCHEMA_POR_ETAPA.seguranca.parse({}).tierGratuito).toBe(true);
    expect(SCHEMA_POR_ETAPA.identidade.parse({ essencia: 'x' })).toEqual({ nome: '', essencia: 'x', problema: '', valor: '' });
  });

  it('rejeita campo desconhecido e tipo errado', () => {
    expect(respostasSchema.safeParse({ identidade: { inventado: 1 } }).success).toBe(false);
    expect(respostasSchema.safeParse({ inventada: {} }).success).toBe(false);
    expect(respostaArquiteturaSchema.safeParse({ modelo: 'Z' }).success).toBe(false);
    expect(SCHEMA_POR_ETAPA.dados.safeParse({ entidades: [{ nome: 'x', campos: 'nao-e-lista' }] }).success).toBe(false);
  });

  it('design e apis só aceitam objeto vazio nesta fase', () => {
    expect(respostasSchema.safeParse({ design: {} }).success).toBe(true);
    expect(respostasSchema.safeParse({ apis: { chave: 'x' } }).success).toBe(false);
  });
});

describe('blueprintSchema', () => {
  it('aceita o blueprint mínimo e as respostas tipadas', () => {
    expect(blueprintSchema.safeParse(blueprint()).success).toBe(true);
    expect(blueprintSchema.safeParse(blueprint({ respostas: { identidade: { nome: 'Alfa' } } })).success).toBe(true);
  });

  it('recusa etapa repetida e etapa concluída e assumida ao mesmo tempo', () => {
    expect(issues(blueprint({ etapasConcluidas: ['identidade', 'identidade'] }))).toContain('etapasConcluidas');
    expect(issues(blueprint({ assumidas: ['escopo', 'escopo'] }))).toContain('assumidas');
    expect(issues(blueprint({ etapasConcluidas: ['escopo'], assumidas: ['escopo'] }))).toContain('assumidas');
  });

  it('recusa chave desconhecida em respostas', () => {
    expect(issues(blueprint({ respostas: { voar: {} } }))).toContain('respostas');
  });
});
