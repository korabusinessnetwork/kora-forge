import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { renderizarComProvedores } from '../../testes/renderizar.jsx';
import { mensagens } from '../../mensagens.js';
import { ErroApi } from '../../services/api.js';
import PaginaProjeto from './PaginaProjeto.jsx';

vi.mock('../../services/projetos.js', () => ({ obterProjeto: vi.fn(), atualizarProjeto: vi.fn(), listarVersoesBlueprint: vi.fn() }));
vi.mock('../../services/presets.js', () => ({ obterPreset: vi.fn() }));
import { obterProjeto, atualizarProjeto, listarVersoesBlueprint } from '../../services/projetos.js';
import { obterPreset } from '../../services/presets.js';

const m = mensagens.projeto;
const dados = (extra = {}) => ({
  projeto: { id: 'p1', nome: 'Alfa', slug: 'alfa', presetId: 'criar-site', presetNome: 'Criar Site', presetVersao: 1, status: 'rascunho', etapaAtual: 'identidade', caminhoDisco: null, criadoEm: '2026-09-02T00:00:00.000Z', atualizadoEm: '2026-09-02T00:00:00.000Z', ...extra },
  blueprint: { versao: 2, ativo: true, criadoEm: '2026-09-02T00:00:00.000Z', payload: { preset: { id: 'criar-site', versao: 1 }, etapaAtual: 'escopo', etapasConcluidas: ['identidade'], assumidas: [], respostas: {} } },
});
const renderizar = () => renderizarComProvedores(
  <Routes><Route path="/projetos/:id" element={<PaginaProjeto />} /></Routes>,
  { rota: '/projetos/p1' },
);

beforeEach(() => {
  obterProjeto.mockReset();
  atualizarProjeto.mockReset();
  listarVersoesBlueprint.mockReset();
  listarVersoesBlueprint.mockResolvedValue([{ versao: 2, ativo: true, criadoEm: '2026-09-02T00:00:00.000Z' }, { versao: 1, ativo: false, criadoEm: '2026-09-01T00:00:00.000Z' }]);
  obterPreset.mockReset();
  obterPreset.mockResolvedValue({ id: 'criar-site', etapas: ['identidade', 'escopo', 'design', 'seguranca', 'fundacao', 'materializar'] });
});

describe('PaginaProjeto', () => {
  it('mostra nome, selo, menu, etapa, pasta ausente e versões', async () => {
    obterProjeto.mockResolvedValue(dados());
    renderizar();
    expect(await screen.findByRole('heading', { level: 1, name: 'Alfa' })).toBeInTheDocument();
    expect(screen.getByText(mensagens.selo.rascunho)).toBeInTheDocument();
    expect(screen.getByText('Criar Site')).toBeInTheDocument();
    expect(screen.getByText(mensagens.etapas.escopo)).toBeInTheDocument();
    expect(screen.getByText(m.semCaminho)).toBeInTheDocument();
    expect(await screen.findByText(m.versaoAtiva)).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('renomeia inline e mantém o slug', async () => {
    obterProjeto.mockResolvedValue(dados());
    atualizarProjeto.mockResolvedValue(dados({ nome: 'Alfa Dois' }));
    renderizar();
    fireEvent.click(await screen.findByRole('button', { name: m.renomear }));
    const campo = screen.getByLabelText(m.nome.rotulo);
    fireEvent.change(campo, { target: { value: 'Alfa Dois' } });
    fireEvent.click(screen.getByRole('button', { name: m.salvarNome }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Alfa Dois' })).toBeInTheDocument();
    expect(atualizarProjeto.mock.calls[0]).toEqual(['p1', { nome: 'Alfa Dois' }]);
  });

  it('arquiva e depois oferece restaurar', async () => {
    obterProjeto.mockResolvedValue(dados());
    atualizarProjeto.mockResolvedValue(dados({ status: 'arquivado' }));
    renderizar();
    fireEvent.click(await screen.findByRole('button', { name: m.arquivar }));
    expect(await screen.findByRole('button', { name: m.restaurar })).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent(m.arquivado);
    expect(atualizarProjeto.mock.calls[0]).toEqual(['p1', { arquivado: true }]);
  });

  it('projeto inexistente vira estado de erro com link de volta', async () => {
    obterProjeto.mockRejectedValue(new ErroApi('FORGE_NOT_FOUND', 'Projeto não encontrado.', {}, 404));
    renderizar();
    expect(await screen.findByRole('alert')).toHaveTextContent(m.naoEncontrado);
    expect(screen.getByRole('link', { name: m.voltar })).toHaveAttribute('href', '/');
  });

  it('erro genérico ao atualizar aparece como alerta', async () => {
    obterProjeto.mockResolvedValue(dados());
    atualizarProjeto.mockRejectedValue(new ErroApi('FORGE_OFFLINE', 'A API local não respondeu.'));
    renderizar();
    fireEvent.click(await screen.findByRole('button', { name: m.arquivar }));
    expect(await screen.findByRole('alert')).toHaveTextContent('A API local não respondeu.');
  });
});

describe('entrada do wizard', () => {
  it('sem nada respondido oferece começar, com progresso zerado', async () => {
    const base = dados();
    obterProjeto.mockResolvedValue({ ...base, blueprint: { ...base.blueprint, payload: { ...base.blueprint.payload, etapasConcluidas: [], assumidas: [] } } });
    renderizar();
    const link = await screen.findByRole('link', { name: m.comecar });
    expect(link).toHaveAttribute('href', '/projetos/p1/wizard');
    expect(await screen.findByText(m.progresso(0, 6))).toBeInTheDocument();
  });

  it('com etapas feitas oferece continuar e conta concluídas mais assumidas', async () => {
    const base = dados();
    obterProjeto.mockResolvedValue({
      ...base,
      blueprint: { ...base.blueprint, payload: { ...base.blueprint.payload, etapasConcluidas: ['identidade', 'escopo'], assumidas: ['design'] } },
    });
    renderizar();
    expect(await screen.findByRole('link', { name: m.continuar })).toHaveAttribute('href', '/projetos/p1/wizard');
    expect(await screen.findByText(m.progresso(3, 6))).toBeInTheDocument();
  });

  it('projeto arquivado não oferece o wizard', async () => {
    obterProjeto.mockResolvedValue(dados({ status: 'arquivado' }));
    renderizar();
    await screen.findByRole('button', { name: m.restaurar });
    expect(screen.queryByRole('link', { name: m.comecar })).toBeNull();
    expect(screen.queryByRole('link', { name: m.continuar })).toBeNull();
  });
});
