import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderizarComProvedores } from '../../testes/renderizar.jsx';
import { mensagens } from '../../mensagens.js';
import { ErroApi } from '../../services/api.js';
import PaginaConfig from './PaginaConfig.jsx';

vi.mock('../../services/settings.js', () => ({ obterSettings: vi.fn(), atualizarSettings: vi.fn() }));
import { obterSettings, atualizarSettings } from '../../services/settings.js';

const m = mensagens.config;
const padrao = { workspace: null, tema: 'escuro', copilotoTetoUsd: 5 };

beforeEach(() => {
  obterSettings.mockReset();
  atualizarSettings.mockReset();
  obterSettings.mockResolvedValue(padrao);
});

describe('PaginaConfig', () => {
  it('carrega e mostra os valores atuais', async () => {
    renderizarComProvedores(<PaginaConfig />);
    expect(await screen.findByLabelText(m.workspace.rotulo)).toHaveValue('');
    expect(screen.getByLabelText(m.tema.rotulo)).toHaveValue('escuro');
    expect(screen.getByLabelText(m.teto.rotulo)).toHaveValue(5);
  });

  it('erro de validação do servidor aparece junto do campo', async () => {
    atualizarSettings.mockRejectedValue(new ErroApi('FORGE_VALIDATION', 'Entrada fora do contrato.', {
      issues: [{ caminho: 'workspace', mensagem: 'Essa pasta não existe. Crie a pasta e tente de novo.' }],
    }, 400));
    renderizarComProvedores(<PaginaConfig />);
    const campo = await screen.findByLabelText(m.workspace.rotulo);
    fireEvent.change(campo, { target: { value: '/nao/existe' } });
    fireEvent.click(screen.getByRole('button', { name: m.salvar }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Essa pasta não existe');
    expect(campo).toHaveAttribute('aria-invalid', 'true');
    expect(atualizarSettings).toHaveBeenCalledTimes(1);
    expect(atualizarSettings.mock.calls[0][0]).toEqual({ workspace: '/nao/existe', tema: 'escuro', copilotoTetoUsd: 5 });
  });

  it('sucesso dá feedback textual e mostra o valor normalizado pelo servidor', async () => {
    atualizarSettings.mockResolvedValue({ ...padrao, workspace: '/tmp/ws' });
    renderizarComProvedores(<PaginaConfig />);
    const campo = await screen.findByLabelText(m.workspace.rotulo);
    fireEvent.change(campo, { target: { value: '/tmp/ws/' } });
    fireEvent.click(screen.getByRole('button', { name: m.salvar }));
    expect(await screen.findByRole('status')).toHaveTextContent(m.salvo);
    expect(campo).toHaveValue('/tmp/ws');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('teto inválido é barrado no cliente sem chamar a API', async () => {
    renderizarComProvedores(<PaginaConfig />);
    const teto = await screen.findByLabelText(m.teto.rotulo);
    fireEvent.change(teto, { target: { value: '-3' } });
    fireEvent.click(screen.getByRole('button', { name: m.salvar }));
    expect(await screen.findByRole('alert')).toHaveTextContent(m.teto.invalido);
    expect(atualizarSettings).not.toHaveBeenCalled();
  });

  it('erro genérico do servidor aparece como alerta geral', async () => {
    atualizarSettings.mockRejectedValue(new ErroApi('FORGE_OFFLINE', 'A API local não respondeu.'));
    renderizarComProvedores(<PaginaConfig />);
    await screen.findByLabelText(m.workspace.rotulo);
    fireEvent.click(screen.getByRole('button', { name: m.salvar }));
    expect(await screen.findByRole('alert')).toHaveTextContent('A API local não respondeu.');
  });

  it('erro ao carregar mostra alerta e tentar de novo', async () => {
    obterSettings.mockRejectedValueOnce(new Error('caiu')).mockResolvedValueOnce(padrao);
    renderizarComProvedores(<PaginaConfig />);
    expect(await screen.findByRole('alert')).toHaveTextContent('caiu');
    fireEvent.click(screen.getByRole('button', { name: mensagens.estados.tentarDeNovo }));
    expect(await screen.findByLabelText(m.workspace.rotulo)).toBeInTheDocument();
  });
});
