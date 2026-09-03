import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { renderizarComProvedores } from '../../testes/renderizar.jsx';
import { mensagens } from '../../mensagens.js';
import { ErroApi } from '../../services/api.js';
import PaginaNovoProjeto from './PaginaNovoProjeto.jsx';

vi.mock('../../services/projetos.js', () => ({ criarProjeto: vi.fn() }));
vi.mock('../../services/presets.js', () => ({ listarPresets: vi.fn() }));
import { criarProjeto } from '../../services/projetos.js';
import { listarPresets } from '../../services/presets.js';

const m = mensagens.novoProjeto;
const presets = [
  { id: 'criar-site', nome: 'Criar Site', descricao: 'd', categoria: 'site', icone: 'globe', versao: 1, origem: 'builtin', etapas: ['identidade', 'materializar'] },
  { id: 'criar-aplicacao-web', nome: 'Criar Aplicação Web', descricao: 'd', categoria: 'aplicacao', icone: 'layers', versao: 1, origem: 'builtin', etapas: ['identidade', 'escopo', 'materializar'] },
];
const respostaCriacao = {
  projeto: { id: 'novo-1', nome: 'Café', slug: 'cafe', presetId: 'criar-site', presetNome: 'Criar Site', presetVersao: 1, status: 'rascunho', etapaAtual: 'identidade', caminhoDisco: null, criadoEm: '2026-09-02T00:00:00.000Z', atualizadoEm: '2026-09-02T00:00:00.000Z' },
  blueprint: { versao: 1, ativo: true, criadoEm: '2026-09-02T00:00:00.000Z', payload: { preset: { id: 'criar-site', versao: 1 }, etapaAtual: 'identidade', etapasConcluidas: [], assumidas: [], respostas: {} } },
};

function renderizar(rota = '/novo') {
  return renderizarComProvedores(
    <Routes>
      <Route path="/novo" element={<PaginaNovoProjeto />} />
      <Route path="/projetos/:id" element={<p>projeto aberto</p>} />
    </Routes>,
    { rota },
  );
}

beforeEach(() => {
  criarProjeto.mockReset();
  listarPresets.mockReset();
  listarPresets.mockResolvedValue(presets);
});

describe('PaginaNovoProjeto', () => {
  it('escolhe o menu, mostra o slug ao vivo, cria e navega para o projeto', async () => {
    criarProjeto.mockResolvedValue(respostaCriacao);
    renderizar();
    fireEvent.click(await screen.findByRole('button', { name: /Criar Site/ }));
    const nome = screen.getByLabelText(m.nome.rotulo);
    expect(nome).toHaveAccessibleDescription(`${m.nome.micro} ${m.nome.slug}: ${m.nome.slugVazio}.`);
    expect(screen.getByRole('button', { name: m.criar })).toBeDisabled();
    fireEvent.change(nome, { target: { value: 'Café da Manhã' } });
    expect(nome).toHaveAccessibleDescription(`${m.nome.micro} ${m.nome.slug}: cafe-da-manha.`);
    fireEvent.click(screen.getByRole('button', { name: m.criar }));
    expect(await screen.findByText('projeto aberto')).toBeInTheDocument();
    expect(criarProjeto.mock.calls[0][0]).toEqual({ nome: 'Café da Manhã', presetId: 'criar-site' });
  });

  it('?preset= pré-seleciona o menu e "trocar menu" volta para a grade', async () => {
    renderizar('/novo?preset=criar-aplicacao-web');
    expect(await screen.findByText('Criar Aplicação Web')).toBeInTheDocument();
    expect(screen.getByLabelText(m.nome.rotulo)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: m.trocar }));
    expect(await screen.findByRole('button', { name: /Criar Site/ })).toBeInTheDocument();
  });

  it('erro do servidor no nome aparece junto do campo', async () => {
    criarProjeto.mockRejectedValue(new ErroApi('FORGE_VALIDATION', 'Entrada fora do contrato.', { issues: [{ caminho: 'nome', mensagem: 'Já existe um projeto com o slug "cafe".' }] }, 400));
    renderizar('/novo?preset=criar-site');
    const nome = await screen.findByLabelText(m.nome.rotulo);
    fireEvent.change(nome, { target: { value: 'Café' } });
    fireEvent.click(screen.getByRole('button', { name: m.criar }));
    expect(await screen.findByRole('alert')).toHaveTextContent('slug "cafe"');
    expect(nome).toHaveAttribute('aria-invalid', 'true');
  });
});
