import { describe, it, expect } from 'vitest';
import { CICLO, ESTADOS_ITEM, acoesDe, estaAberto, estadoAnterior, podeTransicionar, proximoEstado, transicoesDe } from './estados.js';

const VALIDAS = [
  ['proposta', 'especificada'],
  ['proposta', 'descartada'],
  ['especificada', 'em_construcao'],
  ['especificada', 'proposta'],
  ['especificada', 'descartada'],
  ['em_construcao', 'em_revisao'],
  ['em_construcao', 'especificada'],
  ['em_construcao', 'descartada'],
  ['em_revisao', 'concluida'],
  ['em_revisao', 'em_construcao'],
  ['em_revisao', 'descartada'],
  ['concluida', 'em_revisao'],
  ['descartada', 'proposta'],
];

describe('máquina de estados da reforja', () => {
  it('os estados batem com o CHECK da migração, e o ciclo é o trilho sem descartada', () => {
    expect(ESTADOS_ITEM).toEqual(['proposta', 'especificada', 'em_construcao', 'em_revisao', 'concluida', 'descartada']);
    expect(CICLO).toEqual(ESTADOS_ITEM.filter((estado) => estado !== 'descartada'));
  });

  it('aceita exatamente as transições do ciclo, e nenhuma outra', () => {
    const chave = ([de, para]) => `${de}>${para}`;
    const validas = new Set(VALIDAS.map(chave));
    for (const de of ESTADOS_ITEM) {
      for (const para of ESTADOS_ITEM) {
        expect(podeTransicionar(de, para), `${de} para ${para}`).toBe(validas.has(chave([de, para])));
      }
    }
  });

  it('pular etapa do ciclo é recusado', () => {
    expect(podeTransicionar('proposta', 'em_construcao')).toBe(false);
    expect(podeTransicionar('proposta', 'concluida')).toBe(false);
    expect(podeTransicionar('concluida', 'descartada')).toBe(false);
    expect(podeTransicionar('descartada', 'concluida')).toBe(false);
  });

  it('estado desconhecido não tem transição', () => {
    expect(transicoesDe('qualquer')).toEqual([]);
    expect(podeTransicionar('qualquer', 'proposta')).toBe(false);
    expect(proximoEstado('qualquer')).toBeNull();
    expect(estadoAnterior('qualquer')).toBeNull();
  });

  it('avançar segue o ciclo e para em concluída', () => {
    expect(CICLO.map(proximoEstado)).toEqual(['especificada', 'em_construcao', 'em_revisao', 'concluida', null]);
    expect(proximoEstado('descartada')).toBeNull();
  });

  it('voltar é um passo atrás, e proposta não volta', () => {
    expect(CICLO.map(estadoAnterior)).toEqual([null, 'proposta', 'especificada', 'em_construcao', 'em_revisao']);
  });

  it('aberto é tudo fora de concluída e descartada', () => {
    expect(ESTADOS_ITEM.filter(estaAberto)).toEqual(['proposta', 'especificada', 'em_construcao', 'em_revisao']);
  });

  it('as ações oferecidas são sempre transições válidas', () => {
    for (const estado of ESTADOS_ITEM) {
      for (const { para } of acoesDe(estado)) expect(podeTransicionar(estado, para)).toBe(true);
    }
    expect(acoesDe('proposta').map((a) => a.acao)).toEqual(['avancar', 'descartar']);
    expect(acoesDe('em_revisao').map((a) => a.acao)).toEqual(['avancar', 'voltar', 'descartar']);
    expect(acoesDe('concluida').map((a) => a.acao)).toEqual(['voltar']);
    expect(acoesDe('descartada').map((a) => a.acao)).toEqual(['restaurar']);
  });
});
