// Motor de template do gerador (padrão P-03). Só troca `{{CHAVE}}` por valor: sem condicional,
// sem laço, sem expressão, sem `eval` e sem `new Function`. Template é dado, não código.
// Quando um template precisa de condicional, a decisão vira regra no motor (ADR-004), não
// sintaxe nova aqui.
const PADRAO_CHAVE = /\{\{([A-Z][A-Z0-9_]*)\}\}/g;

export class ErroTemplate extends Error {
  constructor(chave, arquivo) {
    super(`Template ${arquivo}: sem valor para {{${chave}}}.`);
    this.name = 'ErroTemplate';
    this.codigo = 'FORGE_TEMPLATE_INCOMPLETO';
    this.detalhe = { issues: [{ caminho: arquivo, mensagem: `sem valor para {{${chave}}}` }] };
  }
}

export function chavesUsadas(texto) {
  return [...new Set([...String(texto).matchAll(PADRAO_CHAVE)].map((achado) => achado[1]))].sort();
}

// Placeholder que sobra na saída é bug, não pendência (aprendizado A-04): chave sem valor lança.
export function renderizar(texto, valores, arquivo = 'desconhecido') {
  return String(texto).replace(PADRAO_CHAVE, (_todo, chave) => {
    if (!Object.hasOwn(valores, chave)) throw new ErroTemplate(chave, arquivo);
    return String(valores[chave]);
  });
}
