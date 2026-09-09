import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TelaFinal from './TelaFinal.jsx';
import { mensagens } from '../../../mensagens.js';

const m = mensagens.telaFinal;
const mm = mensagens.materializacao;

const comando = (id, estado, extra = {}) => ({ id, cmd: 'npm', args: ['install'], obrigatorio: true, longaDuracao: false, estado, runId: `run-${id}`, exitCode: 0, erro: null, url: null, ...extra });
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

  it('sem URL anunciada, a seção do endereço não existe', () => {
    renderizar();
    expect(screen.queryByText(m.urlTitulo)).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('com URL, mostra link clicável que abre em aba nova', () => {
    const comUrl = materializacao({
      comandos: [comando('dev', 'rodando', { cmd: 'npm', args: ['run', 'dev'], longaDuracao: true, url: 'http://localhost:5273/' })],
    });
    render(<TelaFinal materializacao={comUrl} onAbrir={vi.fn()} />);

    const link = screen.getByRole('link', { name: 'http://localhost:5273/' });
    expect(link).toHaveAttribute('href', 'http://localhost:5273/');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noreferrer');
    expect(screen.getByText(m.urlTitulo)).toBeInTheDocument();
  });

  it('a URL também é copiável, como o caminho', () => {
    const comUrl = materializacao({
      comandos: [comando('dev', 'rodando', { longaDuracao: true, url: 'http://localhost:5273/' })],
    });
    render(<TelaFinal materializacao={comUrl} onAbrir={vi.fn()} />);
    // Dois botões de copiar: o do caminho no disco e o do endereço.
    expect(screen.getAllByRole('button', { name: new RegExp(mensagens.chave.copiar, 'i') })).toHaveLength(2);
  });

  it('vale a URL do comando que anunciou, mesmo com outros comandos na lista', () => {
    const comUrl = materializacao({
      comandos: [
        comando('git-init', 'sucesso', { cmd: 'git', args: ['init'] }),
        comando('install', 'sucesso'),
        comando('dev', 'rodando', { longaDuracao: true, url: 'http://127.0.0.1:5274/' }),
      ],
    });
    render(<TelaFinal materializacao={comUrl} onAbrir={vi.fn()} />);
    expect(screen.getByRole('link')).toHaveAttribute('href', 'http://127.0.0.1:5274/');
  });

  it('erro ao abrir aparece legível, sem derrubar a tela', () => {
    renderizar({ erroAoAbrir: new Error('A pasta do projeto não está mais no disco.') });
    expect(screen.getByRole('alert')).toHaveTextContent('A pasta do projeto não está mais no disco.');
  });
});
