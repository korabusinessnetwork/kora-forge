import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PainelMaterializacao from './PainelMaterializacao.jsx';
import { mensagens } from '../../../mensagens.js';

const m = mensagens.materializacao;
const comando = (id, estado, extra = {}) => ({ id, cmd: 'npm', args: ['install'], obrigatorio: true, longaDuracao: false, estado, runId: `run-${id}`, exitCode: null, erro: null, ...extra });
const materializacao = (extra = {}) => ({
  projetoId: 'p1', raiz: '/dev/kora/alfa', estado: 'rodando',
  arquivos: { criados: 32, sobrescritos: 1, pulados: 2 },
  comandos: [comando('git-init', 'sucesso', { cmd: 'git', args: ['init'], exitCode: 0 }), comando('install', 'rodando')],
  indice: 1, iniciadaEm: '2026-09-03T00:00:00.000Z', terminadaEm: null, ...extra,
});
const renderizar = (extra, props = {}) => {
  const onDecidir = vi.fn();
  const onParar = vi.fn();
  render(<PainelMaterializacao materializacao={materializacao(extra)} onDecidir={onDecidir} onParar={onParar} {...props} />);
  return { onDecidir, onParar };
};

describe('PainelMaterializacao', () => {
  it('mostra o estado, a contagem de arquivos, a raiz e cada comando', () => {
    renderizar();
    expect(screen.getByRole('status')).toHaveTextContent(m.estado.rodando);
    expect(screen.getByText(m.arquivos(32, 1, 2))).toBeInTheDocument();
    expect(screen.getByText('/dev/kora/alfa')).toBeInTheDocument();
    expect(screen.getByText('git init')).toBeInTheDocument();
    expect(screen.getByText(m.comandoEstado.sucesso)).toBeInTheDocument();
    expect(screen.getByText(m.comandoEstado.rodando)).toBeInTheDocument();
  });

  it('comando rodando oferece parar', () => {
    const { onParar } = renderizar();
    fireEvent.click(screen.getByRole('button', { name: m.parar }));
    expect(onParar).toHaveBeenCalledWith('run-install');
  });

  it('sem falha não mostra as três decisões', () => {
    renderizar();
    for (const acao of [m.repetir, m.pular, m.abortar]) expect(screen.queryByRole('button', { name: acao })).toBeNull();
  });

  it('parado em falha mostra o erro e as três saídas (RN-05.5)', () => {
    const { onDecidir } = renderizar({
      estado: 'parado_em_falha',
      comandos: [comando('install', 'falha', { exitCode: 1, erro: 'Saiu com código 1.' })],
    });
    expect(screen.getByRole('alert')).toHaveTextContent(m.estado.parado_em_falha);
    expect(screen.getByText('exit 1')).toBeInTheDocument();
    expect(screen.getByText('Saiu com código 1.')).toBeInTheDocument();
    for (const [acao, rotulo] of [['repetir', m.repetir], ['pular', m.pular], ['abortar', m.abortar]]) {
      fireEvent.click(screen.getByRole('button', { name: rotulo }));
      expect(onDecidir).toHaveBeenCalledWith(acao);
    }
  });

  it('concluída e abortada dizem o que aconteceu', () => {
    const { unmount } = render(<PainelMaterializacao materializacao={materializacao({ estado: 'concluida' })} onDecidir={vi.fn()} onParar={vi.fn()} />);
    expect(screen.getByRole('status')).toHaveTextContent(m.estado.concluida);
    unmount();
    render(<PainelMaterializacao materializacao={materializacao({ estado: 'abortada' })} onDecidir={vi.fn()} onParar={vi.fn()} />);
    expect(screen.getByRole('status')).toHaveTextContent(m.estado.abortada);
  });
});
