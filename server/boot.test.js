import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { prepararHome, gerarTokenDeSessao, lerVersao, SUBPASTAS_HOME } from './boot.js';

// fileURLToPath, e não `.pathname`: no Windows o pathname de uma file URL vem como
// `/C:/…`, e juntá-lo com path.join produziria `C:\C:\…` (restrição T-02).
const RAIZ = fileURLToPath(new URL('../', import.meta.url));

describe('prepararHome', () => {
  it('cria home, presets e logs, e é idempotente', () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), 'kora-forge-home-'));
    const home = path.join(base, '.kora-forge');
    const criadas = prepararHome(home);
    expect(criadas).toEqual([home, ...SUBPASTAS_HOME.map((s) => path.join(home, s))]);
    for (const pasta of criadas) expect(fs.statSync(pasta).isDirectory()).toBe(true);
    expect(prepararHome(home)).toEqual([]);
    fs.rmSync(base, { recursive: true, force: true });
  });
});

describe('gerarTokenDeSessao', () => {
  it('gera 32 bytes em hex, grava com modo 0600 e recria a cada chamada', () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'kora-forge-token-'));
    const primeiro = gerarTokenDeSessao(home);
    expect(primeiro).toMatch(/^[0-9a-f]{64}$/);
    const arquivo = path.join(home, 'session.key');
    expect(fs.readFileSync(arquivo, 'utf8')).toBe(primeiro);
    if (process.platform !== 'win32') expect(fs.statSync(arquivo).mode & 0o777).toBe(0o600);
    const segundo = gerarTokenDeSessao(home);
    expect(segundo).not.toBe(primeiro);
    expect(fs.readFileSync(arquivo, 'utf8')).toBe(segundo);
    fs.rmSync(home, { recursive: true, force: true });
  });
});

describe('lerVersao', () => {
  it('lê a versão do package.json', () => {
    expect(lerVersao(RAIZ)).toMatch(/^\d+\.\d+\.\d+/);
  });
});
