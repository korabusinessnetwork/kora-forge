import { describe, it, expect } from 'vitest';
import { runIdEmFoco } from './Materializar.jsx';

const comando = (id, estado, runId) => ({ id, cmd: 'npm', args: [id], obrigatorio: true, longaDuracao: false, estado, runId, exitCode: null, erro: null });
const materializacao = (comandos) => ({ projetoId: 'p1', raiz: '/ws/p', estado: 'rodando', arquivos: { criados: 1, sobrescritos: 0, pulados: 0 }, comandos, indice: 0, iniciadaEm: 'x', terminadaEm: null });

describe('runIdEmFoco', () => {
  it('segue o comando que está rodando agora', () => {
    const estado = materializacao([comando('a', 'sucesso', 'r1'), comando('b', 'rodando', 'r2'), comando('c', 'pendente', null)]);
    expect(runIdEmFoco(estado)).toBe('r2');
  });

  it('sem nada rodando, segue o último que já rodou', () => {
    const estado = materializacao([comando('a', 'sucesso', 'r1'), comando('b', 'falha', 'r2'), comando('c', 'pendente', null)]);
    expect(runIdEmFoco(estado)).toBe('r2');
  });

  // Antes de qualquer comando não existe run: o log mostra o vazio em vez de fingir que tem algo.
  it('sem nenhum comando executado, não há run em foco', () => {
    expect(runIdEmFoco(materializacao([comando('a', 'pendente', null)]))).toBeNull();
    expect(runIdEmFoco(materializacao([]))).toBeNull();
    expect(runIdEmFoco(null)).toBeNull();
  });

  it('comando marcado rodando mas ainda sem runId não é escolhido', () => {
    const estado = materializacao([comando('a', 'sucesso', 'r1'), comando('b', 'rodando', null)]);
    expect(runIdEmFoco(estado)).toBe('r1');
  });
});
