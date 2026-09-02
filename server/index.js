import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { carregarConfig } from './config.js';
import { prepararHome, gerarTokenDeSessao, lerVersao } from './boot.js';
import { abrirBanco } from './db/conexao.js';
import { migrar } from './db/migrar.js';
import { construirApp } from './app.js';

const RAIZ = fileURLToPath(new URL('../', import.meta.url));
// --dev (npm run forge): o front vem do Vite, dist/ é ignorado mesmo que exista um build antigo.
const MODO_DEV = process.argv.includes('--dev');

async function iniciar() {
  const config = carregarConfig({ raiz: RAIZ });
  prepararHome(config.home);
  const db = abrirBanco(path.join(config.home, 'forge.db'));
  const migradas = migrar(db);
  const tokenSessao = gerarTokenDeSessao(config.home);
  const versao = lerVersao(RAIZ);
  const pastaDist = MODO_DEV ? null : path.join(RAIZ, 'dist');
  const servindoFront = pastaDist !== null && fs.existsSync(path.join(pastaDist, 'index.html'));

  const app = construirApp({ db, tokenSessao, config, versao, logger: true, pastaDist });
  await app.listen({ host: config.host, port: config.porta });

  // O token vai no fragmento da URL: nunca chega ao servidor, nunca entra em log de acesso.
  const url = servindoFront
    ? `http://127.0.0.1:${config.porta}/#token=${tokenSessao}`
    : `http://127.0.0.1:${config.portaDev}/#token=${tokenSessao}`;
  console.log('');
  console.log(`KORA FORGE ${versao}`);
  console.log(`API local:  http://127.0.0.1:${config.porta}/api`);
  if (migradas.length > 0) console.log(`Migrations aplicadas agora: ${migradas.join(', ')}`);
  if (!MODO_DEV && !servindoFront) console.log('Sem dist/: rode npm run build para servir o front daqui, ou npm run forge para desenvolver.');
  console.log('Abra no browser (o link carrega o token de sessão):');
  console.log(`  ${url}`);
  console.log('');

  const encerrar = async () => {
    await app.close();
    db.close();
    process.exit(0);
  };
  process.once('SIGINT', encerrar);
  process.once('SIGTERM', encerrar);
}

iniciar().catch((erro) => {
  if (erro?.code === 'EADDRINUSE') {
    console.error('FORGE_PORT_IN_USE: a porta da API local já está em uso. Feche o outro processo ou mude FORGE_PORT em .env.local.');
  } else if (erro?.codigo) {
    console.error(`${erro.codigo}: ${erro.message}`);
    for (const issue of erro.detalhe?.issues ?? []) console.error(`  ${issue.caminho}: ${issue.mensagem}`);
  } else {
    console.error(`FORGE_INTERNAL: ${erro?.message ?? erro}`);
  }
  process.exit(1);
});
