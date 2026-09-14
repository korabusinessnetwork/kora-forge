#!/usr/bin/env node
// Sobe o OmniRoute instalado globalmente, preso em 127.0.0.1, para os modelos gratuitos do Forge
// (ADR-013, D05 e D07). O OmniRoute é software de terceiros: este script só garante o jeito seguro
// de subir, e nunca cadastra provedor nem chave. Chave de provedor é cadastrada pelo dono no
// dashboard do próprio OmniRoute, e só de provedor com tier gratuito oficial.
//
// Uso: npm run omniroute
//
// Segredos (senha inicial do dashboard, JWT_SECRET, API_KEY_SECRET) são gerados na primeira vez
// e ficam em ~/.kora-forge/omniroute/omniroute.env, fora do repositório. O script nunca imprime
// os valores, só o caminho do arquivo.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';

const HOST = '127.0.0.1';
const PORTA = '20128';
const PASTA = path.join(os.homedir(), '.kora-forge', 'omniroute');
const ARQUIVO_ENV = path.join(PASTA, 'omniroute.env');

function raizGlobalDoNpm() {
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const r = spawnSync(npm, ['root', '-g'], { encoding: 'utf8', shell: process.platform === 'win32' });
  if (r.status !== 0) throw new Error('não consegui descobrir a pasta global do npm.');
  return r.stdout.trim();
}

function lerEnv(arquivo) {
  const saida = {};
  for (const linha of fs.readFileSync(arquivo, 'utf8').split(/\r?\n/)) {
    const m = linha.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) saida[m[1]] = m[2];
  }
  return saida;
}

function garantirEnv() {
  if (fs.existsSync(ARQUIVO_ENV)) return lerEnv(ARQUIVO_ENV);
  fs.mkdirSync(path.join(PASTA, 'dados'), { recursive: true });
  const segredo = () => randomBytes(32).toString('hex');
  const valores = {
    INITIAL_PASSWORD: randomBytes(18).toString('base64url'),
    JWT_SECRET: segredo(),
    API_KEY_SECRET: segredo(),
  };
  fs.writeFileSync(ARQUIVO_ENV, `${Object.entries(valores).map(([k, v]) => `${k}=${v}`).join('\n')}\n`, { mode: 0o600 });
  return valores;
}

const pacote = path.join(raizGlobalDoNpm(), 'omniroute');
const servidor = path.join(pacote, 'dist', 'server.js');
if (!fs.existsSync(servidor)) {
  process.stderr.write('OmniRoute não encontrado. Instale com: npm install -g omniroute\n');
  process.exit(1);
}

const segredos = garantirEnv();
const env = {
  ...process.env,
  ...segredos,
  // Host e porta são forçados aqui, depois do arquivo: o padrão do OmniRoute é 0.0.0.0.
  HOSTNAME: HOST,
  OMNIROUTE_SERVER_HOST: HOST,
  PORT: PORTA,
  // Sem chave na API de inferência só porque o bind é loopback: nada fora desta máquina alcança a
  // porta, e o Forge não guarda chave nenhuma até o cofre existir (D04 e D07).
  REQUIRE_API_KEY: 'false',
  NODE_ENV: 'production',
  DATA_DIR: path.join(PASTA, 'dados'),
  BASE_URL: `http://${HOST}:${PORTA}`,
  NEXT_PUBLIC_BASE_URL: `http://${HOST}:${PORTA}`,
};

process.stdout.write(`OmniRoute em http://${HOST}:${PORTA} (só nesta máquina).\n`);
process.stdout.write(`Senha inicial do dashboard: no arquivo ${ARQUIVO_ENV}, chave INITIAL_PASSWORD.\n`);
process.stdout.write('Cadastre só provedores com tier gratuito oficial: Gemini API, Groq, Cerebras, OpenRouter (:free) e Mistral.\n');

const filho = spawn(process.execPath, [servidor], { cwd: path.dirname(servidor), env, stdio: 'inherit', shell: false });
const encerrar = () => filho.kill();
process.on('SIGINT', encerrar);
process.on('SIGTERM', encerrar);
filho.on('exit', (codigo) => process.exit(codigo ?? 0));
