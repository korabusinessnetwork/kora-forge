import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { abrirBanco } from '../../db/conexao.js';
import { migrar } from '../../db/migrar.js';
import { criarPastaTemporaria } from '../../testes/apoio.js';
import { criarServicoReforja } from './servico.js';
import { carregarTemplatesReforja } from './templates.js';
import { chavesUsadas } from '../../../shared/template.js';
import {
  criarItemSchema,
  diagnosticoSchema,
  itemSchema,
  listaItensSchema,
  manifestoSpecSchema,
  mudarEstadoSchema,
  previaSpecSchema,
  specGeradaSchema,
  transformarSinalSchema,
} from '../../../shared/schemas/reforja.js';

const limpar = [];
afterEach(() => {
  while (limpar.length) limpar.pop()();
});

function escrever(raiz, relativo, conteudo = '') {
  const absoluto = path.join(raiz, ...relativo.split('/'));
  fs.mkdirSync(path.dirname(absoluto), { recursive: true });
  fs.writeFileSync(absoluto, conteudo);
}

function montar({ arvore = {} } = {}) {
  const raizForge = criarPastaTemporaria('kora-forge-reforja-');
  for (const [relativo, conteudo] of Object.entries(arvore)) escrever(raizForge, relativo, conteudo);
  const db = abrirBanco(':memory:');
  migrar(db);
  const registrarEvento = vi.fn(() => true);
  const reforja = criarServicoReforja({ db, registrarEvento, raizForge });
  limpar.push(() => {
    db.close();
    fs.rmSync(raizForge, { recursive: true, force: true });
  });
  return { db, registrarEvento, reforja, raizForge };
}

const ARVORE_COM_SINAL = {
  'src/a.js': `// ${'TO'}${'DO'} resolver\n`,
  'specs/sem.md': '# spec sem auditoria',
};

function erroDe(fn) {
  try {
    fn();
  } catch (erro) {
    return erro;
  }
  return null;
}

describe('diagnosticar', () => {
  it('varre a raiz injetada e devolve o contrato', () => {
    const { reforja } = montar({ arvore: ARVORE_COM_SINAL });
    const diagnostico = reforja.diagnosticar();
    expect(diagnosticoSchema.safeParse(diagnostico).success).toBe(true);
    expect(diagnostico.sinais.map((s) => s.id)).toEqual(['marcadores-pendentes', 'specs-sem-auditoria']);
    expect(diagnostico.arquivosLidos).toBe(2);
    expect(diagnostico.resumo).toEqual({ total: 2, alta: 0, media: 2, baixa: 0 });
  });

  it('não escreve nada e repete o resultado', () => {
    const { reforja, raizForge } = montar({ arvore: ARVORE_COM_SINAL });
    const antes = fs.readdirSync(raizForge, { recursive: true }).sort();
    expect(reforja.diagnosticar()).toEqual(reforja.diagnosticar());
    expect(fs.readdirSync(raizForge, { recursive: true }).sort()).toEqual(antes);
  });

  it('a raiz padrão é o repositório do Forge', () => {
    const db = abrirBanco(':memory:');
    migrar(db);
    const diagnostico = criarServicoReforja({ db }).diagnosticar();
    db.close();
    expect(diagnostico.arquivosLidos).toBeGreaterThan(50);
    expect(diagnosticoSchema.safeParse(diagnostico).success).toBe(true);
  });
});

describe('criar e listar', () => {
  it('cria item manual com o contrato completo e emite reforja.item_criado', () => {
    const { reforja, registrarEvento } = montar();
    const item = reforja.criar({ titulo: '  Dividir mensagens  ', descricao: '   ' });
    expect(itemSchema.safeParse(item).success).toBe(true);
    expect(item).toMatchObject({ titulo: 'Dividir mensagens', descricao: null, origem: 'manual', sinal: null, estado: 'proposta', prioridade: 'media', specCaminho: null });
    expect(registrarEvento).toHaveBeenCalledWith('reforja.item_criado', { itemId: item.id, origem: 'manual', sinal: null, prioridade: 'media' });
  });

  it('aceita origem modelo, para a proposta aceita pelo dono', () => {
    const { reforja } = montar();
    expect(reforja.criar({ titulo: 'Da sugestão', origem: 'modelo', prioridade: 'alta' })).toMatchObject({ origem: 'modelo', prioridade: 'alta' });
  });

  it('lista alta primeiro, depois mais antigo primeiro, com a contagem dos seis estados', () => {
    const { reforja } = montar();
    const baixa = reforja.criar({ titulo: 'baixa', prioridade: 'baixa' });
    const media1 = reforja.criar({ titulo: 'media 1' });
    const alta = reforja.criar({ titulo: 'alta', prioridade: 'alta' });
    const media2 = reforja.criar({ titulo: 'media 2' });
    reforja.mudarEstado(media2.id, 'descartada');

    const lista = reforja.listar();
    expect(listaItensSchema.safeParse(lista).success).toBe(true);
    expect(lista.itens.map((i) => i.id)).toEqual([alta.id, media1.id, media2.id, baixa.id]);
    expect(lista.contagem).toEqual({ proposta: 3, especificada: 0, em_construcao: 0, em_revisao: 0, concluida: 0, descartada: 1 });
  });

  it('lista vazia é lista vazia', () => {
    const { reforja } = montar();
    expect(reforja.listar().itens).toEqual([]);
  });
});

describe('transformarSinal', () => {
  it('cria item do diagnóstico com título, sugestão e prioridade do sinal', () => {
    const { reforja, registrarEvento } = montar({ arvore: ARVORE_COM_SINAL });
    const { item, criado } = reforja.transformarSinal('marcadores-pendentes');
    expect(criado).toBe(true);
    expect(item).toMatchObject({ origem: 'diagnostico', sinal: 'marcadores-pendentes', prioridade: 'media', titulo: 'Marcadores de pendência no código' });
    expect(item.descricao).toMatch(/backlog/);
    expect(registrarEvento).toHaveBeenCalledWith('reforja.item_criado', expect.objectContaining({ origem: 'diagnostico', sinal: 'marcadores-pendentes' }));
  });

  it('não duplica item aberto do mesmo sinal, em qualquer estado aberto', () => {
    const { reforja } = montar({ arvore: ARVORE_COM_SINAL });
    const primeiro = reforja.transformarSinal('marcadores-pendentes').item;
    reforja.mudarEstado(primeiro.id, 'especificada');
    reforja.mudarEstado(primeiro.id, 'em_construcao');
    const segundo = reforja.transformarSinal('marcadores-pendentes');
    expect(segundo.criado).toBe(false);
    expect(segundo.item.id).toBe(primeiro.id);
    expect(reforja.listar().itens).toHaveLength(1);
  });

  it('com o item anterior descartado ou concluído, cria outro', () => {
    const { reforja } = montar({ arvore: ARVORE_COM_SINAL });
    const primeiro = reforja.transformarSinal('marcadores-pendentes').item;
    reforja.mudarEstado(primeiro.id, 'descartada');
    const segundo = reforja.transformarSinal('marcadores-pendentes');
    expect(segundo.criado).toBe(true);
    for (const para of ['especificada', 'em_construcao', 'em_revisao', 'concluida']) reforja.mudarEstado(segundo.item.id, para);
    expect(reforja.transformarSinal('marcadores-pendentes').criado).toBe(true);
  });

  it('sinal fora do diagnóstico atual é FORGE_NOT_FOUND', () => {
    const { reforja } = montar({ arvore: ARVORE_COM_SINAL });
    expect(erroDe(() => reforja.transformarSinal('arquivos-grandes'))?.codigo).toBe('FORGE_NOT_FOUND');
    expect(erroDe(() => reforja.transformarSinal('inventado'))?.codigo).toBe('FORGE_NOT_FOUND');
  });
});

describe('mudarEstado', () => {
  it('aplica transição válida e emite reforja.estado_mudou', () => {
    const { reforja, registrarEvento } = montar();
    const item = reforja.criar({ titulo: 'x' });
    const atualizado = reforja.mudarEstado(item.id, 'especificada');
    expect(atualizado.estado).toBe('especificada');
    expect(reforja.obterOuFalhar(item.id).estado).toBe('especificada');
    expect(registrarEvento).toHaveBeenCalledWith('reforja.estado_mudou', { itemId: item.id, de: 'proposta', para: 'especificada' });
  });

  it('transição inválida é FORGE_CONFLICT com de e para, e não muda nada', () => {
    const { reforja } = montar();
    const item = reforja.criar({ titulo: 'x' });
    const erro = erroDe(() => reforja.mudarEstado(item.id, 'concluida'));
    expect(erro?.codigo).toBe('FORGE_CONFLICT');
    expect(erro.detalhe).toEqual({ de: 'proposta', para: 'concluida' });
    expect(reforja.obterOuFalhar(item.id).estado).toBe('proposta');
  });

  it('mesmo estado é idempotente e não emite evento', () => {
    const { reforja, registrarEvento } = montar();
    const item = reforja.criar({ titulo: 'x' });
    reforja.mudarEstado(item.id, 'descartada');
    registrarEvento.mockClear();
    expect(reforja.mudarEstado(item.id, 'descartada').estado).toBe('descartada');
    expect(registrarEvento).not.toHaveBeenCalled();
  });

  it('descartada pode ser restaurada como proposta', () => {
    const { reforja } = montar();
    const item = reforja.criar({ titulo: 'x' });
    reforja.mudarEstado(item.id, 'descartada');
    expect(reforja.mudarEstado(item.id, 'proposta').estado).toBe('proposta');
  });

  it('item inexistente é FORGE_NOT_FOUND', () => {
    const { reforja } = montar();
    expect(erroDe(() => reforja.mudarEstado('nao-existe', 'especificada'))?.codigo).toBe('FORGE_NOT_FOUND');
  });
});

describe('spec por template', () => {
  it('o template versionado passa no manifesto e cobre as seis seções do /spec', () => {
    const { spec } = carregarTemplatesReforja();
    expect(manifestoSpecSchema.safeParse(spec.manifesto).success).toBe(true);
    for (const secao of ['## 1. Escopo', '## 2. Fora de escopo', '## 3. Arquivos afetados', '## 4. Critérios de aceite', '## 5. Edge cases conhecidos', '## 6. Definição de "aprovado sem ressalvas"']) {
      expect(spec.texto).toContain(secao);
    }
  });

  it('a prévia não escreve, diz o caminho e se existe, e repete o conteúdo', () => {
    const { reforja, raizForge } = montar();
    const item = reforja.criar({ titulo: 'Remover logs do índice' });
    const previa = reforja.previaSpec(item.id);
    expect(previaSpecSchema.safeParse(previa).success).toBe(true);
    expect(previa).toMatchObject({ caminho: 'specs/reforja-remover-logs-do-indice.md', existe: false, versaoTemplate: '1.0.0' });
    expect(chavesUsadas(previa.conteudo)).toEqual([]);
    expect(previa.conteudo).toContain('_a definir_');
    expect(previa.conteudo).toContain('Remover logs do índice');
    expect(reforja.previaSpec(item.id).conteudo).toBe(previa.conteudo);
    expect(fs.existsSync(path.join(raizForge, 'specs'))).toBe(false);
  });

  it('gravar cria a pasta, escreve o mesmo conteúdo da prévia, guarda o caminho e move para especificada', () => {
    const { reforja, raizForge, registrarEvento } = montar();
    const item = reforja.criar({ titulo: 'Remover logs', descricao: 'Tirar do servidor.' });
    const previa = reforja.previaSpec(item.id);
    const resultado = reforja.gerarSpec(item.id);

    expect(specGeradaSchema.safeParse(resultado).success).toBe(true);
    expect(resultado).toMatchObject({ caminho: 'specs/reforja-remover-logs.md', sobrescrito: false });
    expect(fs.readFileSync(path.join(raizForge, 'specs', 'reforja-remover-logs.md'), 'utf8')).toBe(previa.conteudo);
    expect(reforja.obterOuFalhar(item.id)).toMatchObject({ specCaminho: 'specs/reforja-remover-logs.md', estado: 'especificada' });
    expect(registrarEvento).toHaveBeenCalledWith('reforja.spec_gerada', { itemId: item.id, sobrescrito: false, versaoTemplate: '1.0.0' });
    expect(registrarEvento).toHaveBeenCalledWith('reforja.estado_mudou', { itemId: item.id, de: 'proposta', para: 'especificada' });
    expect(reforja.previaSpec(item.id).existe).toBe(true);
  });

  it('arquivo existente sem confirmação é FORGE_CONFLICT e o arquivo fica intacto', () => {
    const { reforja, raizForge } = montar({ arvore: { 'specs/reforja-ja-existe.md': 'conteúdo do dono' } });
    const item = reforja.criar({ titulo: 'Já existe' });
    expect(reforja.previaSpec(item.id).existe).toBe(true);

    for (const opcoes of [undefined, {}, { sobrescrever: false }]) {
      const erro = erroDe(() => reforja.gerarSpec(item.id, opcoes));
      expect(erro?.codigo).toBe('FORGE_CONFLICT');
      expect(erro.detalhe).toEqual({ caminho: 'specs/reforja-ja-existe.md' });
    }
    expect(fs.readFileSync(path.join(raizForge, 'specs', 'reforja-ja-existe.md'), 'utf8')).toBe('conteúdo do dono');
    expect(reforja.obterOuFalhar(item.id)).toMatchObject({ specCaminho: null, estado: 'proposta' });
  });

  it('com sobrescrita confirmada, grava por cima', () => {
    const { reforja, raizForge } = montar({ arvore: { 'specs/reforja-ja-existe.md': 'antigo' } });
    const item = reforja.criar({ titulo: 'Já existe' });
    expect(reforja.gerarSpec(item.id, { sobrescrever: true }).sobrescrito).toBe(true);
    expect(fs.readFileSync(path.join(raizForge, 'specs', 'reforja-ja-existe.md'), 'utf8')).toContain('# Reforja, Já existe');
  });

  it('item em estado posterior mantém o estado; item descartado não gera spec', () => {
    const { reforja } = montar();
    const adiantado = reforja.criar({ titulo: 'adiantado' });
    reforja.mudarEstado(adiantado.id, 'especificada');
    reforja.mudarEstado(adiantado.id, 'em_construcao');
    expect(reforja.gerarSpec(adiantado.id).item.estado).toBe('em_construcao');

    const descartado = reforja.criar({ titulo: 'descartado' });
    reforja.mudarEstado(descartado.id, 'descartada');
    expect(erroDe(() => reforja.previaSpec(descartado.id))?.codigo).toBe('FORGE_CONFLICT');
    expect(erroDe(() => reforja.gerarSpec(descartado.id))?.codigo).toBe('FORGE_CONFLICT');
  });

  it('título com path traversal não sai de specs/', () => {
    const { reforja, raizForge } = montar();
    const item = reforja.criar({ titulo: '../../fora/do/forge' });
    const { caminho } = reforja.gerarSpec(item.id);
    expect(caminho).toBe('specs/reforja-fora-do-forge.md');
    expect(fs.existsSync(path.join(raizForge, 'specs', 'reforja-fora-do-forge.md'))).toBe(true);
    expect(fs.existsSync(path.join(raizForge, '..', 'fora'))).toBe(false);
  });

  it('pasta specs apontando para fora da raiz é FORGE_PATH_FORBIDDEN, sem escrever nada lá', () => {
    const { reforja, raizForge } = montar();
    const fora = criarPastaTemporaria('kora-forge-reforja-fora-');
    limpar.push(() => fs.rmSync(fora, { recursive: true, force: true }));
    fs.symlinkSync(fora, path.join(raizForge, 'specs'), 'junction');
    const item = reforja.criar({ titulo: 'Tentativa' });

    expect(erroDe(() => reforja.previaSpec(item.id))?.codigo).toBe('FORGE_PATH_FORBIDDEN');
    expect(erroDe(() => reforja.gerarSpec(item.id))?.codigo).toBe('FORGE_PATH_FORBIDDEN');
    expect(fs.readdirSync(fora)).toEqual([]);
    expect(reforja.obterOuFalhar(item.id).specCaminho).toBeNull();
  });

  it('item inexistente é FORGE_NOT_FOUND', () => {
    const { reforja } = montar();
    expect(erroDe(() => reforja.previaSpec('nao-existe'))?.codigo).toBe('FORGE_NOT_FOUND');
    expect(erroDe(() => reforja.gerarSpec('nao-existe'))?.codigo).toBe('FORGE_NOT_FOUND');
  });
});

describe('contratos de entrada', () => {
  it.each([
    ['título ausente', {}],
    ['título só de espaços', { titulo: '   ' }],
    ['título longo demais', { titulo: 'a'.repeat(121) }],
    ['descrição longa demais', { titulo: 'ok', descricao: 'a'.repeat(2001) }],
    ['prioridade fora do enum', { titulo: 'ok', prioridade: 'urgente' }],
    ['origem diagnóstico pela criação comum', { titulo: 'ok', origem: 'diagnostico' }],
    ['campo desconhecido', { titulo: 'ok', estado: 'concluida' }],
  ])('criar recusa %s', (_rotulo, entrada) => {
    expect(criarItemSchema.safeParse(entrada).success).toBe(false);
  });

  it('sinalId só aceita id no formato do catálogo, e estado só do enum', () => {
    expect(transformarSinalSchema.safeParse({ sinalId: 'arquivos-grandes' }).success).toBe(true);
    expect(transformarSinalSchema.safeParse({ sinalId: '../x' }).success).toBe(false);
    expect(mudarEstadoSchema.safeParse({ para: 'em_revisao' }).success).toBe(true);
    expect(mudarEstadoSchema.safeParse({ para: 'apagada' }).success).toBe(false);
  });
});
