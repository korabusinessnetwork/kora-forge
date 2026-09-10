import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import TelaFinal from './TelaFinal.jsx';
import { renderizarComProvedores } from '../../../testes/renderizar.jsx';
import { mensagens } from '../../../mensagens.js';

const m = mensagens.telaFinal;
const projeto = { id: 'p1', nome: 'Meu App' };

const comando = (id, estado, extra = {}) => ({ id, cmd: 'npm', args: ['install'], obrigatorio: true, longaDuracao: false, estado, runId: `run-${id}`, exitCode: 0, erro: null, url: null, ...extra });

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

const renderizar = (extra, props = {}) =>
  renderizarComProvedores(<TelaFinal materializacao={materializacao(extra)} projeto={projeto} {...props} />);

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
    expect(screen.getByText(m.abrirNoEditorMicro)).toBeInTheDocument();
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
    expect(screen.queryByText(m.abrirNoEditorMicro)).toBeNull();
    expect(screen.getByRole('link', { name: m.verProjeto })).toBeInTheDocument();
  });

  // A URL do dev server (B-01). Vira link, e nunca binário que o Forge mande abrir (B-02).
  describe('endereço do projeto rodando', () => {
    const comUrl = { comandos: [comando('install', 'sucesso'), comando('dev', 'rodando', { url: 'http://localhost:5175/' })] };

    it('mostra a URL anunciada pelo dev server como link para aba nova', () => {
      renderizar(comUrl);
      const link = screen.getByRole('link', { name: 'http://localhost:5175/' });
      expect(link).toHaveAttribute('href', 'http://localhost:5175/');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noreferrer');
      expect(screen.getByText(m.urlTitulo)).toBeInTheDocument();
    });

    it('a URL também vem em Chave, para copiar sem selecionar com o mouse', () => {
      renderizar(comUrl);
      expect(screen.getByRole('button', { name: `${mensagens.chave.copiar} ${m.rotuloUrl}` })).toBeInTheDocument();
    });

    it('sem comando que anuncie URL, a seção inteira não é renderizada', () => {
      renderizar();
      expect(screen.queryByText(m.urlTitulo)).toBeNull();
    });

    // Parou no meio: não há o que prometer que está no ar.
    it('abortada não mostra endereço, mesmo que algum comando tenha anunciado um', () => {
      renderizar({ ...comUrl, estado: 'abortada' });
      expect(screen.queryByText(m.urlTitulo)).toBeNull();
    });
  });

  // Abrir a pasta executa processo, então é capacidade própria do Forge (ADR-010) e passa pelo
  // servidor. O componente não sabe disso: só chama o callback.
  describe('abrir a pasta', () => {
    it('chama o callback sem argumento do React Query vazando junto (R-10)', () => {
      const onAbrir = vi.fn();
      renderizar(undefined, { onAbrir });
      fireEvent.click(screen.getByRole('button', { name: m.abrirPasta }));
      expect(onAbrir).toHaveBeenCalledTimes(1);
    });

    it('sem callback, o botão nem aparece, e o resto da tela continua de pé', () => {
      renderizar();
      expect(screen.queryByRole('button', { name: m.abrirPasta })).toBeNull();
      expect(screen.queryByText(m.abrirPastaMicro)).toBeNull();
      expect(screen.getByRole('link', { name: m.verProjeto })).toBeInTheDocument();
    });

    it('falha ao abrir vira alerta legível, sem derrubar a tela', () => {
      renderizar(undefined, { onAbrir: vi.fn(), erroAoAbrir: new Error('A pasta não está mais no disco.') });
      expect(screen.getByRole('alert')).toHaveTextContent('A pasta não está mais no disco.');
      expect(screen.getByText('D:\\dev\\kora\\meu-app')).toBeInTheDocument();
    });
  });
});
