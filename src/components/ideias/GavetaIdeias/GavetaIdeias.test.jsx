import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderizarComProvedores } from '../../../testes/renderizar.jsx';
import GavetaIdeias from './GavetaIdeias.jsx';
import { mensagens } from '../../../mensagens.js';
import { ErroApi } from '../../../services/api.js';

vi.mock('../../../services/ideias.js', () => ({
  listarIdeias: vi.fn(),
  registrarIdeia: vi.fn(),
  descartarIdeia: vi.fn(),
}));
import { listarIdeias, registrarIdeia, descartarIdeia } from '../../../services/ideias.js';

const m = mensagens.ideias;

const ideia = (extra = {}) => ({
  id: 'i1', titulo: 'uma ideia guardada', proximoPasso: null, origem: null,
  estado: 'aberta', criadoEm: '2026-09-08T12:00:00.000Z', ...extra,
});

const renderizar = (props = {}) => {
  const onFechar = vi.fn();
  const resultado = renderizarComProvedores(<GavetaIdeias aberta onFechar={onFechar} origem="/config" {...props} />);
  return { onFechar, ...resultado };
};

const escreverTitulo = (texto) => fireEvent.change(screen.getByLabelText(m.campoTitulo.rotulo), { target: { value: texto } });

beforeEach(() => {
  vi.clearAllMocks();
  listarIdeias.mockResolvedValue([]);
  registrarIdeia.mockResolvedValue(ideia());
  descartarIdeia.mockResolvedValue(ideia({ estado: 'descartada' }));
});

describe('abertura e fechamento', () => {
  it('fechada não renderiza nada', () => {
    renderizar({ aberta: false });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('aberta é um diálogo modal rotulado', () => {
    renderizar();
    const dialogo = screen.getByRole('dialog');
    expect(dialogo).toHaveAttribute('aria-modal', 'true');
    expect(dialogo).toHaveAccessibleName(m.titulo);
  });

  it('ao abrir, o foco vai para o campo de título', () => {
    renderizar();
    expect(screen.getByLabelText(m.campoTitulo.rotulo)).toHaveFocus();
  });

  it('Escape fecha', () => {
    const { onFechar } = renderizar();
    fireEvent.keyDown(globalThis, { key: 'Escape' });
    expect(onFechar).toHaveBeenCalled();
  });

  it('o botão de fechar fecha', () => {
    const { onFechar } = renderizar();
    fireEvent.click(screen.getByRole('button', { name: m.fechar }));
    expect(onFechar).toHaveBeenCalled();
  });

  it('clicar fora fecha, clicar dentro não', () => {
    const { onFechar } = renderizar();
    fireEvent.mouseDown(screen.getByRole('dialog'));
    expect(onFechar).not.toHaveBeenCalled();
    fireEvent.mouseDown(screen.getByRole('dialog').parentElement);
    expect(onFechar).toHaveBeenCalledTimes(1);
  });

  it('ao fechar, o foco volta para quem abriu', () => {
    const botao = globalThis.document.createElement('button');
    globalThis.document.body.appendChild(botao);
    botao.focus();
    expect(botao).toHaveFocus();

    const { unmount } = renderizar();
    expect(screen.getByLabelText(m.campoTitulo.rotulo)).toHaveFocus();

    unmount();
    expect(botao).toHaveFocus();
    botao.remove();
  });
});

describe('guardar', () => {
  it('só o título é obrigatório, e sem ele o botão não deixa gravar', () => {
    renderizar();
    expect(screen.getByRole('button', { name: m.guardar })).toBeDisabled();
    escreverTitulo('nova ideia');
    expect(screen.getByRole('button', { name: m.guardar })).toBeEnabled();
  });

  it('título só de espaços não conta como título', () => {
    renderizar();
    escreverTitulo('    ');
    expect(screen.getByRole('button', { name: m.guardar })).toBeDisabled();
  });

  it('grava com a origem de onde o usuário estava', async () => {
    renderizar();
    escreverTitulo('nova ideia');
    fireEvent.change(screen.getByLabelText(m.campoProximoPasso.rotulo), { target: { value: 'medir antes' } });
    fireEvent.click(screen.getByRole('button', { name: m.guardar }));

    await waitFor(() => expect(registrarIdeia).toHaveBeenCalledWith({
      titulo: 'nova ideia', proximoPasso: 'medir antes', origem: '/config',
    }));
  });

  it('gravar limpa os campos, confirma e mantém a gaveta aberta', async () => {
    const { onFechar } = renderizar();
    escreverTitulo('nova ideia');
    fireEvent.click(screen.getByRole('button', { name: m.guardar }));

    expect(await screen.findByRole('status')).toHaveTextContent(m.guardada);
    expect(screen.getByLabelText(m.campoTitulo.rotulo)).toHaveValue('');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(onFechar).not.toHaveBeenCalled();
  });

  it('erro ao gravar aparece legível e não apaga o que foi digitado', async () => {
    registrarIdeia.mockRejectedValue(new ErroApi('FORGE_OFFLINE', 'A API local não respondeu.'));
    renderizar();
    escreverTitulo('nova ideia');
    fireEvent.click(screen.getByRole('button', { name: m.guardar }));

    expect(await screen.findByRole('alert')).toHaveTextContent('A API local não respondeu.');
    expect(screen.getByLabelText(m.campoTitulo.rotulo)).toHaveValue('nova ideia');
  });
});

describe('lista', () => {
  it('mostra carregando antes de responder', () => {
    listarIdeias.mockReturnValue(new Promise(() => {}));
    renderizar();
    expect(screen.getByText(mensagens.estados.carregando)).toBeInTheDocument();
  });

  it('lista vazia diz que está vazia', async () => {
    renderizar();
    expect(await screen.findByText(m.vazio)).toBeInTheDocument();
  });

  it('mostra as ideias guardadas', async () => {
    listarIdeias.mockResolvedValue([ideia(), ideia({ id: 'i2', titulo: 'outra' })]);
    renderizar();
    expect(await screen.findByText('uma ideia guardada')).toBeInTheDocument();
    expect(screen.getByText('outra')).toBeInTheDocument();
  });

  it('erro na lista não derruba o formulário', async () => {
    listarIdeias.mockRejectedValue(new ErroApi('FORGE_OFFLINE', 'A API local não respondeu.'));
    renderizar();
    expect(await screen.findByRole('alert')).toHaveTextContent('A API local não respondeu.');
    expect(screen.getByRole('button', { name: m.guardar })).toBeInTheDocument();
  });

  it('descartar chama o serviço com o id da ideia', async () => {
    listarIdeias.mockResolvedValue([ideia()]);
    renderizar();
    fireEvent.click(await screen.findByRole('button', { name: m.descartarIdeia('uma ideia guardada') }));
    await waitFor(() => expect(descartarIdeia).toHaveBeenCalledWith('i1'));
  });
});
