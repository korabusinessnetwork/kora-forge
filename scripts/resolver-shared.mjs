// Resolve o alias `@shared`, que o Vite e o Vitest conhecem por configuração, mas o Node não.
// Assim a prova da Fase 1 importa os serviços do front do jeito que eles são, sem cópia e sem
// build intermediário. Sem dependência nova: é a API de hooks do próprio Node.
const PREFIXO = '@shared/';
const RAIZ_SHARED = new URL('../shared/', import.meta.url);

export function resolve(especificador, contexto, seguinte) {
  if (!especificador.startsWith(PREFIXO)) return seguinte(especificador, contexto);
  return seguinte(new URL(especificador.slice(PREFIXO.length), RAIZ_SHARED).href, contexto);
}
