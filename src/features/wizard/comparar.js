// Serialização estável (chaves ordenadas) para responder uma pergunta só: mudou alguma coisa?
// Sem isso o wizard criaria uma versão nova de blueprint a cada navegação (RN-02, princípio nº 2).
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

// Item de lista em branco é descarte, não dado. Etapa fora do preset não é salva.
export function limparRespostas(respostas, etapas) {
  const limpas = {};
  for (const etapa of etapas) {
    const atual = respostas[etapa];
    if (!atual) continue;
    const saida = {};
    for (const [chave, valor] of Object.entries(atual)) {
      if (Array.isArray(valor)) {
        saida[chave] = valor
          .filter((item) => (typeof item === 'string' ? item.trim() !== '' : Boolean(item)))
          .map((item) => (typeof item === 'string' ? item.trim() : item));
      } else if (typeof valor === 'string') {
        saida[chave] = valor.trim();
      } else {
        saida[chave] = valor;
      }
    }
    limpas[etapa] = saida;
  }
  return limpas;
}
