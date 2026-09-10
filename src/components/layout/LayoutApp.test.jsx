import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { renderizarComProvedores } from '../../testes/renderizar.jsx';
import LayoutApp from './LayoutApp.jsx';
import { mensagens } from '../../mensagens.js';

vi.mock('../../services/health.js', () => ({ obterHealth: vi.fn() }));
vi.mock('../../services/ideias.js', () => ({
  listarIdeias: vi.fn(),
  registrarIdeia: vi.fn(),
  descartarIdeia: vi.fn(),
}));
import { obterHealth } from '../../services/health.js';
import { listarIdeias, registrarIdeia } from '../../services/ideias.js';

const m = mensagens.ideias;

const ideia = (extra = {}) => ({
  id: 'i1', titulo: 'uma ideia', proximoPasso: null, origem: null,
  estado: 'aberta', criadoEm: '2026-09-08T12:00:00.000Z', ...extra,
});

// Uma tela qualquer no lugar do Outlet, com um campo de texto, para provar que o atalho respeita
// quem está digitando.
function TelaQualquer() {
  return (
    <div>
      <p>conteúdo da tela</p>
      <label htmlFor="campo-da-tela">Campo da tela</label>
      <input id="campo-da-tela" />
    </div>
  );
}

const renderizar = (rota = '/config') => renderizarComProvedores(
  <Routes>
    <Route element={<LayoutApp />}>
      <Route path="/" element={<TelaQualquer />} />
      <Route path="/config" element={<TelaQualquer />} />
    </Route>
  </Routes>,
  { rota },
);

const atalho = (extra = {}) => fireEvent.keyDown(globalThis, { key: 'i', ctrlKey: true, ...extra });

beforeEach(() => {
  vi.clearAllMocks();
  obterHealth.mockResolvedValue({ ok: true, versao: '0.1.0' });
  listarIdeias.mockResolvedValue([]);
  registrarIdeia.mockResolvedValue(ideia());
});

describe('gaveta de ideias no layout', () => {
  it('não aparece antes de ser chamada', () => {
    renderizar();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('o botão da barra lateral abre a gaveta', () => {
    renderizar();
    fireEvent.click(screen.getByRole('button', { name: mensagens.menu.ideias }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('Ctrl+I abre a gaveta', () => {
    renderizar();
    atalho();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('abre de qualquer tela', () => {
    renderizar('/');
    atalho();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('o atalho não dispara enquanto o usuário digita num campo da tela', () => {
    renderizar();
    const campo = screen.getByLabelText('Campo da tela');
    campo.focus();
    fireEvent.keyDown(campo, { key: 'i', ctrlKey: true, bubbles: true });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('Escape fecha e devolve o foco ao botão que abriu', () => {
    renderizar();
    const botao = screen.getByRole('button', { name: mensagens.menu.ideias });
    botao.focus();
    fireEvent.click(botao);
    expect(screen.getByLabelText(m.campoTitulo.rotulo)).toHaveFocus();

    fireEvent.keyDown(globalThis, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(botao).toHaveFocus();
  });

  it('guardar uma ideia não muda de tela nem fecha a gaveta', async () => {
    renderizar('/config');
    atalho();
    fireEvent.change(screen.getByLabelText(m.campoTitulo.rotulo), { target: { value: 'nova ideia' } });
    fireEvent.click(screen.getByRole('button', { name: m.guardar }));

    // A origem gravada é a rota de onde o usuário chamou a gaveta.
    await waitFor(() => expect(registrarIdeia).toHaveBeenCalledWith(expect.objectContaining({ origem: '/config' })));
    expect(screen.getByText('conteúdo da tela')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('a barra lateral mostra o atalho, para ele ser descobrível', () => {
    renderizar();
    expect(screen.getByText(m.atalho)).toBeInTheDocument();
  });
});
