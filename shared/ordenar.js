// Comparação por código de caractere, não por locale. `localeCompare` depende dos dados de ICU do
// sistema, e o mesmo plano poderia sair em ordem diferente em duas máquinas. O princípio nº 2 diz
// que o mesmo blueprint gera sempre o mesmo resultado, então a ordenação também é determinística.
export function compararTexto(a, b) {
  const x = String(a);
  const y = String(b);
  if (x === y) return 0;
  return x < y ? -1 : 1;
}

export const porCampo = (campo) => (a, b) => compararTexto(a[campo], b[campo]);
