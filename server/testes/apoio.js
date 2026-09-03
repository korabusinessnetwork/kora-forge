import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { abrirBanco } from '../db/conexao.js';
import { migrar } from '../db/migrar.js';
import { construirApp } from '../app.js';
import { carregarPresetsBuiltin, sincronizarPresets } from '../modules/presets/servico.js';

export const TOKEN_TESTE = 'a'.repeat(64);

export function criarPastaTemporaria(prefixo = 'kora-forge-teste-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefixo));
}

export function criarAppDeTeste({ pluginsApi = [], config: extra = {}, pastaDist = null } = {}) {
  const home = criarPastaTemporaria();
  const db = abrirBanco(':memory:');
  migrar(db);
  sincronizarPresets(db, carregarPresetsBuiltin());
  const config = {
    host: '127.0.0.1',
    porta: 7337,
    portaDev: 5173,
    home,
    workspacePadrao: null,
    copilotoLigado: false,
    copilotoTetoUsdPadrao: 5,
    ...extra,
  };
  const app = construirApp({ db, tokenSessao: TOKEN_TESTE, config, versao: '0.0.0-teste', logger: false, pluginsApi, pastaDist });
  const cabecalhos = {
    host: '127.0.0.1:7337',
    'x-forge-token': TOKEN_TESTE,
    origin: 'http://127.0.0.1:5173',
  };
  const fechar = async () => {
    await app.close();
    db.close();
    fs.rmSync(home, { recursive: true, force: true });
  };
  return { app, db, home, config, cabecalhos, fechar };
}
