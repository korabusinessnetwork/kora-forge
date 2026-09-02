import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

// Toda conexão liga foreign_keys e WAL. Um arquivo, zero configuração (ADR-001).
export function abrirBanco(caminho) {
  if (caminho !== ':memory:') fs.mkdirSync(path.dirname(caminho), { recursive: true });
  const db = new Database(caminho);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}
