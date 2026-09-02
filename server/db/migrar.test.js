import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { abrirBanco } from './conexao.js';
import { migrar, listarMigrations, PASTA_MIGRATIONS } from './migrar.js';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const SCHEMA_DOCUMENTADO = path.join(RAIZ, 'docs/04_MODELAGEM/schema.sql');

function esquema(db) {
  return db.prepare("SELECT type, name, tbl_name, sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type, name").all();
}
function colunas(db, tabela) {
  return db.pragma(`table_info(${tabela})`);
}

describe('migrations', () => {
  it('nomes seguem YYYYMMDD_descricao.sql e vêm em ordem', () => {
    const lista = listarMigrations();
    expect(lista.length).toBeGreaterThan(0);
    for (const nome of lista) expect(nome).toMatch(/^\d{8}_[a-z0-9_]+\.sql$/);
    expect([...lista].sort()).toEqual(lista);
  });

  it('aplica uma vez, registra em schema_migrations e não reaplica', () => {
    const db = abrirBanco(':memory:');
    const primeira = migrar(db);
    expect(primeira).toEqual(listarMigrations().map((nome) => nome.replace(/\.sql$/, '')));
    const registradas = db.prepare('SELECT versao, aplicada_em FROM schema_migrations ORDER BY versao').all();
    expect(registradas.map((linha) => linha.versao)).toEqual(primeira);
    for (const linha of registradas) expect(() => new Date(linha.aplicada_em).toISOString()).not.toThrow();
    expect(migrar(db)).toEqual([]);
    expect(db.prepare('SELECT count(*) AS n FROM schema_migrations').get().n).toBe(primeira.length);
    db.close();
  });

  it('espelha docs/04_MODELAGEM/schema.sql, tabela por tabela', () => {
    const documentado = abrirBanco(':memory:');
    documentado.exec(fs.readFileSync(SCHEMA_DOCUMENTADO, 'utf8'));
    const migrado = abrirBanco(':memory:');
    migrar(migrado);

    const esperado = esquema(documentado);
    const obtido = esquema(migrado);
    expect(obtido.map((o) => [o.type, o.name, o.tbl_name])).toEqual(esperado.map((e) => [e.type, e.name, e.tbl_name]));
    for (const objeto of esperado.filter((o) => o.type === 'table' && o.name !== 'schema_migrations')) {
      expect(colunas(migrado, objeto.name)).toEqual(colunas(documentado, objeto.name));
    }
    documentado.close();
    migrado.close();
  });

  it('liga foreign_keys e WAL em banco de arquivo', () => {
    const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'kora-forge-db-'));
    const db = abrirBanco(path.join(pasta, 'sub', 'forge.db'));
    expect(db.pragma('foreign_keys', { simple: true })).toBe(1);
    expect(db.pragma('journal_mode', { simple: true })).toBe('wal');
    db.close();
    fs.rmSync(pasta, { recursive: true, force: true });
  });

  it('migration quebrada não deixa metade aplicada nem registro', () => {
    const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'kora-forge-mig-'));
    fs.writeFileSync(path.join(pasta, '20990101_quebrada.sql'), 'CREATE TABLE metade (id TEXT);\nCREATE TABLE quebrada (;');
    const db = abrirBanco(':memory:');
    expect(() => migrar(db, pasta)).toThrow();
    expect(db.prepare("SELECT name FROM sqlite_master WHERE name = 'metade'").get()).toBeUndefined();
    expect(db.prepare('SELECT count(*) AS n FROM schema_migrations').get().n).toBe(0);
    db.close();
    fs.rmSync(pasta, { recursive: true, force: true });
  });

  it('pasta padrão de migrations é a do servidor', () => {
    expect(PASTA_MIGRATIONS).toContain(path.join('server', 'db', 'migrations'));
  });
});
