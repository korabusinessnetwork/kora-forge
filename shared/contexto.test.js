import { describe, it, expect } from 'vitest';
import { montarContexto } from './contexto.js';

const preset = { id: 'criar-site', categoria: 'site', versao: 1, etapas: ['identidade', 'design', 'materializar'], defaults: { tem_ui: true } };
const projeto = { id: 'p1', slug: 'alfa', status: 'rascunho', caminhoDisco: null };
const blueprint = { payload: { etapaAtual: 'identidade', etapasConcluidas: ['identidade'], assumidas: ['design'], respostas: { identidade: { essencia: 'uma frase' } } } };

describe('montarContexto', () => {
  it('achata projeto, preset e blueprint num objeto documentado', () => {
    const contexto = montarContexto({ projeto, preset, blueprint });
    expect(contexto.preset).toEqual({ id: 'criar-site', categoria: 'site', etapas: preset.etapas, versao: 1 });
    expect(contexto.projeto).toEqual({ status: 'rascunho', slug: 'alfa', materializado: false });
    expect(contexto.identidade.essencia).toBe('uma frase');
    expect(contexto.etapasConcluidas).toEqual(['identidade']);
    expect(contexto.assumidas).toEqual(['design']);
    expect(contexto.temUi).toBe(true);
  });

  it('etapa sem resposta entra com o default do schema, sem lançar', () => {
    const contexto = montarContexto({ projeto, preset, blueprint: { payload: {} } });
    expect(contexto.arquitetura).toEqual({ modelo: 'A', stack: [], multiTenant: false, whiteLabel: false, auth: false, deploy: '' });
    expect(contexto.seguranca.tierGratuito).toBe(true);
    expect(contexto.dados.entidades).toEqual([]);
    expect(contexto.etapasConcluidas).toEqual([]);
  });

  it('resposta corrompida cai no default em vez de quebrar a avaliação', () => {
    const contexto = montarContexto({ projeto, preset, blueprint: { payload: { respostas: { arquitetura: { modelo: 'Z', stack: 'nao-e-lista' } } } } });
    expect(contexto.arquitetura.modelo).toBe('A');
    expect(contexto.arquitetura.stack).toEqual([]);
  });

  it('campos de fases futuras nascem vazios, não ausentes', () => {
    const contexto = montarContexto({ projeto, preset, blueprint });
    expect(contexto.integracoes).toEqual([]);
    expect(contexto.ferramentasAusentes).toEqual([]);
  });

  it('projeto materializado é marcado pelo caminho em disco', () => {
    expect(montarContexto({ projeto: { ...projeto, caminhoDisco: '/dev/alfa' }, preset, blueprint }).projeto.materializado).toBe(true);
  });
});
