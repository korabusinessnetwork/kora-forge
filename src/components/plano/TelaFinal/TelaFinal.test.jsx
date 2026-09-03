import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import TelaFinal from './TelaFinal.jsx';
import { renderizarComProvedores } from '../../../testes/renderizar.jsx';
import { mensagens } from '../../../mensagens.js';

const m = mensagens.telaFinal;
const projeto = { id: 'p1', nome: 'Meu App' };

const comando = (id, estado) => ({ id, cmd: 'npm', args: ['install'], obrigatorio: true, longaDuracao: false, estado, runId: `run-${id}`, exitCode: 0, erro: null });

const materializacao = (extra = {}) => ({
  projetoId: 'p1',
  raiz: 'D:\\dev\\kora\\meu-app',
  estado: 'concluida',
  arquivos: { criados: 32, sobrescritos: 1, pulados: 2 },
  comandos: [comando('git-init', 'sucesso'), comando('install', 'sucesso'), comando('dev', 'pendente')],
  indice: 3,
  iniciadaEm: '2026-09-03T00:00:00.000Z',
  terminadaEm: '2026-09-03T00:02:00.000Z',
  ...extra,
});

const renderizar = (extra) => renderizarComProvedores(<TelaFinal materializacao={materializacao(extra)} projeto={projeto} />);

describe('TelaFinal', () => {
  it('mostra o nome, o caminho no disco e o resumo do que nasceu', () => {
    renderizar();
    expect(screen.getByRole('heading', { name: m.titulo })).toBeInTheDocument();
    expect(screen.getByText('Meu App')).toBeInTheDocument();
    expect(screen.getByText('D:\\dev\\kora\\meu-app')).toBeInTheDocument();
    // Só os comandos que rodaram entram na conta; o pendente não.
    expect(screen.getByText(m.resumo(32, 2))).toBeInTheDocument();
    expect(screen.getByText(m.detalhe(1, 2))).toBeInTheDocument();
  });

  it('o caminho vem em Chave, então dá para copiar', () => {
    renderizar();
    expect(screen.getByRole('button', { name: `${mensagens.chave.copiar} ${m.caminho}` })).toBeInTheDocument();
  });

  // O Forge não executa nada para abrir o editor: `code` não está na whitelist (C7, ADR-002).
  // O atalho é um link `vscode://`, resolvido pelo sistema operacional.
  it('o atalho do editor é um link vscode://, com o caminho do Windows normalizado', () => {
    renderizar();
    const atalho = screen.getByRole('link', { name: m.abrirNoEditor });
    expect(atalho).toHaveAttribute('href', 'vscode://file/D:/dev/kora/meu-app');
  });

  it('diz que o atalho depende do VS Code instalado, para o silêncio não virar estado invisível', () => {
    renderizar();
    expect(screen.getByText(m.abrirMicro)).toBeInTheDocument();
  });

  it('nunca é beco sem saída: traz a volta para o projeto', () => {
    renderizar();
    expect(screen.getByRole('link', { name: m.verProjeto })).toHaveAttribute('href', '/projetos/p1');
  });

  // ADR-002: não existe rollback. Abortada não celebra, diz o que ficou no disco.
  it('abortada não mostra a tela de sucesso e diz o que ficou escrito', () => {
    renderizar({ estado: 'abortada' });
    expect(screen.getByRole('heading', { name: m.abortada.titulo })).toBeInTheDocument();
    expect(screen.getByText(m.abortada.micro)).toBeInTheDocument();
    expect(screen.getByText(m.abortada.resumo(32, 2))).toBeInTheDocument();
    expect(screen.queryByText(m.titulo)).toBeNull();
  });

  it('caminho vazio não renderiza atalho quebrado', () => {
    renderizar({ raiz: ' ' });
    expect(screen.queryByRole('link', { name: m.abrirNoEditor })).toBeNull();
    expect(screen.queryByText(m.abrirMicro)).toBeNull();
    expect(screen.getByRole('link', { name: m.verProjeto })).toBeInTheDocument();
  });
});
