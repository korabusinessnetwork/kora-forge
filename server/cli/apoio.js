import { fileURLToPath } from 'node:url';

export const RAIZ = fileURLToPath(new URL('../../', import.meta.url));

// Saída de erro dos comandos de linha: código estável mais mensagem legível, sem stack trace.
export function encerrarComErro(erro) {
  if (erro?.codigo) {
    console.error(`${erro.codigo}: ${erro.message}`);
    for (const issue of erro.detalhe?.issues ?? []) console.error(`  ${issue.caminho}: ${issue.mensagem}`);
  } else {
    console.error(`FORGE_INTERNAL: ${erro?.message ?? erro}`);
  }
  process.exit(1);
}
