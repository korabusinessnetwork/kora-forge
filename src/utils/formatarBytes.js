// Tamanho legível por humano. Função pura, com teste.
const UNIDADES = ['B', 'kB', 'MB'];

export function formatarBytes(bytes) {
  const numero = Number(bytes);
  if (!Number.isFinite(numero) || numero < 0) return '';
  let valor = numero;
  let unidade = 0;
  while (valor >= 1024 && unidade < UNIDADES.length - 1) {
    valor /= 1024;
    unidade += 1;
  }
  const casas = unidade === 0 || valor >= 100 ? 0 : 1;
  return `${valor.toFixed(casas)} ${UNIDADES[unidade]}`;
}

export function pastaDe(caminho) {
  const partes = String(caminho).split('/');
  return partes.length === 1 ? '.' : partes.slice(0, -1).join('/');
}
