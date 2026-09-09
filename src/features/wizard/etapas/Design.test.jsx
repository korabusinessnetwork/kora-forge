import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { TOKENS_PADRAO } from '@shared/schemas/design.js';
import { renderizarComProvedores } from '../../../testes/renderizar.jsx';
import Design from './Design.jsx';
import { mensagens } from '../../../mensagens.js';
import { ErroApi } from '../../../services/api.js';

vi.mock('../../../services/design.js', () => ({ obterDesign: vi.fn(), salvarDesign: vi.fn() }));
import { obterDesign, salvarDesign } from '../../../services/design.js';

const m = mensagens.design;
const projeto = { id: 'p1', nome: 'Alfa' };
const documento = (extra = {}) => ({ versao: 0, tokens: { ...TOKENS_PADRAO }, paginas: [], criadoEm: null, ...extra });
const renderizar = () => renderizarComProvedores(<Design projeto={projeto} />);

beforeEach(() => {
  vi.clearAllMocks();
  obterDesign.mockResolvedValue(documento());
  salvarDesign.mockImplementation(async (_id, tokens) => documento({ versao: 1, tokens, criadoEm: '2026-09-08T00:00:00.000Z' }));
});

describe('estados', () => {
  it('mostra carregando antes de responder', () => {
    obterDesign.mockReturnValue(new Promise(() => {}));
    renderizar();
    expect(screen.getByRole('status')).toHaveTextContent(mensagens.estados.carregando);
  });

  it('erro ao buscar oferece tentar de novo', async () => {
    obterDesign.mockRejectedValue(new ErroApi('FORGE_OFFLINE', 'A API local não respondeu.'));
    renderizar();
    expect(await screen.findByRole('alert')).toHaveTextContent('A API local não respondeu.');
    expect(screen.getByRole('button', { name: mensagens.estados.tentarDeNovo })).toBeInTheDocument();
  });
});

describe('editar e salvar', () => {
  it('sem mudança, salvar não é oferecido', async () => {
    renderizar();
    expect(await screen.findByRole('button', { name: m.salvar })).toBeDisabled();
  });

  it('editar libera salvar e avisa que há mudança pendente', async () => {
    renderizar();
    fireEvent.change(await screen.findByLabelText('Acento'), { target: { value: '#ff0000' } });

    expect(screen.getByRole('button', { name: m.salvar })).toBeEnabled();
    expect(screen.getByText(m.semSalvar)).toBeInTheDocument();
  });

  it('editar muda o preview na hora, sem salvar', async () => {
    renderizar();
    fireEvent.change(await screen.findByLabelText('Acento'), { target: { value: '#ff0000' } });

    expect(screen.getByTestId('palco-preview').getAttribute('style')).toContain('--cor-acento: #ff0000');
    expect(salvarDesign).not.toHaveBeenCalled();
  });

  it('salvar manda os tokens e confirma', async () => {
    renderizar();
    fireEvent.change(await screen.findByLabelText('Acento'), { target: { value: '#ff0000' } });
    fireEvent.click(screen.getByRole('button', { name: m.salvar }));

    await waitFor(() => expect(salvarDesign).toHaveBeenCalledWith('p1', expect.objectContaining({ COR_ACENTO: '#ff0000' })));
    expect(await screen.findByText(m.salvo)).toBeInTheDocument();
  });

  it('erro ao salvar aparece legível e não perde o que foi editado', async () => {
    salvarDesign.mockRejectedValue(new ErroApi('FORGE_VALIDATION', 'Entrada fora do contrato.', {
      issues: [{ caminho: 'COR_ACENTO', mensagem: 'Acento espera uma cor, como #2f6fed.' }],
    }));
    renderizar();
    fireEvent.change(await screen.findByLabelText('Acento'), { target: { value: 'vermelho' } });
    fireEvent.click(screen.getByRole('button', { name: m.salvar }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Acento espera uma cor');
    expect(screen.getByLabelText('Acento')).toHaveValue('vermelho');
  });

  it('voltar tudo ao padrão limpa as mudanças na tela', async () => {
    obterDesign.mockResolvedValue(documento({ versao: 1, tokens: { ...TOKENS_PADRAO, COR_ACENTO: '#ff0000' }, criadoEm: 'x' }));
    renderizar();
    expect(await screen.findByLabelText('Acento')).toHaveValue('#ff0000');

    fireEvent.click(screen.getByRole('button', { name: m.restaurarTudo }));
    expect(screen.getByLabelText('Acento')).toHaveValue(TOKENS_PADRAO.COR_ACENTO);
  });
});
