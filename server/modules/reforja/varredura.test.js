import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, afterEach } from 'vitest';
import { criarPastaTemporaria } from '../../testes/apoio.js';
import { LIMITE_BYTES_ARQUIVO, varrerForge } from './varredura.js';
import { calcularSinais } from '../../../shared/reforja/sinais.js';

const pastas = [];
afterEach(() => {
  while (pastas.length) fs.rmSync(pastas.pop(), { recursive: true, force: true });
});

function temporaria() {
  const pasta = criarPastaTemporaria('kora-forge-reforja-');
  pastas.push(pasta);
  return pasta;
}

function escrever(raiz, relativo, conteudo = '') {
  const absoluto = path.join(raiz, ...relativo.split('/'));
  fs.mkdirSync(path.dirname(absoluto), { recursive: true });
  fs.writeFileSync(absoluto, conteudo);
  return absoluto;
}

describe('varrerForge', () => {
  it('lê só as pastas do diagnóstico, ignora as pastas proibidas em qualquer nível e ordena', () => {
    const raiz = temporaria();
    escrever(raiz, 'src/z.jsx', 'z');
    escrever(raiz, 'src/a.js', 'a');
    escrever(raiz, 'src/estilo.module.css', 'não é lido');
    escrever(raiz, 'server/modules/x/servico.js', 'x');
    escrever(raiz, 'shared/s.js', 's');
    escrever(raiz, 'specs/uma.md', '# uma');
    escrever(raiz, 'docs/09_BACKLOG/fase.md', '# fase');
    escrever(raiz, 'docs/08_DECISOES/adr.md', 'fora da varredura');
    escrever(raiz, 'templates/t.js', 'fora da varredura');
    escrever(raiz, 'node_modules/pacote/index.js', 'ignorado');
    escrever(raiz, 'src/node_modules/p.js', 'ignorado');
    escrever(raiz, 'server/dist/b.js', 'ignorado');
    escrever(raiz, 'shared/.git/c.js', 'ignorado');
    escrever(raiz, 'src/.claude/worktrees/d.js', 'ignorado');
    escrever(raiz, 'src/coverage/e.js', 'ignorado');

    expect(varrerForge(raiz).map((a) => a.caminho)).toEqual([
      'docs/09_BACKLOG/fase.md',
      'server/modules/x/servico.js',
      'shared/s.js',
      'specs/uma.md',
      'src/a.js',
      'src/z.jsx',
    ]);
  });

  it('não lê arquivo acima do limite de bytes, e ele só pode virar arquivo grande', () => {
    const raiz = temporaria();
    escrever(raiz, 'src/enorme.js', `// ${'TO'}${'DO'}\n${'a'.repeat(LIMITE_BYTES_ARQUIVO)}`);
    const [arquivo] = varrerForge(raiz);
    expect(arquivo).toMatchObject({ caminho: 'src/enorme.js', conteudo: null });
    expect(calcularSinais(varrerForge(raiz)).map((s) => s.id)).toEqual(['arquivos-grandes']);
  });

  it('nunca segue symlink de pasta, e ignora symlink de arquivo com destino fora da raiz', () => {
    const raiz = temporaria();
    const fora = temporaria();
    escrever(fora, 'segredo.js', 'fora');
    escrever(fora, 'pasta/outro.js', 'fora');
    escrever(raiz, 'src/dentro.js', 'dentro');
    escrever(raiz, 'shared/alvo.js', 'alvo');

    // Junction no Windows não exige administrador; em POSIX o tipo é ignorado e vira symlink comum.
    fs.symlinkSync(path.join(fora, 'pasta'), path.join(raiz, 'src', 'atalho-fora'), 'junction');
    fs.symlinkSync(path.join(raiz, 'shared'), path.join(raiz, 'src', 'atalho-dentro'), 'junction');
    const links = [];
    for (const [alvo, link] of [[path.join(fora, 'segredo.js'), path.join(raiz, 'src', 'link-fora.js')], [path.join(raiz, 'shared', 'alvo.js'), path.join(raiz, 'src', 'link-dentro.js')]]) {
      try {
        fs.symlinkSync(alvo, link, 'file');
        links.push(path.basename(link));
      } catch {
        // Symlink de arquivo no Windows sem modo de desenvolvedor não é criável; a pasta cobre o resto.
      }
    }

    const caminhos = varrerForge(raiz).map((a) => a.caminho);
    expect(caminhos.some((c) => c.includes('atalho'))).toBe(false);
    expect(caminhos).not.toContain('src/link-fora.js');
    expect(caminhos).toContain('src/dentro.js');
    if (links.includes('link-dentro.js')) expect(caminhos).toContain('src/link-dentro.js');
    expect(varrerForge(raiz).every((a) => a.conteudo !== 'fora')).toBe(true);
  });

  it('raiz inexistente ou sem as pastas é lista vazia, sem erro', () => {
    const raiz = temporaria();
    expect(varrerForge(raiz)).toEqual([]);
    expect(varrerForge(path.join(raiz, 'nao-existe'))).toEqual([]);
  });

  it('respeita o teto de arquivos', () => {
    const raiz = temporaria();
    for (let i = 0; i < 5; i += 1) escrever(raiz, `src/f${i}.js`, 'x');
    expect(varrerForge(raiz, { limiteArquivos: 3 })).toHaveLength(3);
  });

  it('mesma árvore, mesmo diagnóstico', () => {
    const raiz = temporaria();
    escrever(raiz, 'src/a.js', `// ${'FIX'}${'ME'}\n`);
    escrever(raiz, 'server/b.js', 'const b = 1;');
    escrever(raiz, 'specs/s.md', '# s');
    escrever(raiz, 'docs/09_BACKLOG/f.md', '| Bloco | Estado |\n|---|---|\n| 1 | a fazer |');
    const primeiro = calcularSinais(varrerForge(raiz));
    expect(primeiro.length).toBe(4);
    expect(calcularSinais(varrerForge(raiz))).toEqual(primeiro);
  });
});
