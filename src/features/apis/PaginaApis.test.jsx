import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderizarComProvedores } from '../../testes/renderizar.jsx';
import PaginaApis from './PaginaApis.jsx';
import { mensagens } from '../../mensagens.js';

vi.mock('../../services/conexoes.js', () => ({ obterCofre: vi.fn(), criarCofre: vi.fn(), destrancarCofre: vi.fn(), listarConexoes: vi.fn(), criarConexao: vi.fn(), testarConexao: vi.fn() }));
import { obterCofre, criarCofre, listarConexoes, criarConexao, testarConexao } from '../../services/conexoes.js';

beforeEach(() => {
  vi.resetAllMocks();
  listarConexoes.mockResolvedValue([]);
});

describe('PaginaApis', () => {
  it('cria o cofre com campos de senha mascarados', async () => {
    obterCofre.mockResolvedValue({ estado: 'ausente' });
    criarCofre.mockResolvedValue({ estado: 'destrancado' });
    renderizarComProvedores(<PaginaApis />);
    const senhas = await screen.findAllByLabelText(mensagens.apis.senha);
    expect(senhas[0]).toHaveAttribute('type', 'password');
    fireEvent.change(senhas[0], { target: { value: 'uma senha mestre forte' } });
    fireEvent.change(screen.getByLabelText(mensagens.apis.confirmacao), { target: { value: 'uma senha mestre forte' } });
    fireEvent.click(screen.getByRole('button', { name: mensagens.apis.criarCofre }));
    await waitFor(() => expect(criarCofre).toHaveBeenCalledWith({ senha: 'uma senha mestre forte', confirmacao: 'uma senha mestre forte' }));
  });

  it('guarda conexão genérica e limpa a chave depois do sucesso', async () => {
    obterCofre.mockResolvedValue({ estado: 'destrancado' });
    criarConexao.mockResolvedValue({ id: '00000000-0000-4000-8000-000000000000' });
    renderizarComProvedores(<PaginaApis />);
    const preencher = async (rotulo, valor) => fireEvent.change(await screen.findByLabelText(rotulo), { target: { value: valor } });
    await preencher(mensagens.apis.alias, 'minha api');
    await preencher(mensagens.apis.provedor, 'Provedor livre');
    await preencher(mensagens.apis.tipo, 'Mensagens');
    const chave = await screen.findByLabelText(mensagens.apis.chave);
    expect(chave).toHaveAttribute('type', 'password');
    fireEvent.change(chave, { target: { value: 'segredo-nao-mostrar' } });
    fireEvent.click(screen.getByRole('button', { name: mensagens.apis.conectar }));
    await waitFor(() => expect(criarConexao).toHaveBeenCalledWith({ alias: 'minha api', provedor: 'Provedor livre', tipo: 'Mensagens', endpoint: undefined, urlTeste: undefined, cabecalhoChave: 'Authorization', prefixoChave: 'Bearer ', chave: 'segredo-nao-mostrar' }));
    expect(chave).toHaveValue('');
  });

  it('explica quando a sessão do cofre não pode ser carregada', async () => {
    obterCofre.mockRejectedValue(new Error('sessão expirada'));
    renderizarComProvedores(<PaginaApis />);
    expect(await screen.findByRole('alert')).toHaveTextContent(mensagens.apis.erroCarregar);
    expect(screen.getByRole('button', { name: mensagens.estados.tentarDeNovo })).toBeInTheDocument();
  });

  it('só testa uma conexão quando a pessoa aciona o botão', async () => {
    obterCofre.mockResolvedValue({ estado: 'destrancado' });
    listarConexoes.mockResolvedValue([{ id: '00000000-0000-4000-8000-000000000000', alias: 'minha api', provedor: 'Livre', tipo: 'IA', urlTeste: 'https://api.exemplo.test/health', status: 'pendente' }]);
    testarConexao.mockResolvedValue({ resultado: 'sucesso' });
    renderizarComProvedores(<PaginaApis />);
    const botao = await screen.findByRole('button', { name: mensagens.apis.testar });
    expect(testarConexao).not.toHaveBeenCalled();
    fireEvent.click(botao);
    await waitFor(() => expect(testarConexao).toHaveBeenCalledWith('00000000-0000-4000-8000-000000000000'));
  });
});
