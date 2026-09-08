import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TelaFinal from './TelaFinal.jsx';
import { mensagens } from '../../../mensagens.js';

const m = mensagens.telaFinal;
const mm = mensagens.materializacao;

const comando = (id, estado, extra = {}) => ({ id, cmd: 'npm', args: ['install'], obrigatorio: true, longaDuracao: false, estado, runId: `run-${id}`, exitCode: 0, erro: null, ...extra });
const materializacao = (extra = {}) => ({
  projetoId: 'p1', raiz: 'C:\\dev\\kora\\alfa', estado: 'concluida',
  arquivos: { criados: 32, sobrescritos: 1, pulados: 2 },
  comandos: [comando('git-init', 'sucesso', { cmd: 'git', args: ['init'] }), comando('install', 'sucesso')],
  indice: 2, iniciadaEm: '2026-09-08T00:00:00.000Z', terminadaEm: '2026-09-08T00:02:00.000Z', ...extra,
});

const renderizar = (props = {}) => {
  const onAbrir = vi.fn();
  render(<TelaFinal materializacao={materializacao()} onAbrir={onAbrir} {...props} />);
  return { onAbrir };
};

describe('TelaFinal', () => {
  it('mostra o caminho e o resumo de arquivos', () => {
    renderizar();
    expect(screen.getByRole('heading', { name: m.titulo })).toBeInTheDocument();
    expect(screen.getByText('C:\\dev\\kora\\alfa')).toBeInTheDocument();
    expect(screen.getByText(mm.arquivos(32, 1, 2))).toBeInTheDocument();
  });

  it('não repete a lista de comandos, que o painel ao lado já mostra', () => {
    renderizar();
    expect(screen.queryByText('git init')).not.toBeInTheDocument();
    expect(screen.queryByText('npm install')).not.toBeInTheDocument();
  });

  it('oferece copiar o caminho, sem o usuário digitar nada', () => {
    renderizar();
    expect(screen.getByRole('button', { name: new RegExp(mensagens.chave.copiar, 'i') })).toBeInTheDocument();
  });

  it('o botão de abrir chama quem sabe abrir', () => {
    const { onAbrir } = renderizar();
    fireEvent.click(screen.getByRole('button', { name: m.abrir }));
    expect(onAbrir).toHaveBeenCalledTimes(1);
  });

  it('mostra o estado de carregando enquanto abre', () => {
    renderizar({ abrindo: true });
    expect(screen.getByRole('button', { name: m.abrir })).toBeDisabled();
  });

  it('erro ao abrir aparece legível, sem derrubar a tela', () => {
    renderizar({ erroAoAbrir: new Error('A pasta do projeto não está mais no disco.') });
    expect(screen.getByRole('alert')).toHaveTextContent('A pasta do projeto não está mais no disco.');
  });
});
