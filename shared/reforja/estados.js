// Máquina de estados do item da Auto-Reforja (ADR-014). É o ciclo do harness (ADR-008) aplicado
// ao próprio Forge: proposta, spec, build, review, concluída. Pura, sem banco e sem relógio.
export const ESTADOS_ITEM = Object.freeze(['proposta', 'especificada', 'em_construcao', 'em_revisao', 'concluida', 'descartada']);

// As colunas do trilho, na ordem do ciclo. Descartada fica fora do trilho de propósito.
export const CICLO = Object.freeze(['proposta', 'especificada', 'em_construcao', 'em_revisao', 'concluida']);

export const ESTADOS_FECHADOS = Object.freeze(['concluida', 'descartada']);

const TRANSICOES = Object.freeze({
  proposta: Object.freeze(['especificada', 'descartada']),
  especificada: Object.freeze(['em_construcao', 'proposta', 'descartada']),
  em_construcao: Object.freeze(['em_revisao', 'especificada', 'descartada']),
  em_revisao: Object.freeze(['concluida', 'em_construcao', 'descartada']),
  concluida: Object.freeze(['em_revisao']),
  descartada: Object.freeze(['proposta']),
});

export function transicoesDe(estado) {
  return TRANSICOES[estado] ?? [];
}

export function podeTransicionar(de, para) {
  return transicoesDe(de).includes(para);
}

export function estaAberto(estado) {
  return ESTADOS_ITEM.includes(estado) && !ESTADOS_FECHADOS.includes(estado);
}

// Avançar é o próximo passo do ciclo. Concluída e descartada não avançam.
export function proximoEstado(estado) {
  const indice = CICLO.indexOf(estado);
  if (indice < 0 || indice === CICLO.length - 1) return null;
  return CICLO[indice + 1];
}

// Voltar é um passo atrás no ciclo, e só se a transição existir. Concluída volta para revisão.
export function estadoAnterior(estado) {
  const indice = CICLO.indexOf(estado);
  if (indice <= 0) return null;
  const anterior = CICLO[indice - 1];
  return podeTransicionar(estado, anterior) ? anterior : null;
}

// As ações que a tela pode oferecer para um estado, na ordem em que aparecem.
export function acoesDe(estado) {
  const acoes = [];
  const proximo = proximoEstado(estado);
  if (proximo && podeTransicionar(estado, proximo)) acoes.push({ acao: 'avancar', para: proximo });
  const anterior = estadoAnterior(estado);
  if (anterior) acoes.push({ acao: 'voltar', para: anterior });
  if (podeTransicionar(estado, 'descartada')) acoes.push({ acao: 'descartar', para: 'descartada' });
  if (estado === 'descartada') acoes.push({ acao: 'restaurar', para: 'proposta' });
  return acoes;
}
