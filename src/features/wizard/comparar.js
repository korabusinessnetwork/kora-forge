// Reexporta a serialização estável compartilhada: o wizard usa para saber se algo mudou, o
// gerador usa para o hash do plano. Uma implementação só, testada em shared/serializar.test.js.
export { serializarEstavel, saoIguais } from '@shared/serializar.js';

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
