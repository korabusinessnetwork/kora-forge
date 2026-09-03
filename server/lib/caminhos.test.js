import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it, expect, afterEach } from 'vitest';
import { resolverNoWorkspace, garantirDentro, inspecionar } from './caminhos.js';

const raiz = path.resolve('/ws');
const temporarias = [];
function pasta() {
  const p = fs.mkdtempSync(path.join(os.tmpdir(), 'kora-forge-caminho-'));
  temporarias.push(p);
  return p;
}
afterEach(() => {
  while (temporarias.length > 0) fs.rmSync(temporarias.pop(), { recursive: true, force: true });
});

describe('resolverNoWorkspace', () => {
  it('resolve caminho relativo dentro da raiz', () => {
    expect(resolverNoWorkspace(raiz, 'docs/00_VISAO/README.md')).toBe(path.join(raiz, 'docs/00_VISAO/README.md'));
    expect(resolverNoWorkspace(raiz, 'CLAUDE.md')).toBe(path.join(raiz, 'CLAUDE.md'));
  });

  it.each([
    ['sobe com ../', '../fora.md'],
    ['sobe no meio', 'docs/../../fora.md'],
    ['sobe com barra invertida', '..\\fora.md'],
    ['absoluto posix', '/etc/passwd'],
    ['absoluto windows', 'C:\\Windows\\System32\\drivers\\etc\\hosts'],
    ['vazio', ''],
    ['só espaço', '   '],
  ])('recusa %s', (_rotulo, relativo) => {
    let erro;
    try { resolverNoWorkspace(raiz, relativo); } catch (e) { erro = e; }
    expect(erro?.codigo).toBe('FORGE_PATH_FORBIDDEN');
  });

  it('recusa caminho que só parece estar dentro da raiz', () => {
    let erro;
    try { garantirDentro(raiz, path.resolve('/ws-outro/arquivo.md')); } catch (e) { erro = e; }
    expect(erro?.codigo).toBe('FORGE_PATH_FORBIDDEN');
    expect(garantirDentro(raiz, path.join(raiz, 'a', 'b'))).toBe(path.join(raiz, 'a', 'b'));
  });
});

describe('inspecionar', () => {
  it('devolve null para arquivo que não existe e o stat para arquivo comum', () => {
    const base = pasta();
    expect(inspecionar(base, path.join(base, 'nao-existe'))).toBeNull();
    fs.writeFileSync(path.join(base, 'a.md'), 'oi');
    expect(inspecionar(base, path.join(base, 'a.md')).isFile()).toBe(true);
  });

  it('aceita symlink que aponta para dentro e recusa o que aponta para fora', () => {
    const base = pasta();
    const fora = pasta();
    fs.writeFileSync(path.join(base, 'real.md'), 'dentro');
    fs.writeFileSync(path.join(fora, 'segredo.md'), 'fora');
    fs.symlinkSync(path.join(base, 'real.md'), path.join(base, 'dentro.link'));
    fs.symlinkSync(path.join(fora, 'segredo.md'), path.join(base, 'fora.link'));

    expect(inspecionar(base, path.join(base, 'dentro.link')).isFile()).toBe(true);
    let erro;
    try { inspecionar(base, path.join(base, 'fora.link')); } catch (e) { erro = e; }
    expect(erro?.codigo).toBe('FORGE_PATH_FORBIDDEN');
  });
});
