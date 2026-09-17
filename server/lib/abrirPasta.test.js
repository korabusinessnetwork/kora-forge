import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { abridorDaPlataforma, abrirPasta } from './abrirPasta.js';

const temporarias = [];
afterEach(() => {
  while (temporarias.length > 0) fs.rmSync(temporarias.pop(), { recursive: true, force: true });
});

function workspaceComProjeto(nome = 'meu-app') {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'kora-forge-abrir-'));
  temporarias.push(workspace);
  const raiz = path.join(workspace, nome);
  fs.mkdirSync(raiz);
  return { workspace, raiz };
}

function spawnFalso() {
  const chamadas = [];
  const impl = vi.fn((arquivo, args, opcoes) => {
    chamadas.push({ arquivo, args, opcoes });
    return { on: vi.fn(), unref: vi.fn() };
  });
  return { impl, chamadas };
}

describe('abridorDaPlataforma', () => {
  it.each([
    ['win32', 'explorer'],
    ['darwin', 'open'],
    ['linux', 'xdg-open'],
    ['freebsd', 'xdg-open'],
  ])('em %s usa %s', (plataforma, esperado) => {
    expect(abridorDaPlataforma(plataforma)).toBe(esperado);
  });
});

describe('abrirPasta', () => {
  it('abre a pasta sem shell, com o caminho absoluto como argumento único', () => {
    const { workspace, raiz } = workspaceComProjeto();
    const { impl, chamadas } = spawnFalso();

    expect(abrirPasta(workspace, raiz, { plataforma: 'win32', spawnImpl: impl })).toEqual({ aberto: true });
    expect(chamadas).toHaveLength(1);
    expect(chamadas[0].arquivo).toBe('explorer');
    expect(chamadas[0].args).toEqual([path.resolve(raiz)]);
    expect(chamadas[0].opcoes.shell).toBe(false);
  });

  it('solta o processo, para o gerenciador de arquivos viver além do Forge', () => {
    const { workspace, raiz } = workspaceComProjeto();
    const solto = { on: vi.fn(), unref: vi.fn() };
    abrirPasta(workspace, raiz, { plataforma: 'linux', spawnImpl: () => solto });
    expect(solto.unref).toHaveBeenCalled();
    expect(solto.on).toHaveBeenCalledWith('error', expect.any(Function));
  });

  it('recusa caminho fora do workspace, sem chamar spawn', () => {
    const { workspace } = workspaceComProjeto();
    const fora = fs.mkdtempSync(path.join(os.tmpdir(), 'kora-forge-fora-'));
    temporarias.push(fora);
    const { impl } = spawnFalso();

    let erro;
    try { abrirPasta(workspace, fora, { plataforma: 'linux', spawnImpl: impl }); } catch (e) { erro = e; }
    expect(erro?.codigo).toBe('FORGE_PATH_FORBIDDEN');
    expect(impl).not.toHaveBeenCalled();
  });

  it('recusa travessia por .. mesmo escrita com barra invertida', () => {
    const { workspace } = workspaceComProjeto();
    const { impl } = spawnFalso();
    for (const alvo of [path.join(workspace, '..'), path.join(workspace, '..', 'outro')]) {
      let erro;
      try { abrirPasta(workspace, alvo, { plataforma: 'win32', spawnImpl: impl }); } catch (e) { erro = e; }
      expect(erro?.codigo).toBe('FORGE_PATH_FORBIDDEN');
    }
    expect(impl).not.toHaveBeenCalled();
  });

  it('projeto sem raiz no disco vira erro de campo, não spawn', () => {
    const { workspace } = workspaceComProjeto();
    const { impl } = spawnFalso();
    for (const raiz of [null, '', '   ']) {
      let erro;
      try { abrirPasta(workspace, raiz, { plataforma: 'linux', spawnImpl: impl }); } catch (e) { erro = e; }
      expect(erro?.codigo).toBe('FORGE_VALIDATION');
      expect(erro?.detalhe.issues[0].caminho).toBe('projeto');
    }
    expect(impl).not.toHaveBeenCalled();
  });

  it('pasta apagada à mão vira erro legível, não spawn', () => {
    const { workspace, raiz } = workspaceComProjeto();
    fs.rmSync(raiz, { recursive: true, force: true });
    const { impl } = spawnFalso();

    let erro;
    try { abrirPasta(workspace, raiz, { plataforma: 'linux', spawnImpl: impl }); } catch (e) { erro = e; }
    expect(erro?.codigo).toBe('FORGE_VALIDATION');
    expect(erro?.detalhe.issues[0].caminho).toBe('projeto');
    expect(erro.message).toMatch(/não está mais no disco/);
    expect(impl).not.toHaveBeenCalled();
  });

  it('arquivo em vez de pasta é recusado', () => {
    const { workspace } = workspaceComProjeto();
    const arquivo = path.join(workspace, 'nao-e-pasta.txt');
    fs.writeFileSync(arquivo, 'oi');
    const { impl } = spawnFalso();

    let erro;
    try { abrirPasta(workspace, arquivo, { plataforma: 'linux', spawnImpl: impl }); } catch (e) { erro = e; }
    expect(erro?.codigo).toBe('FORGE_VALIDATION');
    expect(impl).not.toHaveBeenCalled();
  });

  it('workspace não configurado aponta o campo workspace', () => {
    const { impl } = spawnFalso();
    let erro;
    try { abrirPasta(null, '/qualquer', { plataforma: 'linux', spawnImpl: impl }); } catch (e) { erro = e; }
    expect(erro?.codigo).toBe('FORGE_VALIDATION');
    expect(erro?.detalhe.issues[0].caminho).toBe('workspace');
    expect(impl).not.toHaveBeenCalled();
  });
});
