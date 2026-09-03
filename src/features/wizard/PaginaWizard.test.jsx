import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { renderizarComProvedores } from '../../testes/renderizar.jsx';
import { mensagens } from '../../mensagens.js';
import { ErroApi } from '../../services/api.js';
import PaginaWizard from './PaginaWizard.jsx';

vi.mock('../../services/projetos.js', () => ({ obterProjeto: vi.fn(), salvarBlueprint: vi.fn(), atualizarProjeto: vi.fn() }));
vi.mock('../../services/presets.js', () => ({ obterPreset: vi.fn() }));
vi.mock('../../services/regras.js', () => ({ avaliarRegras: vi.fn(), decidirSobreHit: vi.fn() }));
vi.mock('../../services/plano.js', () => ({ gerarPlano: vi.fn() }));
vi.mock('../../services/materializacao.js', () => ({ materializar: vi.fn(), obterMaterializacao: vi.fn(), decidirMaterializacao: vi.fn(), pararRun: vi.fn() }));
vi.mock('../../services/logDeRun.js', () => ({ assinarLogDoRun: vi.fn(() => () => {}), urlDoRun: vi.fn(), MARCADOR_DE_TOKEN: 'forge-token' }));
import { obterProjeto, salvarBlueprint, atualizarProjeto } from '../../services/projetos.js';
import { obterPreset } from '../../services/presets.js';
import { avaliarRegras, decidirSobreHit } from '../../services/regras.js';
import { gerarPlano } from '../../services/plano.js';
import { materializar, obterMaterializacao, decidirMaterializacao, pararRun } from '../../services/materializacao.js';
import { assinarLogDoRun } from '../../services/logDeRun.js';

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
  avaliarRegras.mockReset();
  decidirSobreHit.mockReset();
  obterPreset.mockResolvedValue(preset);
  avaliarRegras.mockResolvedValue({ hits: [], bloqueios: 0, podeMaterializar: true });
  gerarPlano.mockReset();
  materializar.mockReset();
  obterMaterializacao.mockReset();
  decidirMaterializacao.mockReset();
  pararRun.mockReset();
  obterMaterializacao.mockResolvedValue(null);
  gerarPlano.mockResolvedValue({
    hashBlueprint: `sha256:${'a'.repeat(64)}`,
    raiz: '/dev/kora/alfa',
    arquivos: [{ caminho: 'CLAUDE.md', acao: 'criar', tamanho: 1024, tamanhoAtual: null, template: 'fundacao-kora', conteudo: 'x' }],
    comandos: [{ id: 'git-init', cmd: 'git', args: ['init'], obrigatorio: true, longaDuracao: false, timeoutMs: 600000 }],
    pendencias: [],
    totais: { arquivos: 1, bytes: 1024, conflitos: 0, pulados: 0 },
  });
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

describe('motor de regras no wizard', () => {
  const ETAPAS_WEB = ['identidade', 'arquitetura', 'design', 'seguranca', 'fundacao', 'materializar'];
  const presetWeb = { ...preset, id: 'criar-aplicacao-web', nome: 'Criar Aplicação Web', categoria: 'aplicacao', etapas: ETAPAS_WEB };

  const hit = (extra = {}) => ({
    id: 'h1', regraId: 'arq-multitenant-obrigatorio', severidade: 'bloqueio', estado: 'aberto',
    titulo: 'Aplicação web sem multi-tenant', explicacao: 'No padrão Kora, todo SaaS nasce multi-tenant.',
    etapa: 'arquitetura', campo: 'arquitetura.multiTenant', dispensavel: false, resolucao: 'humana',
    efeitos: [{ tipo: 'bloquear' }], justificativa: null, ...extra,
  });

  function comRegras({ hits, podeMaterializar, etapaAtual = 'arquitetura' }) {
    obterPreset.mockResolvedValue(presetWeb);
    obterProjeto.mockResolvedValue({
      projeto: projeto({ presetId: 'criar-aplicacao-web', presetNome: 'Criar Aplicação Web' }),
      blueprint: blueprint({ preset: { id: 'criar-aplicacao-web', versao: 1 }, etapaAtual }),
    });
    avaliarRegras.mockResolvedValue({ hits, bloqueios: hits.filter((h) => h.severidade === 'bloqueio' && h.estado === 'aberto').length, podeMaterializar });
  }

  it('hit com campo aparece na etapa, junto do campo que o causou', async () => {
    comRegras({ hits: [hit()], podeMaterializar: false });
    renderizar('/projetos/p1/wizard/arquitetura');
    expect(await screen.findByText('Aplicação web sem multi-tenant')).toBeInTheDocument();
    expect(screen.getByText(mensagens.regras.severidade.bloqueio)).toBeInTheDocument();
    // o aviso fica depois do campo que o causou, não numa lista no fim da tela
    const campo = screen.getByLabelText(mensagens.wizard.passos.arquitetura.multiTenant.rotulo);
    const aviso = screen.getByText('Aplicação web sem multi-tenant');
    expect(campo.compareDocumentPosition(aviso) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('hit sem campo aparece no topo da etapa', async () => {
    comRegras({ hits: [hit({ campo: null, etapa: 'fundacao', titulo: 'A fundação entra inteira' })], podeMaterializar: false, etapaAtual: 'fundacao' });
    renderizar('/projetos/p1/wizard/fundacao');
    expect(await screen.findByRole('region', { name: mensagens.wizard.avisos })).toHaveTextContent('A fundação entra inteira');
  });

  it('sem hits nenhuma região de avisos é renderizada', async () => {
    comRegras({ hits: [], podeMaterializar: true });
    renderizar('/projetos/p1/wizard/arquitetura');
    await screen.findByRole('heading', { level: 1, name: mensagens.wizard.passos.arquitetura.titulo });
    expect(screen.queryByRole('region', { name: mensagens.wizard.avisos })).toBeNull();
  });

  it('bloqueio aberto desabilita a etapa Materializar na trilha', async () => {
    comRegras({ hits: [hit()], podeMaterializar: false });
    renderizar('/projetos/p1/wizard/arquitetura');
    const trilha = await screen.findByRole('navigation', { name: mensagens.wizard.trilha });
    const materializar = [...trilha.querySelectorAll('button')].at(-1);
    expect(materializar).toHaveTextContent(mensagens.etapas.materializar);
    expect(materializar).toBeDisabled();
  });

  it('avançar da etapa anterior a Materializar explica o bloqueio, salva e não navega', async () => {
    comRegras({ hits: [hit()], podeMaterializar: false, etapaAtual: 'fundacao' });
    renderizar('/projetos/p1/wizard/fundacao');
    fireEvent.click(await screen.findByRole('button', { name: mensagens.wizard.avancar }));
    expect(await screen.findByRole('alert')).toHaveTextContent(mensagens.regras.bloqueioMaterializar);
    await waitFor(() => expect(salvarBlueprint).toHaveBeenCalledTimes(1));
    expect(salvarBlueprint.mock.calls[0][1].etapaAtual).toBe('fundacao');
    expect(screen.getByRole('heading', { level: 1, name: mensagens.wizard.passos.fundacao.titulo })).toBeInTheDocument();
  });

  it('URL direta de Materializar com bloqueio cai na etapa do bloqueio', async () => {
    comRegras({ hits: [hit()], podeMaterializar: false });
    renderizar('/projetos/p1/wizard/materializar');
    expect(await screen.findByRole('heading', { level: 1, name: mensagens.wizard.passos.arquitetura.titulo })).toBeInTheDocument();
  });

  it('sem bloqueio, Materializar abre normalmente', async () => {
    comRegras({ hits: [], podeMaterializar: true, etapaAtual: 'materializar' });
    renderizar('/projetos/p1/wizard/materializar');
    expect(await screen.findByRole('heading', { level: 1, name: mensagens.wizard.passos.materializar.titulo })).toBeInTheDocument();
  });

  it('dispensar pelo wizard manda a justificativa e atualiza a avaliação', async () => {
    const dispensavel = hit({ id: 'h2', regraId: 'custo-servico-pago', severidade: 'aviso', dispensavel: true, etapa: 'seguranca', campo: 'seguranca.tierGratuito', titulo: 'Serviço fora do tier gratuito' });
    comRegras({ hits: [dispensavel], podeMaterializar: true, etapaAtual: 'seguranca' });
    decidirSobreHit.mockResolvedValue({ hits: [{ ...dispensavel, estado: 'dispensado', justificativa: 'Cabe no plano gratuito da Vercel.' }], bloqueios: 0, podeMaterializar: true });
    renderizar('/projetos/p1/wizard/seguranca');
    fireEvent.click(await screen.findByRole('button', { name: mensagens.regras.dispensar }));
    fireEvent.change(screen.getByLabelText(mensagens.regras.justificativa.rotulo), { target: { value: 'Cabe no plano gratuito da Vercel.' } });
    fireEvent.click(screen.getByRole('button', { name: mensagens.regras.confirmarDispensa }));
    await waitFor(() => expect(decidirSobreHit).toHaveBeenCalledWith('p1', 'h2', { estado: 'dispensado', justificativa: 'Cabe no plano gratuito da Vercel.' }));
    expect(await screen.findByText(/Cabe no plano gratuito/)).toBeInTheDocument();
  });

  it('hit resolvido some da tela, mas o de resolução automática continua visível', async () => {
    comRegras({
      hits: [
        hit({ id: 'h3', regraId: 'arq-auth-exige-rota-protegida', severidade: 'aviso', estado: 'resolvido', resolucao: 'humana', titulo: 'Já resolvido', campo: null }),
        hit({ id: 'h4', regraId: 'seg-rls-obrigatorio', severidade: 'bloqueio', estado: 'resolvido', resolucao: 'automatica', dispensavel: false, titulo: 'RLS entra em toda tabela', campo: null }),
      ],
      podeMaterializar: true,
    });
    renderizar('/projetos/p1/wizard/arquitetura');
    expect(await screen.findByText('RLS entra em toda tabela')).toBeInTheDocument();
    expect(screen.getByText(mensagens.regras.automatico)).toBeInTheDocument();
    expect(screen.queryByText('Já resolvido')).toBeNull();
  });
});

describe('plano na etapa Materializar', () => {
  function emMaterializar() {
    obterProjeto.mockResolvedValue({ projeto: projeto({ etapaAtual: 'materializar' }), blueprint: blueprint({ etapaAtual: 'materializar' }) });
  }

  it('mostra o plano com raiz, arquivos e comandos, e avisa que nada foi escrito', async () => {
    emMaterializar();
    renderizar('/projetos/p1/wizard/materializar');
    expect(await screen.findByText('/dev/kora/alfa')).toBeInTheDocument();
    expect(screen.getByText('CLAUDE.md')).toBeInTheDocument();
    expect(screen.getByText('git init')).toBeInTheDocument();
    expect(screen.getByText(mensagens.plano.nadaEscrito)).toBeInTheDocument();
    expect(gerarPlano).toHaveBeenCalledWith('p1');
  });

  it('workspace faltando leva para Configurações em vez de só reclamar', async () => {
    emMaterializar();
    gerarPlano.mockRejectedValue(new ErroApi('FORGE_VALIDATION', 'Configure o workspace em Configurações antes de gerar o plano.', { issues: [{ caminho: 'workspace', mensagem: 'x' }] }, 400));
    renderizar('/projetos/p1/wizard/materializar');
    expect(await screen.findByRole('alert')).toHaveTextContent('Configure o workspace');
    expect(screen.getByRole('link', { name: mensagens.plano.erroWorkspace })).toHaveAttribute('href', '/config');
  });

  it('erro genérico oferece tentar de novo', async () => {
    emMaterializar();
    gerarPlano.mockRejectedValueOnce(new ErroApi('FORGE_OFFLINE', 'A API local não respondeu.')).mockResolvedValueOnce({
      hashBlueprint: `sha256:${'b'.repeat(64)}`, raiz: '/dev/kora/alfa', arquivos: [], comandos: [], pendencias: [],
      totais: { arquivos: 0, bytes: 0, conflitos: 0, pulados: 0 },
    });
    renderizar('/projetos/p1/wizard/materializar');
    expect(await screen.findByRole('alert')).toHaveTextContent('A API local não respondeu.');
    fireEvent.click(screen.getByRole('button', { name: mensagens.estados.tentarDeNovo }));
    expect(await screen.findByText('/dev/kora/alfa')).toBeInTheDocument();
  });
});

describe('aprovar e materializar', () => {
  const mm = mensagens.materializacao;
  const estadoDe = (extra = {}) => ({
    projetoId: 'p1', raiz: '/dev/kora/alfa', estado: 'concluida',
    arquivos: { criados: 32, sobrescritos: 0, pulados: 0 },
    comandos: [{ id: 'git-init', cmd: 'git', args: ['init'], obrigatorio: true, longaDuracao: false, estado: 'sucesso', runId: 'r1', exitCode: 0, erro: null }],
    indice: 1, iniciadaEm: '2026-09-03T00:00:00.000Z', terminadaEm: '2026-09-03T00:00:01.000Z', ...extra,
  });

  function emMaterializar() {
    obterProjeto.mockResolvedValue({ projeto: projeto({ etapaAtual: 'materializar' }), blueprint: blueprint({ etapaAtual: 'materializar' }) });
  }

  it('o botão de aprovar é separado da navegação e manda o hash do plano', async () => {
    emMaterializar();
    materializar.mockResolvedValue(estadoDe());
    renderizar('/projetos/p1/wizard/materializar');
    const botao = await screen.findByRole('button', { name: mm.aprovar });
    expect(screen.getByText(mm.aprovarMicro)).toBeInTheDocument();
    expect(botao).not.toBe(screen.getByRole('button', { name: mensagens.wizard.concluir }));
    fireEvent.click(botao);
    await waitFor(() => expect(materializar).toHaveBeenCalledWith('p1', `sha256:${'a'.repeat(64)}`));
    expect(await screen.findByText(mm.estado.concluida)).toBeInTheDocument();
    // Concluída, o plano do que **vai** acontecer sai da tela e entra a tela final: a etapa cabe
    // em uma tela, e o que interessa agora é onde o projeto ficou (princípio nº 1).
    expect(screen.getAllByText('git init')).toHaveLength(1);
    expect(screen.getByRole('heading', { name: mensagens.telaFinal.titulo })).toBeInTheDocument();
    expect(screen.queryByText(mensagens.plano.nadaEscrito)).toBeNull();
  });

  it('ferramenta ausente mostra a lista do que falta, não uma mensagem genérica', async () => {
    emMaterializar();
    materializar.mockRejectedValue(new ErroApi('FORGE_TOOL_MISSING', 'Falta instalar: git.', {
      ferramentas: [{ bin: 'node', min: '20', encontrada: '22.0.0', ok: true }, { bin: 'git', min: null, encontrada: null, ok: false }],
    }, 409));
    renderizar('/projetos/p1/wizard/materializar');
    fireEvent.click(await screen.findByRole('button', { name: mm.aprovar }));
    expect(await screen.findByText(mm.ferramentasAusentes)).toBeInTheDocument();
    expect(screen.getByText(mm.ferramentaLinha('git', null, null))).toBeInTheDocument();
    expect(screen.queryByText(mm.ferramentaLinha('node', '20', '22.0.0'))).toBeNull();
  });

  it('plano velho explica que é preciso gerar de novo', async () => {
    emMaterializar();
    materializar.mockRejectedValue(new ErroApi('FORGE_PLAN_STALE', 'O blueprint mudou.', {}, 409));
    renderizar('/projetos/p1/wizard/materializar');
    fireEvent.click(await screen.findByRole('button', { name: mm.aprovar }));
    expect(await screen.findByText(mm.planoVelho)).toBeInTheDocument();
  });

  it('falha em um comando oferece repetir, pular e abortar', async () => {
    emMaterializar();
    obterMaterializacao.mockResolvedValue(estadoDe({
      estado: 'parado_em_falha',
      comandos: [{ id: 'install', cmd: 'npm', args: ['install'], obrigatorio: true, longaDuracao: false, estado: 'falha', runId: 'r2', exitCode: 1, erro: 'Saiu com código 1.' }],
    }));
    decidirMaterializacao.mockResolvedValue(estadoDe());
    renderizar('/projetos/p1/wizard/materializar');
    fireEvent.click(await screen.findByRole('button', { name: mm.pular }));
    await waitFor(() => expect(decidirMaterializacao).toHaveBeenCalledWith('p1', 'pular'));
    expect(await screen.findByText(mm.estado.concluida)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: mm.aprovar })).toBeNull();
  });

  it('comando rodando pode ser parado', async () => {
    emMaterializar();
    obterMaterializacao.mockResolvedValue(estadoDe({
      estado: 'rodando',
      comandos: [{ id: 'dev', cmd: 'npm', args: ['run', 'dev'], obrigatorio: false, longaDuracao: true, estado: 'rodando', runId: 'r3', exitCode: null, erro: null }],
    }));
    pararRun.mockResolvedValue({ runId: 'r3', estado: 'cancelado' });
    renderizar('/projetos/p1/wizard/materializar');
    fireEvent.click(await screen.findByRole('button', { name: mm.parar }));
    // O TanStack passa um segundo argumento ao mutationFn; o que importa é o primeiro.
    await waitFor(() => expect(pararRun).toHaveBeenCalled());
    expect(pararRun.mock.calls[0][0]).toBe('r3');
  });
});

// Bloco 8. O log ao vivo entra ao lado da fila de comandos, não no lugar dela, e a tela final
// fecha o fluxo dizendo onde o projeto ficou.
describe('log ao vivo e fechamento', () => {
  const ml = mensagens.log;
  const mm = mensagens.materializacao;

  const comando = (id, estado, runId) => ({ id, cmd: 'npm', args: [id], obrigatorio: true, longaDuracao: false, estado, runId, exitCode: null, erro: null });
  const estadoDe = (extra = {}) => ({
    projetoId: 'p1', raiz: 'D:\\dev\\kora\\alfa', estado: 'rodando',
    arquivos: { criados: 32, sobrescritos: 1, pulados: 2 },
    comandos: [comando('init', 'sucesso', 'r1'), comando('install', 'rodando', 'r2'), comando('build', 'pendente', null)],
    indice: 1, iniciadaEm: '2026-09-03T00:00:00.000Z', terminadaEm: null, ...extra,
  });

  // Devolve o callback que o hook registrou, para o teste empurrar linhas como o servidor faria.
  function empurrar(eventos) {
    const chamada = assinarLogDoRun.mock.calls.at(-1);
    chamada[1].onEstado('conectado');
    chamada[1].onEventos(eventos, { descartados: 0 });
  }

  beforeEach(() => {
    assinarLogDoRun.mockClear();
    obterProjeto.mockResolvedValue({ projeto: projeto({ etapaAtual: 'materializar' }), blueprint: blueprint({ etapaAtual: 'materializar' }) });
  });

  it('a fila de comandos continua na tela, com o log ao lado', async () => {
    obterMaterializacao.mockResolvedValue(estadoDe());
    renderizar('/projetos/p1/wizard/materializar');

    expect(await screen.findByText(mm.estado.rodando)).toBeInTheDocument();
    expect(screen.getByText(mm.arquivos(32, 1, 2))).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: ml.titulo })).toBeInTheDocument();
  });

  // Sem clicar em nada, o log segue o comando que está rodando agora.
  it('o log segue sozinho o comando em execução', async () => {
    obterMaterializacao.mockResolvedValue(estadoDe());
    renderizar('/projetos/p1/wizard/materializar');
    await screen.findByText(mm.estado.rodando);

    await waitFor(() => expect(assinarLogDoRun).toHaveBeenCalledWith('r2', expect.anything()));
    expect(await screen.findByText(ml.de('npm install'))).toBeInTheDocument();
  });

  it('as linhas que chegam aparecem no log', async () => {
    obterMaterializacao.mockResolvedValue(estadoDe());
    renderizar('/projetos/p1/wizard/materializar');
    await waitFor(() => expect(assinarLogDoRun).toHaveBeenCalled());

    act(() => empurrar([
      { tipo: 'linha', stream: 'stdout', linha: 'baixando pacotes', ts: '2026-09-03T00:00:01.000Z' },
      { tipo: 'linha', stream: 'stderr', linha: 'aviso do npm', ts: '2026-09-03T00:00:02.000Z' },
    ]));

    expect(await screen.findByText('baixando pacotes')).toBeInTheDocument();
    expect(screen.getByText('aviso do npm')).toBeInTheDocument();
  });

  // Comando já executado é selecionável; pendente não, porque não existe run para mostrar.
  it('clicar em um comando já executado troca o log, e o pendente não é clicável', async () => {
    obterMaterializacao.mockResolvedValue(estadoDe());
    renderizar('/projetos/p1/wizard/materializar');
    await screen.findByText(mm.estado.rodando);

    fireEvent.click(screen.getByRole('button', { name: mm.verSaida('init') }));
    await waitFor(() => expect(assinarLogDoRun).toHaveBeenCalledWith('r1', expect.anything()));
    expect(await screen.findByText(ml.de('npm init'))).toBeInTheDocument();

    expect(screen.queryByRole('button', { name: mm.verSaida('build') })).toBeNull();
  });

  it('sem nenhum comando executado ainda, o log mostra o vazio com a próxima ação', async () => {
    obterMaterializacao.mockResolvedValue(estadoDe({
      estado: 'escrevendo',
      comandos: [comando('init', 'pendente', null)],
      indice: 0,
    }));
    renderizar('/projetos/p1/wizard/materializar');

    expect(await screen.findByText(ml.semComando)).toBeInTheDocument();
    expect(screen.getByText(ml.semComandoTexto)).toBeInTheDocument();
    expect(assinarLogDoRun).not.toHaveBeenCalled();
  });

  it('concluída mostra a tela final com o caminho e o atalho para o editor', async () => {
    obterMaterializacao.mockResolvedValue(estadoDe({ estado: 'concluida', terminadaEm: '2026-09-03T00:05:00.000Z' }));
    renderizar('/projetos/p1/wizard/materializar');

    const telaFinal = (await screen.findByRole('heading', { name: mensagens.telaFinal.titulo })).closest('section');
    expect(within(telaFinal).getByText('D:\\dev\\kora\\alfa')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: mensagens.telaFinal.abrirNoEditor })).toHaveAttribute('href', 'vscode://file/D:/dev/kora/alfa');
    expect(screen.getByRole('link', { name: mensagens.telaFinal.verProjeto })).toBeInTheDocument();
  });

  // ADR-002: não existe rollback. Abortada não celebra.
  it('abortada não mostra a tela de sucesso', async () => {
    obterMaterializacao.mockResolvedValue(estadoDe({ estado: 'abortada', terminadaEm: '2026-09-03T00:05:00.000Z' }));
    renderizar('/projetos/p1/wizard/materializar');

    expect(await screen.findByRole('heading', { name: mensagens.telaFinal.abortada.titulo })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: mensagens.telaFinal.titulo })).toBeNull();
  });
});
