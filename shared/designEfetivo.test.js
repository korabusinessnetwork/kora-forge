import { describe, it, expect } from 'vitest';
import { designEfetivo } from './designEfetivo.js';

const payload = (extra = {}) => ({ etapaAtual: 'design', etapasConcluidas: [], assumidas: [], respostas: {}, ...extra });
const registro = { versao: 3, ativo: true, criadoEm: '2026-09-14T00:00:00.000Z', payload: { paginas: [] }, pendencias: [] };

describe('designEfetivo', () => {
  it('sem documento salvo, não há design, qualquer que seja a escolha', () => {
    expect(designEfetivo(payload(), null)).toBeNull();
    expect(designEfetivo(payload({ etapasConcluidas: ['design'] }), null)).toBeNull();
    expect(designEfetivo(payload({ assumidas: ['design'] }), null)).toBeNull();
  });

  it('com o padrão Kora escolhido, o documento salvo não entra no plano', () => {
    expect(designEfetivo(payload({ assumidas: ['identidade', 'design'] }), registro)).toBeNull();
  });

  it('em qualquer outro caso, devolve o mesmo registro, sem cópia', () => {
    expect(designEfetivo(payload({ etapasConcluidas: ['design'] }), registro)).toBe(registro);
    expect(designEfetivo(payload(), registro)).toBe(registro);
  });
});
