import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it, expect, afterEach } from 'vitest';
import { criarAppDeTeste, criarPastaTemporaria } from '../../testes/apoio.js';
import { carregarTemplatesBuiltin, PASTA_TEMPLATES_BUILTIN } from './servico.js';
import { planoSchema } from '../../../shared/schemas/plano.js';

let contexto;
const temporarias = [];
afterEach(async () => {
  if (contexto) { await contexto.fechar(); contexto = null; }
  while (temporarias.length > 0) fs.rmSync(temporarias.pop(), { recursive: true, force: true });
});
function novo() { contexto = criarAppDeTeste(); return contexto; }
function workspace() {
  const p = criarPastaTemporaria('kora-forge-ws-');
  temporarias.push(p);
  return p;
}

const post = (ctx, url, payload) => ctx.app.inject({ method: 'POST', url, headers: ctx.cabecalhos, payload });
const patch = (ctx, url, payload) => ctx.app.inject({ method: 'PATCH', url, headers: ctx.cabecalhos, payload });

const blueprintSite = (extra = {}) => ({
  preset: { id: 'criar-site', versao: 1 },
  etapaAtual: 'materializar',
  etapasConcluidas: ['identidade', 'escopo', 'seguranca', 'fundacao', 'materializar'],
  assumidas: ['design'],
  respostas: {
    identidade: { nome: 'Site da Kora', essencia: 'A casa digital da Kora.', problema: 'Não temos onde apontar.', valor: 'Presença própria.' },
    escopo: { publico: 'clientes', personas: ['dono de restaurante'], ahaMoment: 'ver o site no ar', naoObjetivos: ['não é blog'] },
    design: {},
    seguranca: { dadoPessoal: false, dadoFinanceiro: false, compliance: [], tierGratuito: true, observacoes: '' },
    fundacao: { observacoes: '' },
    materializar: { confirmada: true },
  },
  ...extra,
});

async function projetoPronto(ctx, { ws, nome = 'Site da Kora', blueprint = blueprintSite() } = {}) {
  await patch(ctx, '/api/settings', { workspace: ws });
  const criado = await post(ctx, '/api/projects', { nome, presetId: 'criar-site' });
  expect(criado.statusCode).toBe(201);
  const projeto = criado.json().data.projeto;
  const salvo = await post(ctx, `/api/projects/${projeto.id}/blueprint`, blueprint);
  expect(salvo.statusCode).toBe(200);
  return projeto;
}
const gerarPlano = (ctx, id) => post(ctx, `/api/projects/${id}/plano`);

describe('catálogo de templates', () => {
  it('carrega os cinco templates com manifesto válido e arquivos', () => {
    const templates = carregarTemplatesBuiltin();
    expect(templates.map((t) => t.id)).toEqual(['camada-de-servicos', 'config-base', 'design-tokens', 'fundacao-kora', 'vite-react']);
    for (const template of templates) {
      expect(template.versao).toBeGreaterThanOrEqual(1);
      expect(template.arquivos.length).toBeGreaterThan(0);
    }
    expect(PASTA_TEMPLATES_BUILTIN.replace(/[\\/]$/, '').endsWith('templates')).toBe(true);
  });

  it('a fundação carrega CLAUDE.md, memory/ e docs/00 a 11', () => {
    const fundacao = carregarTemplatesBuiltin().find((t) => t.id === 'fundacao-kora');
    const destinos = fundacao.arquivos.map((a) => a.destino);
    expect(destinos).toContain('CLAUDE.md');
    expect(destinos).toContain('README.md');
    for (const arquivo of ['identity', 'decisions', 'patterns', 'learnings', 'restrictions', 'bugs']) {
      expect(destinos).toContain(`memory/${arquivo}.md`);
    }
    for (const doc of ['00_VISAO', '01_ARQUITETURA', '02_DESIGN_SYSTEM', '03_REGRAS_DE_NEGOCIO', '04_MODELAGEM', '05_FLUXOS', '06_COMPONENTES', '07_APIS', '08_DECISOES', '09_BACKLOG', '10_PROMPTS', '11_SEGURANCA']) {
      expect(destinos).toContain(`docs/${doc}/README.md`);
    }
    expect(destinos).toContain('docs/08_DECISOES/adr-000-template.md');
    expect(destinos).toContain('docs/08_DECISOES/adr-001-stack-e-arquitetura.md');
  });

  it.each([
    ['manifesto fora do contrato', { id: 'quebrado', versao: 0, descricao: 'x', ordem: 1 }],
    ['id que não bate com a pasta', { id: 'outro', versao: 1, descricao: 'x', ordem: 1 }],
  ])('%s derruba a carga com FORGE_VALIDATION', (_rotulo, manifesto) => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), 'kora-forge-tpl-'));
    temporarias.push(base);
    fs.mkdirSync(path.join(base, 'quebrado', 'arquivos'), { recursive: true });
    fs.writeFileSync(path.join(base, 'quebrado', 'template.json'), JSON.stringify(manifesto));
    let erro;
    try { carregarTemplatesBuiltin(base); } catch (e) { erro = e; }
    expect(erro?.codigo).toBe('FORGE_VALIDATION');
    expect(erro.message).toContain('quebrado');
  });

  it('template sem pasta arquivos derruba a carga', () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), 'kora-forge-tpl-'));
    temporarias.push(base);
    fs.mkdirSync(path.join(base, 'vazio'));
    fs.writeFileSync(path.join(base, 'vazio', 'template.json'), JSON.stringify({ id: 'vazio', versao: 1, descricao: 'x', ordem: 1 }));
    expect(() => carregarTemplatesBuiltin(base)).toThrow(/arquivos/);
  });
});

describe('POST /projects/:id/plano', () => {
  it('devolve o plano completo e não escreve nada em disco', async () => {
    const ctx = novo();
    const ws = workspace();
    const projeto = await projetoPronto(ctx, { ws });
    const antes = fs.readdirSync(ws);

    const resposta = await gerarPlano(ctx, projeto.id);
    expect(resposta.statusCode).toBe(200);
    const plano = resposta.json().data;
    expect(planoSchema.safeParse(plano).success).toBe(true);
    expect(fs.readdirSync(ws)).toEqual(antes);
    expect(fs.existsSync(path.join(ws, projeto.slug))).toBe(false);

    expect(plano.raiz).toBe(path.join(ws, 'site-da-kora'));
    expect(plano.totais.arquivos).toBe(plano.arquivos.length);
    expect(plano.totais.conflitos).toBe(0);
    expect(plano.totais.bytes).toBeGreaterThan(1000);
    expect(plano.arquivos.every((a) => a.acao === 'criar')).toBe(true);
    expect(plano.arquivos.map((a) => a.caminho)).toContain('CLAUDE.md');
    expect(plano.arquivos.map((a) => a.caminho)).toContain('.gitignore');
  });

  it('nenhum placeholder sobra no conteúdo gerado, e o blueprint aparece nos arquivos', async () => {
    const ctx = novo();
    const projeto = await projetoPronto(ctx, { ws: workspace() });
    const plano = (await gerarPlano(ctx, projeto.id)).json().data;
    for (const arquivo of plano.arquivos) {
      expect(arquivo.conteudo, arquivo.caminho).not.toMatch(/\{\{[A-Z][A-Z0-9_]*\}\}/);
    }
    const claude = plano.arquivos.find((a) => a.caminho === 'CLAUDE.md');
    expect(claude.conteudo).toContain('Site da Kora');
    const identidade = plano.arquivos.find((a) => a.caminho === 'memory/identity.md');
    expect(identidade.conteudo).toContain('A casa digital da Kora.');
    expect(identidade.conteudo).toContain('- dono de restaurante');
    const adr = plano.arquivos.find((a) => a.caminho === 'docs/08_DECISOES/adr-001-stack-e-arquitetura.md');
    expect(adr.conteudo).toContain('Criar Site');
  });

  it('.gitignore gerado cobre .env, node_modules e build', async () => {
    const ctx = novo();
    const projeto = await projetoPronto(ctx, { ws: workspace() });
    const plano = (await gerarPlano(ctx, projeto.id)).json().data;
    const gitignore = plano.arquivos.find((a) => a.caminho === '.gitignore').conteudo;
    for (const linha of ['.env', '.env.*', 'node_modules/', 'dist/']) expect(gitignore).toContain(linha);
    const envExample = plano.arquivos.find((a) => a.caminho === '.env.example').conteudo;
    expect(envExample).not.toMatch(/=[^\s]/);
  });

  it('a ordem respeita fundação, config, código e depois o caminho', async () => {
    const ctx = novo();
    const projeto = await projetoPronto(ctx, { ws: workspace() });
    const plano = (await gerarPlano(ctx, projeto.id)).json().data;
    const caminhos = plano.arquivos.map((a) => a.caminho);
    expect([...caminhos].sort()).toEqual(caminhos);
    expect(plano.comandos.map((c) => c.id)).toEqual(['git-init', 'install', 'dev']);
    expect(plano.comandos[0]).toEqual({ id: 'git-init', cmd: 'git', args: ['init'], obrigatorio: true, longaDuracao: false, timeoutMs: 600000 });
    expect(plano.comandos.find((c) => c.id === 'dev').longaDuracao).toBe(true);
  });

  it('template que o preset pede e o catálogo não tem vira pendência declarada', async () => {
    const ctx = novo();
    const projeto = await projetoPronto(ctx, { ws: workspace() });
    const plano = (await gerarPlano(ctx, projeto.id)).json().data;
    expect(plano.pendencias.map((p) => p.item)).toContain('seo-base');
    for (const pendencia of plano.pendencias) {
      expect(pendencia.tipo).toBe('template');
      expect(pendencia.motivo.length).toBeGreaterThan(10);
    }
  });

  it('gerar duas vezes produz exatamente o mesmo plano', async () => {
    const ctx = novo();
    const projeto = await projetoPronto(ctx, { ws: workspace() });
    const primeiro = (await gerarPlano(ctx, projeto.id)).json().data;
    const segundo = (await gerarPlano(ctx, projeto.id)).json().data;
    expect(segundo).toEqual(primeiro);
    expect(primeiro.hashBlueprint).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it('mudar o blueprint muda o hash', async () => {
    const ctx = novo();
    const ws = workspace();
    const projeto = await projetoPronto(ctx, { ws });
    const antes = (await gerarPlano(ctx, projeto.id)).json().data.hashBlueprint;
    const outro = blueprintSite();
    outro.respostas.identidade.essencia = 'Outra coisa.';
    await post(ctx, `/api/projects/${projeto.id}/blueprint`, outro);
    const depois = (await gerarPlano(ctx, projeto.id)).json().data;
    expect(depois.hashBlueprint).not.toBe(antes);
    expect(depois.arquivos.find((a) => a.caminho === 'memory/identity.md').conteudo).toContain('Outra coisa.');
  });

  it('arquivo idêntico vira pular, diferente vira sobrescrever', async () => {
    const ctx = novo();
    const ws = workspace();
    const projeto = await projetoPronto(ctx, { ws });
    const plano = (await gerarPlano(ctx, projeto.id)).json().data;

    // Escreve dois arquivos do plano à mão: um igual, um diferente.
    const igual = plano.arquivos.find((a) => a.caminho === 'CLAUDE.md');
    const diferente = plano.arquivos.find((a) => a.caminho === '.gitignore');
    fs.mkdirSync(plano.raiz, { recursive: true });
    fs.writeFileSync(path.join(plano.raiz, igual.caminho), igual.conteudo);
    fs.writeFileSync(path.join(plano.raiz, diferente.caminho), 'conteúdo antigo do usuário');

    const segundo = (await gerarPlano(ctx, projeto.id)).json().data;
    expect(segundo.arquivos.find((a) => a.caminho === 'CLAUDE.md').acao).toBe('pular');
    const conflito = segundo.arquivos.find((a) => a.caminho === '.gitignore');
    expect(conflito.acao).toBe('sobrescrever');
    expect(conflito.tamanhoAtual).toBe(Buffer.byteLength('conteúdo antigo do usuário', 'utf8'));
    expect(segundo.totais.conflitos).toBe(1);
    expect(segundo.totais.pulados).toBe(1);
  });
});

describe('recusas do plano', () => {
  it('sem workspace configurado responde 400 apontando o campo', async () => {
    const ctx = novo();
    const criado = await post(ctx, '/api/projects', { nome: 'Sem Workspace', presetId: 'criar-site' });
    const projeto = criado.json().data.projeto;
    await post(ctx, `/api/projects/${projeto.id}/blueprint`, blueprintSite());
    const resposta = await gerarPlano(ctx, projeto.id);
    expect(resposta.statusCode).toBe(400);
    expect(resposta.json().error.detalhe.issues[0].caminho).toBe('workspace');
    expect(resposta.json().error.mensagem).toMatch(/Configurações/);
  });

  it('workspace apagado do disco responde 400 apontando o campo', async () => {
    const ctx = novo();
    const ws = workspace();
    const projeto = await projetoPronto(ctx, { ws });
    fs.rmSync(ws, { recursive: true, force: true });
    const resposta = await gerarPlano(ctx, projeto.id);
    expect(resposta.statusCode).toBe(400);
    expect(resposta.json().error.detalhe.issues[0].caminho).toBe('workspace');
  });

  it('bloqueio aberto responde FORGE_PLAN_BLOQUEADO listando o que falta', async () => {
    const ctx = novo();
    const ws = workspace();
    await patch(ctx, '/api/settings', { workspace: ws });
    const criado = await post(ctx, '/api/projects', { nome: 'App Web', presetId: 'criar-aplicacao-web' });
    const projeto = criado.json().data.projeto;
    await post(ctx, `/api/projects/${projeto.id}/regras/avaliar`);
    const resposta = await gerarPlano(ctx, projeto.id);
    expect(resposta.statusCode).toBe(409);
    expect(resposta.json().error.codigo).toBe('FORGE_PLAN_BLOQUEADO');
    expect(resposta.json().error.detalhe.bloqueios.map((b) => b.regraId)).toContain('arq-multitenant-obrigatorio');
    expect(fs.readdirSync(ws)).toEqual([]);
  });

  it('projeto arquivado responde 400 e projeto inexistente 404', async () => {
    const ctx = novo();
    const projeto = await projetoPronto(ctx, { ws: workspace() });
    await patch(ctx, `/api/projects/${projeto.id}`, { arquivado: true });
    expect((await gerarPlano(ctx, projeto.id)).statusCode).toBe(400);
    expect((await gerarPlano(ctx, 'nao-existe')).statusCode).toBe(404);
  });
});
