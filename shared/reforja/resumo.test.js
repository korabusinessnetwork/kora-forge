import { describe, it, expect } from 'vitest';
import { resumirParaModelo } from './resumo.js';

describe('resumirParaModelo', () => {
  it('leva só título, severidade e contagens, nunca caminho nem sugestão', () => {
    const sinais = [{
      id: 'marcadores-pendentes',
      titulo: 'Marcadores',
      severidade: 'media',
      unidade: 'ocorrencias',
      sugestao: 'segredo da sugestão',
      total: 2,
      ocorrencias: 5,
      evidencias: [{ arquivo: 'server/segredo.js', contagem: 3 }],
      evidenciasOcultas: 0,
    }];
    const texto = resumirParaModelo(sinais);
    expect(JSON.parse(texto)).toEqual([{ titulo: 'Marcadores', severidade: 'media', arquivos: 2, ocorrencias: 5, unidade: 'ocorrencias' }]);
    expect(texto).not.toContain('server/segredo.js');
    expect(texto).not.toContain('segredo da sugestão');
  });

  it('sem sinal é lista vazia', () => {
    expect(resumirParaModelo([])).toBe('[]');
    expect(resumirParaModelo(undefined)).toBe('[]');
  });
});
