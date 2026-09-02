import path from 'node:path';
import { carregarConfig } from '../config.js';
import { prepararHome } from '../boot.js';
import { abrirBanco } from '../db/conexao.js';
import { migrar } from '../db/migrar.js';
import { RAIZ, encerrarComErro } from './apoio.js';

// npm run db:migrate. Aplica só o que falta e diz o que fez.
try {
  const config = carregarConfig({ raiz: RAIZ });
  prepararHome(config.home);
  const db = abrirBanco(path.join(config.home, 'forge.db'));
  const novas = migrar(db);
  db.close();
  console.log(novas.length > 0 ? `Migrations aplicadas: ${novas.join(', ')}` : 'Nada a aplicar: banco já está em dia.');
} catch (erro) {
  encerrarComErro(erro);
}
