import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { z } from 'zod';
import { ErroForge } from './lib/erro.js';
import { formatarIssues } from './lib/validar.js';

// Bind fixo por decisão (S-01, controle C1). Não vem de env, de settings nem de argumento.
export const HOST_API = '127.0.0.1';
// Porta do dev server do Vite, fixa em vite.config.js (strictPort). Entra na allowlist de Origin.
export const PORTA_DEV = 5173;

const envSchema = z.object({
  FORGE_PORT: z.coerce.number().int().min(1024).max(65535).default(7337),
  FORGE_HOME: z.string().min(1).default(path.join(os.homedir(), '.kora-forge')),
  FORGE_WORKSPACE: z.string().default(''),
  FORGE_COPILOT: z.enum(['on', 'off']).default('off'),
  FORGE_COPILOT_BUDGET_USD: z.coerce.number().nonnegative().default(5),
});

// Parser mínimo de KEY=VALUE, sem dependência (restrição T-03).
export function lerEnvLocal(caminho) {
  if (!fs.existsSync(caminho)) return {};
  const saida = {};
  for (const linhaBruta of fs.readFileSync(caminho, 'utf8').split(/\r?\n/)) {
    const linha = linhaBruta.trim();
    if (!linha || linha.startsWith('#')) continue;
    const separador = linha.indexOf('=');
    if (separador <= 0) continue;
    const chave = linha.slice(0, separador).trim();
    let valor = linha.slice(separador + 1).trim();
    const aspas = (valor.startsWith('"') && valor.endsWith('"')) || (valor.startsWith("'") && valor.endsWith("'"));
    if (aspas && valor.length >= 2) valor = valor.slice(1, -1);
    saida[chave] = valor;
  }
  return saida;
}

function expandirHome(caminho) {
  if (caminho === '~' || caminho.startsWith('~/') || caminho.startsWith('~\\')) {
    return path.join(os.homedir(), caminho.slice(1));
  }
  return caminho;
}

export function carregarConfig({ env = process.env, raiz = process.cwd() } = {}) {
  const doArquivo = lerEnvLocal(path.join(raiz, '.env.local'));
  const bruto = {};
  for (const chave of Object.keys(envSchema.shape)) {
    const doProcesso = env[chave];
    const valor = doProcesso !== undefined && doProcesso !== '' ? doProcesso : doArquivo[chave];
    if (valor !== undefined && valor !== '') bruto[chave] = valor;
  }
  const resultado = envSchema.safeParse(bruto);
  if (!resultado.success) {
    throw new ErroForge('FORGE_CONFIG', 'Configuração inválida. Confira .env.local e as variáveis FORGE_*.', {
      issues: formatarIssues(resultado.error),
    });
  }
  const c = resultado.data;
  return Object.freeze({
    host: HOST_API,
    porta: c.FORGE_PORT,
    portaDev: PORTA_DEV,
    home: expandirHome(c.FORGE_HOME),
    workspacePadrao: c.FORGE_WORKSPACE || null,
    copilotoLigado: c.FORGE_COPILOT === 'on',
    copilotoTetoUsdPadrao: c.FORGE_COPILOT_BUDGET_USD,
  });
}
