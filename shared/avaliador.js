// Motor de regras determinístico (ADR-004). Regra é dado, nunca código: nada aqui usa `eval`,
// `new Function` ou engine de template. Mesmo contexto, mesmo resultado, sempre.

export const OPERADORES_FOLHA = Object.freeze(['igual', 'diferente', 'contem', 'nao_contem', 'maior_que', 'menor_que', 'existe', 'vazio']);
export const OPERADORES_GRUPO = Object.freeze(['e', 'ou']);

import { compararTexto } from './ordenar.js';

const CHAVES_PROIBIDAS = new Set(['__proto__', 'constructor', 'prototype']);
const ORDEM_SEVERIDADE = Object.freeze({ bloqueio: 0, aviso: 1, info: 2 });

// Caminho em ponto, com índice de lista. Protótipo é território proibido (C7).
export function lerCampo(contexto, caminho) {
  if (typeof caminho !== 'string' || caminho === '') return undefined;
  let atual = contexto;
  for (const parte of caminho.split('.')) {
    if (atual === null || atual === undefined) return undefined;
    if (CHAVES_PROIBIDAS.has(parte)) return undefined;
    if (Array.isArray(atual)) {
      const indice = Number(parte);
      if (!Number.isInteger(indice)) return undefined;
      atual = atual[indice];
      continue;
    }
    if (typeof atual !== 'object') return undefined;
    if (!Object.hasOwn(atual, parte)) return undefined;
    atual = atual[parte];
  }
  return atual;
}

function ehVazio(valor) {
  if (valor === null || valor === undefined || valor === '') return true;
  if (Array.isArray(valor)) return valor.length === 0;
  if (typeof valor === 'object') return Object.keys(valor).length === 0;
  return false;
}

function contem(valor, procurado) {
  if (Array.isArray(valor)) return valor.some((item) => item === procurado);
  if (typeof valor === 'string' && typeof procurado === 'string') return valor.includes(procurado);
  return false;
}

// Comparação numérica nunca coage: texto contra número é falso, não conversão silenciosa.
function comparaNumero(valor, alvo, comparador) {
  if (typeof valor !== 'number' || typeof alvo !== 'number' || Number.isNaN(valor) || Number.isNaN(alvo)) return false;
  return comparador(valor, alvo);
}

export function avaliarCondicao(condicao, contexto) {
  if (!condicao || typeof condicao !== 'object') return false;
  if (OPERADORES_GRUPO.includes(condicao.operador)) {
    const condicoes = condicao.condicoes ?? [];
    return condicao.operador === 'e'
      ? condicoes.every((filha) => avaliarCondicao(filha, contexto))
      : condicoes.some((filha) => avaliarCondicao(filha, contexto));
  }
  const valor = lerCampo(contexto, condicao.campo);
  switch (condicao.operador) {
    case 'igual': return valor === condicao.valor;
    case 'diferente': return valor !== condicao.valor;
    case 'contem': return contem(valor, condicao.valor);
    case 'nao_contem': return !contem(valor, condicao.valor);
    case 'maior_que': return comparaNumero(valor, condicao.valor, (a, b) => a > b);
    case 'menor_que': return comparaNumero(valor, condicao.valor, (a, b) => a < b);
    case 'existe': return valor !== undefined && valor !== null;
    case 'vazio': return ehVazio(valor);
    default: return false;
  }
}

// Ordem estável: bloqueio, aviso, info; dentro da severidade, alfabética por id.
export function ordenarRegras(regras) {
  return [...regras].sort((a, b) => {
    const porSeveridade = (ORDEM_SEVERIDADE[a.severidade] ?? 9) - (ORDEM_SEVERIDADE[b.severidade] ?? 9);
    return porSeveridade !== 0 ? porSeveridade : compararTexto(a.id, b.id);
  });
}

export function avaliar(regras, contexto) {
  return ordenarRegras(regras.filter((regra) => avaliarCondicao(regra.quando, contexto)));
}
