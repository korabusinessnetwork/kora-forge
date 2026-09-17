import { describe, it, expect, vi } from 'vitest';
import { abrirBanco } from '../../db/conexao.js';
import { migrar } from '../../db/migrar.js';
import { criarServicoIdeias } from './servico.js';
import { criarIdeiaSchema, ideiaSchema, listaIdeiasSchema, patchIdeiaSchema } from '../../../shared/schemas/ideia.js';

function montar() {
  const db = abrirBanco(':memory:');
  migrar(db);
  const registrarEvento = vi.fn(() => true);
  return { db, registrarEvento, ideias: criarServicoIdeias({ db, registrarEvento }) };
}

describe('criar', () => {
  it('grava a ideia aberta e devolve o contrato completo', () => {
    const { ideias, db } = montar();
    const ideia = ideias.criar({ titulo: 'Exportar o blueprint em PDF', proximoPasso: 'ver se dá para reusar o gerador' });

    expect(ideiaSchema.safeParse(ideia).success).toBe(true);
    expect(ideia.estado).toBe('aberta');
    expect(ideia.titulo).toBe('Exportar o blueprint em PDF');
    expect(ideia.proximoPasso).toBe('ver se dá para reusar o gerador');
    expect(new Date(ideia.criadoEm).toISOString()).toBe(ideia.criadoEm);
    db.close();
  });

  it('apara o título e guarda próximo passo e origem vazios como null, não como string vazia', () => {
    const { ideias, db } = montar();
    const ideia = ideias.criar({ titulo: '  com espaço nas pontas  ', proximoPasso: '   ', origem: '' });

    expect(ideia.titulo).toBe('com espaço nas pontas');
    expect(ideia.proximoPasso).toBeNull();
    expect(ideia.origem).toBeNull();
    db.close();
  });

  it('guarda a origem, para saber de que tela a ideia saiu', () => {
    const { ideias, db } = montar();
    expect(ideias.criar({ titulo: 'x', origem: 'wizard/materializar' }).origem).toBe('wizard/materializar');
    db.close();
  });

  it('emite ideia.registrada', () => {
    const { ideias, registrarEvento, db } = montar();
    ideias.criar({ titulo: 'x', origem: 'registry' });
    expect(registrarEvento).toHaveBeenCalledWith('ideia.registrada', { origem: 'registry' });
    db.close();
  });
});

describe('listar', () => {
  it('devolve as abertas, mais recentes primeiro', () => {
    const { ideias, db } = montar();
    const primeira = ideias.criar({ titulo: 'primeira' });
    const segunda = ideias.criar({ titulo: 'segunda' });

    const lista = ideias.listar();
    expect(listaIdeiasSchema.safeParse(lista).success).toBe(true);
    expect(lista.ideias.map((i) => i.id)).toEqual([segunda.id, primeira.id]);
    db.close();
  });

  it('não devolve as descartadas', () => {
    const { ideias, db } = montar();
    const fica = ideias.criar({ titulo: 'fica' });
    const sai = ideias.criar({ titulo: 'sai' });
    ideias.mudarEstado(sai.id, 'descartada');

    expect(ideias.listar().ideias.map((i) => i.id)).toEqual([fica.id]);
    db.close();
  });

  it('lista vazia é lista vazia, não erro', () => {
    const { ideias, db } = montar();
    expect(ideias.listar()).toEqual({ ideias: [] });
    db.close();
  });
});

describe('mudarEstado', () => {
  it('descarta e emite ideia.descartada', () => {
    const { ideias, registrarEvento, db } = montar();
    const ideia = ideias.criar({ titulo: 'x' });

    expect(ideias.mudarEstado(ideia.id, 'descartada').estado).toBe('descartada');
    expect(registrarEvento).toHaveBeenCalledWith('ideia.descartada', { ideiaId: ideia.id });
    db.close();
  });

  it('descartar duas vezes é idempotente e não emite o evento de novo', () => {
    const { ideias, registrarEvento, db } = montar();
    const ideia = ideias.criar({ titulo: 'x' });
    ideias.mudarEstado(ideia.id, 'descartada');
    registrarEvento.mockClear();

    expect(ideias.mudarEstado(ideia.id, 'descartada').estado).toBe('descartada');
    expect(registrarEvento).not.toHaveBeenCalled();
    db.close();
  });

  it('ideia inexistente vira FORGE_NOT_FOUND', () => {
    const { ideias, db } = montar();
    let erro;
    try { ideias.mudarEstado('nao-existe', 'descartada'); } catch (e) { erro = e; }
    expect(erro?.codigo).toBe('FORGE_NOT_FOUND');
    db.close();
  });
});

describe('contrato de entrada', () => {
  it.each([
    ['título ausente', {}],
    ['título vazio', { titulo: '' }],
    ['título só de espaços', { titulo: '     ' }],
    ['título longo demais', { titulo: 'a'.repeat(121) }],
    ['próximo passo longo demais', { titulo: 'ok', proximoPasso: 'a'.repeat(501) }],
    ['origem longa demais', { titulo: 'ok', origem: 'a'.repeat(81) }],
    ['campo desconhecido', { titulo: 'ok', prioridade: 'alta' }],
  ])('recusa %s', (_rotulo, entrada) => {
    expect(criarIdeiaSchema.safeParse(entrada).success).toBe(false);
  });

  it('aceita só o título, porque o próximo passo é opcional', () => {
    expect(criarIdeiaSchema.safeParse({ titulo: 'só isso' }).success).toBe(true);
  });

  it('o patch só aceita estado do enum', () => {
    expect(patchIdeiaSchema.safeParse({ estado: 'descartada' }).success).toBe(true);
    expect(patchIdeiaSchema.safeParse({ estado: 'qualquer' }).success).toBe(false);
    expect(patchIdeiaSchema.safeParse({ estado: 'aberta', titulo: 'x' }).success).toBe(false);
  });
});
