import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it, expect, afterEach } from 'vitest';
import { presetSchema } from '../../../shared/schemas/preset.js';
import { abrirBanco } from '../../db/conexao.js';
import { migrar } from '../../db/migrar.js';
import { carregarPresetsBuiltin, sincronizarPresets, criarServicoPresets, PASTA_PRESETS_BUILTIN } from './servico.js';
import { criarAppDeTeste } from '../../testes/apoio.js';

const base = () => ({
  id: 'teste', nome: 'Teste', descricao: 'd', versao: 1, categoria: 'site', icone: 'x',
  etapas: ['identidade', 'materializar'], defaults: {}, arvore: [], regras_extras: [], skills: [], mcps: [],
  requisitos: [], comandos: [{ id: 'init', cmd: 'git', args: ['init'] }], definition_of_done: [],
});
const issuesDe = (dados) => {
  const r = presetSchema.safeParse(dados);
  return r.success ? [] : r.error.issues.map((i) => i.path.join('.'));
};

describe('presetSchema', () => {
  it('aceita o preset mínimo e preenche defaults dos comandos', () => {
    const r = presetSchema.safeParse(base());
    expect(r.success).toBe(true);
    expect(r.data.comandos[0]).toEqual({ id: 'init', cmd: 'git', args: ['init'], obrigatorio: false, longa_duracao: false });
  });

  it('rejeita chave desconhecida, etapa repetida, etapa obrigatória ausente, comando fora da whitelist e id repetido', () => {
    expect(issuesDe({ ...base(), inventada: 1 })).toContain('');
    expect(issuesDe({ ...base(), etapas: ['identidade', 'identidade', 'materializar'] })).toContain('etapas');
    expect(issuesDe({ ...base(), etapas: ['identidade', 'design'] })).toContain('etapas');
    expect(issuesDe({ ...base(), comandos: [{ id: 'x', cmd: 'rm', args: ['-rf'] }] })).toContain('comandos.0.cmd');
    expect(issuesDe({ ...base(), comandos: [{ id: 'x', cmd: 'git', args: [] }, { id: 'x', cmd: 'npm', args: [] }] })).toContain('comandos');
    expect(issuesDe({ ...base(), id: 'Com Espaço' })).toContain('id');
    expect(issuesDe({ ...base(), versao: 0 })).toContain('versao');
  });

  it('os três presets reais do repositório passam no contrato', () => {
    const lista = carregarPresetsBuiltin();
    expect(lista.map((p) => p.id)).toEqual(['criar-aplicacao-local', 'criar-aplicacao-web', 'criar-site']);
    for (const preset of lista) expect(presetSchema.safeParse(preset).success).toBe(true);
  });
});

describe('carregarPresetsBuiltin', () => {
  it('preset inválido lança FORGE_VALIDATION citando o arquivo', () => {
    const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'kora-forge-presets-'));
    fs.writeFileSync(path.join(pasta, 'ruim.json'), JSON.stringify({ ...base(), comandos: [{ id: 'x', cmd: 'bash', args: [] }] }));
    let erro;
    try { carregarPresetsBuiltin(pasta); } catch (e) { erro = e; }
    expect(erro?.codigo).toBe('FORGE_VALIDATION');
    expect(erro.message).toContain('ruim.json');
    expect(erro.detalhe.issues[0].caminho).toContain('ruim.json:comandos.0.cmd');
    fs.writeFileSync(path.join(pasta, 'ruim.json'), '{ não é json');
    expect(() => carregarPresetsBuiltin(pasta)).toThrow(/ruim\.json/);
    fs.rmSync(pasta, { recursive: true, force: true });
  });

  it('a pasta padrão é presets/ na raiz do repositório', () => {
    expect(PASTA_PRESETS_BUILTIN.replace(/[\\/]$/, '').endsWith('presets')).toBe(true);
  });
});

describe('sincronizarPresets', () => {
  it('insere na primeira vez, não duplica na segunda, atualiza quando o JSON muda e ignora custom', () => {
    const db = abrirBanco(':memory:');
    migrar(db);
    const lista = carregarPresetsBuiltin();
    const primeira = sincronizarPresets(db, lista);
    expect(primeira.inseridos).toHaveLength(3);
    const segunda = sincronizarPresets(db, lista);
    expect(segunda).toEqual({ inseridos: [], atualizados: [], inalterados: lista.map((p) => p.id) });
    expect(db.prepare('SELECT count(*) AS n FROM presets').get().n).toBe(3);

    const alterado = lista.map((p) => (p.id === 'criar-site' ? { ...p, nome: 'Criar Site v2', versao: 2 } : p));
    const terceira = sincronizarPresets(db, alterado);
    expect(terceira.atualizados).toEqual(['criar-site']);
    const linha = db.prepare('SELECT nome, versao, atualizado_em, criado_em FROM presets WHERE id = ?').get('criar-site');
    expect(linha.nome).toBe('Criar Site v2');
    expect(linha.versao).toBe(2);

    const agora = new Date().toISOString();
    db.prepare("INSERT INTO presets (id, nome, descricao, categoria, versao, origem, payload_json, ativo, criado_em, atualizado_em) VALUES ('meu-custom', 'Meu', 'd', 'site', 7, 'custom', '{}', 1, ?, ?)").run(agora, agora);
    const quarta = sincronizarPresets(db, [{ ...lista[0], id: 'meu-custom', nome: 'Tentativa builtin' }]);
    expect(quarta.inalterados).toEqual(['meu-custom']);
    expect(db.prepare('SELECT nome, versao, origem FROM presets WHERE id = ?').get('meu-custom')).toEqual({ nome: 'Meu', versao: 7, origem: 'custom' });
    db.close();
  });

  it('serviço lista resumos por nome e devolve o preset completo ou null', () => {
    const db = abrirBanco(':memory:');
    migrar(db);
    sincronizarPresets(db, carregarPresetsBuiltin());
    const presets = criarServicoPresets({ db });
    const lista = presets.listar();
    expect(lista.map((p) => p.nome)).toEqual(['Criar Aplicação Local', 'Criar Aplicação Web', 'Criar Site']);
    expect(Object.keys(lista[0]).sort()).toEqual(['categoria', 'descricao', 'etapas', 'icone', 'id', 'nome', 'origem', 'versao']);
    expect(presets.obter('criar-site').comandos.length).toBeGreaterThan(0);
    expect(presets.obter('nao-existe')).toBeNull();
    expect(() => presets.obterOuFalhar('nao-existe')).toThrow(/menu/);
    db.close();
  });
});

describe('rotas de presets', () => {
  let contexto;
  afterEach(async () => { if (contexto) { await contexto.fechar(); contexto = null; } });

  it('GET /presets devolve resumos e GET /presets/:id o preset completo', async () => {
    contexto = criarAppDeTeste();
    const lista = await contexto.app.inject({ method: 'GET', url: '/api/presets', headers: contexto.cabecalhos });
    expect(lista.statusCode).toBe(200);
    expect(lista.json().data.map((p) => p.id)).toEqual(['criar-aplicacao-local', 'criar-aplicacao-web', 'criar-site']);
    expect(lista.json().data[0].origem).toBe('builtin');
    const um = await contexto.app.inject({ method: 'GET', url: '/api/presets/criar-site', headers: contexto.cabecalhos });
    expect(um.statusCode).toBe(200);
    expect(um.json().data.etapas).toContain('identidade');
    const nada = await contexto.app.inject({ method: 'GET', url: '/api/presets/nao-existe', headers: contexto.cabecalhos });
    expect(nada.statusCode).toBe(404);
    expect(nada.json().error.codigo).toBe('FORGE_NOT_FOUND');
  });
});
