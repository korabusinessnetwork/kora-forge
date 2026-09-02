import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const PASTA_MIGRATIONS = fileURLToPath(new URL('./migrations/', import.meta.url));
const PADRAO_NOME = /^\d{8}_[a-z0-9_]+\.sql$/;

export function listarMigrations(pasta = PASTA_MIGRATIONS) {
  return fs.readdirSync(pasta).filter((nome) => PADRAO_NOME.test(nome)).sort();
}

// Aplica as migrations pendentes em ordem lexicográfica, cada uma na própria transação,
// e registra em schema_migrations. Rodar de novo não reaplica nada.
export function migrar(db, pasta = PASTA_MIGRATIONS) {
  db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (versao TEXT PRIMARY KEY, aplicada_em TEXT NOT NULL)');
  const aplicadas = new Set(db.prepare('SELECT versao FROM schema_migrations').all().map((linha) => linha.versao));
  const registrar = db.prepare('INSERT INTO schema_migrations (versao, aplicada_em) VALUES (?, ?)');
  const novas = [];
  for (const arquivo of listarMigrations(pasta)) {
    const versao = arquivo.replace(/\.sql$/, '');
    if (aplicadas.has(versao)) continue;
    const sql = fs.readFileSync(path.join(pasta, arquivo), 'utf8');
    db.transaction(() => {
      db.exec(sql);
      registrar.run(versao, new Date().toISOString());
    })();
    novas.push(versao);
  }
  return novas;
}
