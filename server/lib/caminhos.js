import fs from 'node:fs';
import path from 'node:path';
import { ErroForge } from './erro.js';

// Controle C4: toda escrita fica dentro do workspace. Path traversal é bloqueio, não aviso.
function recusar(mensagem, detalhe = {}) {
  return new ErroForge('FORGE_PATH_FORBIDDEN', mensagem, detalhe);
}

// Confere que um caminho já absoluto está sob a raiz. Separado de `resolverNoWorkspace` porque
// também vale para o caminho real de um symlink.
export function garantirDentro(raiz, absoluto) {
  const raizNormalizada = path.resolve(raiz);
  const alvo = path.resolve(absoluto);
  if (alvo !== raizNormalizada && !alvo.startsWith(raizNormalizada + path.sep)) {
    throw recusar('Caminho fora do workspace.', { caminho: alvo, raiz: raizNormalizada });
  }
  return alvo;
}

export function resolverNoWorkspace(raiz, relativo) {
  if (typeof relativo !== 'string' || relativo.trim() === '') throw recusar('Caminho vazio.');
  if (path.isAbsolute(relativo) || path.win32.isAbsolute(relativo)) {
    throw recusar('Caminho precisa ser relativo à raiz do projeto.', { caminho: relativo });
  }
  if (relativo.split(/[\\/]/).includes('..')) {
    throw recusar('Caminho não pode conter "..".', { caminho: relativo });
  }
  return garantirDentro(raiz, path.resolve(raiz, relativo));
}

// Symlink que aponta para fora da raiz é recusado antes de qualquer leitura.
export function inspecionar(raiz, absoluto) {
  let stat;
  try {
    stat = fs.lstatSync(absoluto);
  } catch {
    return null;
  }
  if (stat.isSymbolicLink()) {
    const real = fs.realpathSync(absoluto);
    garantirDentro(raiz, real);
    return fs.statSync(absoluto);
  }
  return stat;
}
