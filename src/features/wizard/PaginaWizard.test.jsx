import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { renderizarComProvedores } from '../../testes/renderizar.jsx';
import { mensagens } from '../../mensagens.js';
import { ErroApi } from '../../services/api.js';
import PaginaWizard from './PaginaWizard.jsx';

vi.mock('../../services/projetos.js', () => ({ obterProjeto: vi.fn(), salvarBlueprint: vi.fn(), atualizarProjeto: vi.fn() }));
vi.mock('../../services/presets.js', () => ({ obterPreset: vi.fn() }));
import { obterProjeto, salvarBlueprint, atualizarProjeto } from '../../services/projetos.js';
import { obterPreset } from '../../services/presets.js';

const m = mensagens.wizard;
const ETAPAS_SITE = ['identidade', 'escopo', 'design', 'seguranca', 'fundacao', 'materializar'];

const preset = {
  id: 'criar-site', nome: 'Criar Site', descricao: 'd', versao: 1, categoria: 'site', icone: 'globe',
  etapas: ETAPAS_SITE, defaults: { modelo_arquitetura: 'A', stack: ['react'], multi_tenant: false, white_label: true, auth: false, deploy: 'vercel' },
  arvore: [], regras_extras: [], skills: [], mcps: [], requisitos: [], comandos: [], definition_of_done: [],
};

const projeto = (extra = {}) => ({
  id: 'p1', nome: 'Alfa', slug: 'alfa', presetId: 'criar-site', presetNome: 'Criar Site', presetVersao: 1,
  status: 'rascunho', etapaAtual: 'identidade', caminhoDisco: null,
  criadoEm: '2026-09-03T00:00:00.000Z', atualizadoEm: '2026-09-03T00:00:00.000Z', ...extra,
});

const blueprint = (payload = {}) => ({
  versao: 1, ativo: true, criadoEm: '2026-09-03T00:00:00.000Z',
  payload: { preset: { id: 'criar-site', versao: 1 }, etapaAtual: 'identidade', etapasConcluidas: [], assumidas: [], respostas: {}, ...payload },
});

// Blueprint de um wizard já percorrido: todas as respostas gravadas com os defaults do preset.
const RESPOSTAS_COMPLETAS = {
  identidade: { nome: 'Alfa', essencia: '', problema: '', valor: '' },
  escopo: { publico: '', personas: [], ahaMoment: '', naoObjetivos: [] },
  design: {},
  seguranca: { dadoPessoal: false, dadoFinanceiro: false, compliance: [], tierGratuito: true, observacoes: '' },
  fundacao: { observacoes: '' },
  materializar: { confirmada: false },
};

function renderizar(rota) {
  return renderizarComProvedores(
    <Routes>
      <Route path="/projetos/:id/wizard" element={<PaginaWizard />} />
      <Route path="/projetos/:id/wizard/:etapa" element={<PaginaWizard />} />
      <Route path="/projetos/:id" element={<p>tela do projeto</p>} />
    </Routes>,
    { rota },
  );
}

beforeEach(() => {
  obterProjeto.mockReset();
  salvarBlueprint.mockReset();
  atualizarProjeto.mockReset();
  obterPreset.mockReset();
  obterPreset.mockResolvedValue(preset);
  obterProjeto.mockResolvedValue({ projeto: projeto(), blueprint: blueprint() });
  salvarBlueprint.mockImplementation(async (_id, payload) => ({ projeto: projeto(), blueprint: { ...blueprint(payload), versao: 2 } }));
  atualizarProjeto.mockImplementation(async (_id, patch) => ({ projeto: projeto(patch), blueprint: blueprint() }));
});

describe('retomada e rota', () => {
  it('sem etapa na URL abre a etapa em que parou', async () => {
    obterProjeto.mockResolvedValue({ projeto: projeto(), blueprint: blueprint({ etapaAtual: 'seguranca' }) });
    renderizar('/projetos/p1/wizard');
    expect(await screen.findByRole('heading', { level: 1, name: m.passos.seguranca.titulo })).toBeInTheDocument();
    expect(screen.getByText(m.etapaXdeY(4, 6))).toBeInTheDocument();
  });

  it('etapa fora do preset volta para a etapa em que parou', async () => {
    obterProjeto.mockResolvedValue({ projeto: projeto(), blueprint: blueprint({ etapaAtual: 'escopo' }) });
    renderizar('/projetos/p1/wizard/dados');
    expect(await screen.findByRole('heading', { level: 1, name: m.passos.escopo.titulo })).toBeInTheDocument();
  });

  it('projeto arquivado não abre o wizard', async () => {
    obterProjeto.mockResolvedValue({ projeto: projeto({ status: 'arquivado' }), blueprint: blueprint() });
    renderizar('/projetos/p1/wizard');
    expect(await screen.findByRole('alert')).toHaveTextContent(m.arquivado.texto);
    expect(salvarBlueprint).not.toHaveBeenCalled();
  });

  it('projeto inexistente mostra erro com volta para o Registry', async () => {
    obterProjeto.mockRejectedValue(new ErroApi('FORGE_NOT_FOUND', 'Projeto não encontrado.', {}, 404));
    renderizar('/projetos/p1/wizard');
    expect(await screen.findByRole('alert')).toHaveTextContent(mensagens.projeto.naoEncontrado);
  });
});

describe('avançar, pular e concluir', () => {
  it('avançar com os obrigatórios preenchidos marca a etapa como concluída e salva', async () => {
    renderizar('/projetos/p1/wizard/identidade');
    fireEvent.change(await screen.findByLabelText(m.passos.identidade.essencia.rotulo), { target: { value: 'uma bancada local' } });
    fireEvent.change(screen.getByLabelText(m.passos.identidade.problema.rotulo), { target: { value: 'começar custa caro' } });
    fireEvent.change(screen.getByLabelText(m.passos.identidade.valor.rotulo), { target: { value: 'o método vira trilho' } });
    fireEvent.click(screen.getByRole('button', { name: m.avancar }));

    await waitFor(() => expect(salvarBlueprint).toHaveBeenCalledTimes(1));
    const payload = salvarBlueprint.mock.calls[0][1];
    expect(payload.etapaAtual).toBe('escopo');
    expect(payload.etapasConcluidas).toEqual(['identidade']);
    expect(payload.assumidas).toEqual([]);
    expect(payload.respostas.identidade).toEqual({ nome: 'Alfa', essencia: 'uma bancada local', problema: 'começar custa caro', valor: 'o método vira trilho' });
    expect(await screen.findByRole('heading', { level: 1, name: m.passos.escopo.titulo })).toBeInTheDocument();
  });

  it('avançar com obrigatório em branco não marca concluída e não bloqueia', async () => {
    renderizar('/projetos/p1/wizard/identidade');
    fireEvent.click(await screen.findByRole('button', { name: m.avancar }));
    await waitFor(() => expect(salvarBlueprint).toHaveBeenCalledTimes(1));
    expect(salvarBlueprint.mock.calls[0][1].etapasConcluidas).toEqual([]);
    expect(await screen.findByRole('heading', { level: 1, name: m.passos.escopo.titulo })).toBeInTheDocument();
  });

  it('nome apagado na identidade dá erro no campo e não salva', async () => {
    renderizar('/projetos/p1/wizard/identidade');
    fireEvent.change(await screen.findByLabelText(m.passos.identidade.nome.rotulo), { target: { value: '  ' } });
    fireEvent.click(screen.getByRole('button', { name: m.avancar }));
    expect(await screen.findByRole('alert')).toHaveTextContent(m.passos.identidade.nomeVazio);
    expect(salvarBlueprint).not.toHaveBeenCalled();
  });

  it('nome mudado na identidade renomeia o projeto ao avançar', async () => {
    renderizar('/projetos/p1/wizard/identidade');
    fireEvent.change(await screen.findByLabelText(m.passos.identidade.nome.rotulo), { target: { value: 'Alfa Dois' } });
    fireEvent.click(screen.getByRole('button', { name: m.avancar }));
    await waitFor(() => expect(atualizarProjeto).toHaveBeenCalledWith('p1', { nome: 'Alfa Dois' }));
    expect(salvarBlueprint.mock.calls[0][1].respostas.identidade.nome).toBe('Alfa Dois');
  });

  it('pular marca a etapa como assumida, aplica o default e avança', async () => {
    obterProjeto.mockResolvedValue({ projeto: projeto(), blueprint: blueprint({ etapaAtual: 'seguranca', respostas: { seguranca: { tierGratuito: false, observacoes: 'algo' } } }) });
    renderizar('/projetos/p1/wizard/seguranca');
    fireEvent.click(await screen.findByRole('button', { name: m.pular }));
    await waitFor(() => expect(salvarBlueprint).toHaveBeenCalledTimes(1));
    const payload = salvarBlueprint.mock.calls[0][1];
    expect(payload.assumidas).toEqual(['seguranca']);
    expect(payload.etapasConcluidas).not.toContain('seguranca');
    expect(payload.respostas.seguranca).toEqual({ dadoPessoal: false, dadoFinanceiro: false, compliance: [], tierGratuito: true, observacoes: '' });
    expect(payload.etapaAtual).toBe('fundacao');
  });

  it('identidade e materializar não oferecem pular', async () => {
    renderizar('/projetos/p1/wizard/identidade');
    expect(await screen.findByRole('button', { name: m.avancar })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: m.pular })).toBeNull();
  });

  it('concluir sem ter mudado nada volta ao projeto sem criar versão', async () => {
    obterProjeto.mockResolvedValue({
      projeto: projeto({ etapaAtual: 'materializar' }),
      blueprint: blueprint({ etapaAtual: 'materializar', etapasConcluidas: ['identidade', 'materializar'], assumidas: ['design'], respostas: RESPOSTAS_COMPLETAS }),
    });
    renderizar('/projetos/p1/wizard/materializar');
    fireEvent.click(await screen.findByRole('button', { name: m.concluir }));
    expect(await screen.findByText('tela do projeto')).toBeInTheDocument();
    expect(salvarBlueprint).not.toHaveBeenCalled();
    expect(atualizarProjeto).not.toHaveBeenCalled();
  });

  it('concluir depois de mudar algo salva e volta ao projeto', async () => {
    obterProjeto.mockResolvedValue({
      projeto: projeto({ etapaAtual: 'materializar' }),
      blueprint: blueprint({ etapaAtual: 'materializar', etapasConcluidas: ['identidade', 'materializar'], assumidas: ['design'], respostas: RESPOSTAS_COMPLETAS }),
    });
    renderizar('/projetos/p1/wizard/materializar');
    fireEvent.change(await screen.findByLabelText(m.passos.materializar.confirmada.rotulo), { target: { value: 'sim' } });
    fireEvent.click(screen.getByRole('button', { name: m.concluir }));
    await waitFor(() => expect(salvarBlueprint).toHaveBeenCalledTimes(1));
    expect(salvarBlueprint.mock.calls[0][1].respostas.materializar).toEqual({ confirmada: true });
    expect(await screen.findByText('tela do projeto')).toBeInTheDocument();
  });
});

describe('trilha e volta', () => {
  it('voltar preserva o que foi digitado e salva antes de sair da etapa', async () => {
    obterProjeto.mockResolvedValue({ projeto: projeto(), blueprint: blueprint({ etapaAtual: 'escopo' }) });
    renderizar('/projetos/p1/wizard/escopo');
    fireEvent.change(await screen.findByLabelText(m.passos.escopo.publico.rotulo), { target: { value: 'devs da Kora' } });
    fireEvent.click(screen.getByRole('button', { name: m.voltar }));
    await waitFor(() => expect(salvarBlueprint).toHaveBeenCalledTimes(1));
    expect(salvarBlueprint.mock.calls[0][1].respostas.escopo.publico).toBe('devs da Kora');
    expect(salvarBlueprint.mock.calls[0][1].etapaAtual).toBe('identidade');
    expect(await screen.findByRole('heading', { level: 1, name: m.passos.identidade.titulo })).toBeInTheDocument();
  });

  it('a trilha navega para etapa já vista e não deixa pular à frente', async () => {
    obterProjeto.mockResolvedValue({ projeto: projeto(), blueprint: blueprint({ etapaAtual: 'design', etapasConcluidas: ['identidade'] }) });
    renderizar('/projetos/p1/wizard/design');
    const trilha = await screen.findByRole('navigation', { name: m.trilha });
    const itens = trilha.querySelectorAll('button');
    expect(itens[5]).toBeDisabled();
    fireEvent.click(itens[0]);
    expect(await screen.findByRole('heading', { level: 1, name: m.passos.identidade.titulo })).toBeInTheDocument();
  });

  it('etapa futura só oferece continuar e é marcada como assumida', async () => {
    obterProjeto.mockResolvedValue({ projeto: projeto(), blueprint: blueprint({ etapaAtual: 'design' }) });
    renderizar('/projetos/p1/wizard/design');
    expect(await screen.findByText(m.passos.futura.design.texto)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: m.pular }));
    await waitFor(() => expect(salvarBlueprint).toHaveBeenCalledTimes(1));
    expect(salvarBlueprint.mock.calls[0][1].assumidas).toEqual(['design']);
  });
});

describe('erro ao salvar', () => {
  it('mostra alerta, mantém o digitado e tenta de novo', async () => {
    salvarBlueprint.mockRejectedValueOnce(new ErroApi('FORGE_OFFLINE', 'A API local não respondeu.'));
    renderizar('/projetos/p1/wizard/identidade');
    const essencia = await screen.findByLabelText(m.passos.identidade.essencia.rotulo);
    fireEvent.change(essencia, { target: { value: 'uma bancada' } });
    fireEvent.click(screen.getByRole('button', { name: m.avancar }));
    expect(await screen.findByRole('alert')).toHaveTextContent('A API local não respondeu.');
    expect(screen.getByLabelText(m.passos.identidade.essencia.rotulo)).toHaveValue('uma bancada');
    fireEvent.click(screen.getByRole('button', { name: mensagens.estados.tentarDeNovo }));
    expect(await screen.findByRole('heading', { level: 1, name: m.passos.escopo.titulo })).toBeInTheDocument();
  });
});
