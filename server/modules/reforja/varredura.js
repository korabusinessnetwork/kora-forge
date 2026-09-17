import fs from 'node:fs';
import path from 'node:path';

// Leitura do repositório do Forge para o diagnóstico (ADR-014). Só leitura, e só do que o
// diagnóstico precisa. A regra de cada sinal mora em `shared/reforja/sinais.js`; aqui só se decide o
// que é lido, com que limite, e em que ordem.
export const PASTAS_VARRIDAS = Object.freeze(['src', 'server', 'shared', 'specs', 'docs/09_BACKLOG']);
export const PASTAS_IGNORADAS = Object.freeze(new Set(['node_modules', 'dist', '.git', '.claude', 'worktrees', 'coverage']));
export const EXTENSOES_LIDAS = Object.freeze(new Set(['.js', '.jsx', '.md']));
export const LIMITE_BYTES_ARQUIVO = 1024 * 1024;
export const LIMITE_ARQUIVOS = 5000;

const comparar = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

function dentroDaRaiz(raiz, absoluto) {
  const relativo = path.relative(raiz, absoluto);
  return relativo === '' || (!relativo.startsWith('..') && !path.isAbsolute(relativo));
}

function lerArquivo(raiz, absoluto, bytes) {
  const caminho = path.relative(raiz, absoluto).split(path.sep).join('/');
  if (bytes > LIMITE_BYTES_ARQUIVO) return { caminho, bytes, conteudo: null };
  return { caminho, bytes, conteudo: fs.readFileSync(absoluto, 'utf8') };
}

export function varrerForge(raizForge, { limiteArquivos = LIMITE_ARQUIVOS } = {}) {
  const raiz = path.resolve(raizForge);
  let raizReal;
  try {
    raizReal = fs.realpathSync(raiz);
  } catch {
    return [];
  }
  const arquivos = [];

  const caminhar = (pasta) => {
    let entradas;
    try {
      entradas = fs.readdirSync(pasta, { withFileTypes: true });
    } catch {
      return;
    }
    entradas.sort((a, b) => comparar(a.name, b.name));
    for (const entrada of entradas) {
      if (arquivos.length >= limiteArquivos) return;
      const absoluto = path.join(pasta, entrada.name);

      // Pasta por symlink nunca é seguida: evita laço e evita sair da raiz por um atalho.
      // Arquivo por symlink só é lido se o destino real continua dentro da raiz.
      if (entrada.isSymbolicLink()) {
        let real;
        let stat;
        try {
          real = fs.realpathSync(absoluto);
          stat = fs.statSync(real);
        } catch {
          continue;
        }
        if (!stat.isFile() || !dentroDaRaiz(raizReal, real)) continue;
        if (!EXTENSOES_LIDAS.has(path.extname(entrada.name))) continue;
        arquivos.push(lerArquivo(raiz, absoluto, stat.size));
        continue;
      }

      if (entrada.isDirectory()) {
        if (!PASTAS_IGNORADAS.has(entrada.name)) caminhar(absoluto);
        continue;
      }
      if (!entrada.isFile() || !EXTENSOES_LIDAS.has(path.extname(entrada.name))) continue;
      arquivos.push(lerArquivo(raiz, absoluto, fs.statSync(absoluto).size));
    }
  };

  for (const pastaVarrida of PASTAS_VARRIDAS) {
    const absoluto = path.join(raiz, ...pastaVarrida.split('/'));
    let stat;
    try {
      stat = fs.lstatSync(absoluto);
    } catch {
      continue;
    }
    if (stat.isDirectory() && !stat.isSymbolicLink()) caminhar(absoluto);
  }

  return arquivos.sort((a, b) => comparar(a.caminho, b.caminho));
}
