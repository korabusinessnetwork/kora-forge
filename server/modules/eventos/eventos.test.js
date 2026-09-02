import { describe, it, expect } from 'vitest';
import { abrirBanco } from '../../db/conexao.js';
import { migrar } from '../../db/migrar.js';
import { criarRegistradorDeEventos } from './servico.js';

function banco() {
  const db = abrirBanco(':memory:');
  migrar(db);
  return db;
}

describe('registrador de eventos', () => {
  it('grava nome dot.case, payload em JSON e ts ISO', () => {
    const db = banco();
    const registrar = criarRegistradorDeEventos({ db });
    expect(registrar('projeto.criado', { slug: 'x' })).toBe(true);
    const linha = db.prepare('SELECT nome, project_id, payload_json, ts FROM events').get();
    expect(linha.nome).toBe('projeto.criado');
    expect(linha.project_id).toBeNull();
    expect(JSON.parse(linha.payload_json)).toEqual({ slug: 'x' });
    expect(new Date(linha.ts).toISOString()).toBe(linha.ts);
    db.close();
  });

  it('nome fora do padrão dot.case não grava e não lança', () => {
    const db = banco();
    const avisos = [];
    const registrar = criarRegistradorDeEventos({ db, log: { warn: (dados, msg) => avisos.push([dados, msg]) } });
    expect(registrar('ProjetoCriado')).toBe(false);
    expect(db.prepare('SELECT count(*) AS n FROM events').get().n).toBe(0);
    expect(avisos).toHaveLength(1);
    db.close();
  });

  it('falha de banco vira aviso, nunca exceção', () => {
    const db = banco();
    const registrar = criarRegistradorDeEventos({ db, log: { warn: () => {} } });
    db.exec('DROP TABLE events');
    expect(() => registrar('projeto.criado')).not.toThrow();
    expect(registrar('projeto.criado')).toBe(false);
    db.close();
  });
});
