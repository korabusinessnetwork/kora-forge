// Serialização estável (chaves ordenadas). Usada para responder duas perguntas diferentes:
// "mudou alguma coisa?" no wizard, e "qual é o hash deste plano?" no gerador. Nos dois casos o
// que importa é que a mesma entrada produza sempre a mesma saída (princípio nº 2).
export function serializarEstavel(valor) {
  if (Array.isArray(valor)) return `[${valor.map(serializarEstavel).join(',')}]`;
  if (valor !== null && typeof valor === 'object') {
    return `{${Object.keys(valor).sort().map((chave) => `${JSON.stringify(chave)}:${serializarEstavel(valor[chave])}`).join(',')}}`;
  }
  return JSON.stringify(valor ?? null);
}

export function saoIguais(a, b) {
  return serializarEstavel(a) === serializarEstavel(b);
}
