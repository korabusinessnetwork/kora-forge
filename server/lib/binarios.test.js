import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it, expect, afterEach } from 'vitest';
import { ehWindows, localizarCliDoNode, procurarNoPath, resolverExecutavel } from './binarios.js';

const temporarias = [];
afterEach(() => {
  while (temporarias.length > 0) fs.rmSync(temporarias.pop(), { recursive: true, force: true });
});

function pasta(nome = 'kora-forge-bin-') {
  const criada = fs.mkdtempSync(path.join(os.tmpdir(), nome));
  temporarias.push(criada);
  return criada;
}

describe('ehWindows', () => {
  it('reconhece a plataforma', () => {
    expect(ehWindows('win32')).toBe(true);
    expect(ehWindows('linux')).toBe(false);
    expect(ehWindows('darwin')).toBe(false);
  });
});

describe('localizarCliDoNode', () => {
  it('acha o npm-cli.js ao lado do binário do Node', () => {
    const base = pasta();
    const destino = path.join(base, 'node_modules', 'npm', 'bin');
    fs.mkdirSync(destino, { recursive: true });
    fs.writeFileSync(path.join(destino, 'npm-cli.js'), '');
    expect(localizarCliDoNode('npm', path.join(base, 'node.exe'))).toBe(path.join(destino, 'npm-cli.js'));
  });

  it('acha no layout de gerenciador de versão, um nível acima em lib', () => {
    const base = pasta();
    const destino = path.join(base, 'lib', 'node_modules', 'npm', 'bin');
    fs.mkdirSync(destino, { recursive: true });
    fs.writeFileSync(path.join(destino, 'npx-cli.js'), '');
    expect(localizarCliDoNode('npx', path.join(base, 'bin', 'node'))).toBe(path.join(destino, 'npx-cli.js'));
  });

  it('devolve null para comando que não tem CLI em JavaScript', () => {
    expect(localizarCliDoNode('git', process.execPath)).toBeNull();
    expect(localizarCliDoNode('supabase', process.execPath)).toBeNull();
  });

  it('devolve null quando o arquivo não existe', () => {
    expect(localizarCliDoNode('npm', path.join(pasta(), 'node.exe'))).toBeNull();
  });
});

describe('procurarNoPath', () => {
  it('acha o .exe e ignora a correspondência sem extensão', () => {
    const base = pasta();
    fs.writeFileSync(path.join(base, 'git'), 'script de shell, não executável no Windows');
    fs.writeFileSync(path.join(base, 'git.exe'), '');
    expect(procurarNoPath('git', { PATH: base, PATHEXT: '.COM;.EXE;.BAT;.CMD' })).toBe(path.join(base, 'git.exe'));
  });

  it('recusa .cmd, que o Node não executa sem shell', () => {
    const base = pasta();
    fs.writeFileSync(path.join(base, 'npm.cmd'), '');
    expect(procurarNoPath('npm', { PATH: base, PATHEXT: '.COM;.EXE;.BAT;.CMD' })).toBeNull();
  });

  it('funciona em diretório com espaço no nome', () => {
    const base = pasta();
    const comEspaco = path.join(base, 'Program Files');
    fs.mkdirSync(comEspaco);
    fs.writeFileSync(path.join(comEspaco, 'node.exe'), '');
    expect(procurarNoPath('node', { PATH: comEspaco, PATHEXT: '.EXE' })).toBe(path.join(comEspaco, 'node.exe'));
  });

  it('cai para a lista padrão quando PATHEXT está ausente ou vazio', () => {
    const base = pasta();
    fs.writeFileSync(path.join(base, 'node.exe'), '');
    expect(procurarNoPath('node', { PATH: base })).toBe(path.join(base, 'node.exe'));
    expect(procurarNoPath('node', { PATH: base, PATHEXT: '' })).toBe(path.join(base, 'node.exe'));
  });

  it('devolve null com PATH vazio', () => {
    expect(procurarNoPath('node', { PATH: '' })).toBeNull();
    expect(procurarNoPath('node', {})).toBeNull();
  });
});

describe('resolverExecutavel', () => {
  it('fora do Windows devolve o comando intacto, sem prefixo', () => {
    for (const cmd of ['npm', 'npx', 'git', 'node', 'supabase']) {
      expect(resolverExecutavel(cmd, { plataforma: 'linux' })).toEqual({ arquivo: cmd, prefixo: [] });
    }
  });

  it('no Windows manda o npm pelo Node apontando para o CLI em JavaScript', () => {
    const base = pasta();
    const destino = path.join(base, 'node_modules', 'npm', 'bin');
    fs.mkdirSync(destino, { recursive: true });
    fs.writeFileSync(path.join(destino, 'npm-cli.js'), '');
    const execPath = path.join(base, 'node.exe');

    expect(resolverExecutavel('npm', { plataforma: 'win32', execPath, ambiente: { PATH: '' } })).toEqual({
      arquivo: execPath,
      prefixo: [path.join(destino, 'npm-cli.js')],
    });
  });

  it('no Windows resolve o git para o caminho absoluto do .exe', () => {
    const base = pasta();
    fs.writeFileSync(path.join(base, 'git.exe'), '');
    expect(resolverExecutavel('git', { plataforma: 'win32', execPath: path.join(pasta(), 'node.exe'), ambiente: { PATH: base, PATHEXT: '.EXE' } })).toEqual({
      arquivo: path.join(base, 'git.exe'),
      prefixo: [],
    });
  });

  it('sem nada spawnável devolve o nome original, para o spawn falhar de forma tratada', () => {
    expect(resolverExecutavel('supabase', { plataforma: 'win32', execPath: path.join(pasta(), 'node.exe'), ambiente: { PATH: '' } })).toEqual({
      arquivo: 'supabase',
      prefixo: [],
    });
  });
});
