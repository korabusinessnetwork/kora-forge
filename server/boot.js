import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { ErroForge } from './lib/erro.js';

export const SUBPASTAS_HOME = ['presets', 'logs'];

// Cria ~/.kora-forge/ e as subpastas. Idempotente: devolve só o que criou agora.
export function prepararHome(home) {
  const criadas = [];
  for (const pasta of [home, ...SUBPASTAS_HOME.map((sub) => path.join(home, sub))]) {
    if (!fs.existsSync(pasta)) {
      try {
        fs.mkdirSync(pasta, { recursive: true });
      } catch (erro) {
        throw new ErroForge('FORGE_CONFIG', `Não foi possível criar ${pasta}: ${erro.message}`);
      }
      criadas.push(pasta);
    }
  }
  try {
    fs.accessSync(home, fs.constants.W_OK);
  } catch {
    throw new ErroForge('FORGE_CONFIG', `Sem permissão de escrita em ${home}.`);
  }
  return criadas;
}

// Token de sessão: 32 bytes aleatórios em hex, recriado a cada boot, arquivo com modo 0600 (C2).
export function gerarTokenDeSessao(home) {
  const token = randomBytes(32).toString('hex');
  const arquivo = path.join(home, 'session.key');
  try {
    fs.writeFileSync(arquivo, token, { encoding: 'utf8', mode: 0o600 });
    fs.chmodSync(arquivo, 0o600);
  } catch (erro) {
    throw new ErroForge('FORGE_CONFIG', `Não foi possível gravar ${arquivo}: ${erro.message}`);
  }
  return token;
}

export function lerVersao(raiz) {
  const pacote = JSON.parse(fs.readFileSync(path.join(raiz, 'package.json'), 'utf8'));
  return pacote.version;
}
