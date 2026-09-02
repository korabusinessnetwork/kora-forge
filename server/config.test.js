import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { carregarConfig, lerEnvLocal, HOST_API, PORTA_DEV } from './config.js';

function raizTemporaria(conteudoEnvLocal) {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'kora-forge-cfg-'));
  if (conteudoEnvLocal !== undefined) fs.writeFileSync(path.join(raiz, '.env.local'), conteudoEnvLocal);
  return raiz;
}

describe('carregarConfig', () => {
  it('usa os defaults de INSTALACAO.md sem env nem .env.local', () => {
    const config = carregarConfig({ env: {}, raiz: raizTemporaria() });
    expect(config.host).toBe('127.0.0.1');
    expect(config.porta).toBe(7337);
    expect(config.portaDev).toBe(PORTA_DEV);
    expect(config.home).toBe(path.join(os.homedir(), '.kora-forge'));
    expect(config.workspacePadrao).toBeNull();
    expect(config.copilotoLigado).toBe(false);
    expect(config.copilotoTetoUsdPadrao).toBe(5);
  });

  it('ignora FORGE_HOST: o bind é sempre 127.0.0.1', () => {
    const config = carregarConfig({ env: { FORGE_HOST: '0.0.0.0', HOST: '0.0.0.0' }, raiz: raizTemporaria('FORGE_HOST=0.0.0.0\n') });
    expect(config.host).toBe(HOST_API);
    expect(config.host).toBe('127.0.0.1');
    expect(Object.isFrozen(config)).toBe(true);
  });

  it('lê .env.local e deixa o ambiente do processo ganhar', () => {
    const raiz = raizTemporaria('# comentário\nFORGE_PORT=8000\nFORGE_COPILOT="on"\nFORGE_WORKSPACE=/tmp/ws\nFORGE_COPILOT_BUDGET_USD=2.5\n');
    const doArquivo = carregarConfig({ env: {}, raiz });
    expect(doArquivo.porta).toBe(8000);
    expect(doArquivo.copilotoLigado).toBe(true);
    expect(doArquivo.workspacePadrao).toBe('/tmp/ws');
    expect(doArquivo.copilotoTetoUsdPadrao).toBe(2.5);
    const doProcesso = carregarConfig({ env: { FORGE_PORT: '9000' }, raiz });
    expect(doProcesso.porta).toBe(9000);
  });

  it('FORGE_HOME aceita ~ e caminho explícito', () => {
    expect(carregarConfig({ env: { FORGE_HOME: '~/x' }, raiz: raizTemporaria() }).home).toBe(path.join(os.homedir(), 'x'));
    expect(carregarConfig({ env: { FORGE_HOME: '/dados/forge' }, raiz: raizTemporaria() }).home).toBe('/dados/forge');
  });

  it.each([
    ['não numérica', { FORGE_PORT: 'abc' }],
    ['abaixo de 1024', { FORGE_PORT: '80' }],
    ['acima de 65535', { FORGE_PORT: '70000' }],
    ['copiloto inválido', { FORGE_COPILOT: 'talvez' }],
    ['teto negativo', { FORGE_COPILOT_BUDGET_USD: '-1' }],
  ])('configuração inválida (%s) vira FORGE_CONFIG com issues', (_rotulo, env) => {
    let erro;
    try {
      carregarConfig({ env, raiz: raizTemporaria() });
    } catch (e) {
      erro = e;
    }
    expect(erro?.codigo).toBe('FORGE_CONFIG');
    expect(erro.detalhe.issues.length).toBeGreaterThan(0);
    expect(erro.detalhe.issues[0].caminho).toBe(Object.keys(env)[0]);
  });
});

describe('lerEnvLocal', () => {
  it('ignora comentários, linhas vazias e aspas', () => {
    const raiz = raizTemporaria("\n# x\nA=1\nB='dois'\nC=\"três\"\nSEM_IGUAL\n=vazio\n");
    expect(lerEnvLocal(path.join(raiz, '.env.local'))).toEqual({ A: '1', B: 'dois', C: 'três' });
  });

  it('arquivo ausente devolve objeto vazio', () => {
    expect(lerEnvLocal(path.join(raizTemporaria(), '.env.local'))).toEqual({});
  });
});
