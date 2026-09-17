// Atalho para abrir a pasta no editor. É um link `vscode://`, resolvido pelo sistema
// operacional: o Forge não executa nada aqui. `code` não está na whitelist de comandos, e
// ampliá-la seria decisão de padrão (C7, ADR-002), não de tela.
//
// A barra invertida do Windows vira barra, porque a URL não a entende, e cada segmento é
// codificado, porque caminho com espaço ou acento é o caso comum e não o excepcional (R-01).
// O dois-pontos da letra de unidade (`D:`) é a única exceção: codificá-lo quebraria o
// destino no Windows, que é justamente o ambiente primário (T-02).
const UNIDADE_DO_WINDOWS = /^[A-Za-z]:$/;

function codificarSegmento(segmento, indice) {
  if (indice === 0 && UNIDADE_DO_WINDOWS.test(segmento)) return segmento;
  return encodeURIComponent(segmento);
}

export function caminhoDeEditor(caminho) {
  if (typeof caminho !== 'string' || caminho.trim() === '') return null;
  const segmentos = caminho
    .replaceAll('\\', '/')
    .replace(/^\/+/, '')
    .split('/')
    .filter((segmento) => segmento !== '')
    .map(codificarSegmento);
  if (segmentos.length === 0) return null;
  return `vscode://file/${segmentos.join('/')}`;
}

export default caminhoDeEditor;
