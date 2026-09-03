import { ETAPAS } from './schemas/preset.js';

// Regras de navegação e de completude das etapas do wizard (RN-03). Funções puras, testáveis
// isoladamente e usadas nas duas pontas: o servidor valida, o front conduz.

// Campo obrigatório é o que impede a etapa de contar como concluída. Não é bloqueio de
// materialização: isso é do motor de regras (bloco 5).
export const CAMPOS_OBRIGATORIOS = Object.freeze({
  identidade: ['essencia', 'problema', 'valor'],
  escopo: ['publico', 'ahaMoment'],
  arquitetura: [],
  design: [],
  dados: ['entidades'],
  apis: [],
  seguranca: [],
  fundacao: [],
  materializar: [],
});

// Etapas que não podem ser puladas (RN-03.2).
export const ETAPAS_NAO_PULAVEIS = Object.freeze(['identidade', 'materializar']);

function preenchido(valor) {
  if (typeof valor === 'string') return valor.trim() !== '';
  if (Array.isArray(valor)) return valor.some((item) => (typeof item === 'string' ? item.trim() !== '' : Boolean(item?.nome?.trim())));
  return valor !== null && valor !== undefined;
}

export function etapaEstaCompleta(etapa, respostas = {}) {
  const obrigatorios = CAMPOS_OBRIGATORIOS[etapa] ?? [];
  if (obrigatorios.length === 0) return true;
  const daEtapa = respostas[etapa] ?? {};
  return obrigatorios.every((campo) => preenchido(daEtapa[campo]));
}

export function podePular(etapa) {
  return !ETAPAS_NAO_PULAVEIS.includes(etapa);
}

// Navegação anda na ordem do preset, não na ordem do catálogo.
export function proximaEtapa(etapas, atual) {
  const indice = etapas.indexOf(atual);
  if (indice === -1 || indice === etapas.length - 1) return null;
  return etapas[indice + 1];
}

export function etapaAnterior(etapas, atual) {
  const indice = etapas.indexOf(atual);
  if (indice <= 0) return null;
  return etapas[indice - 1];
}

export function ehEtapaConhecida(etapa) {
  return ETAPAS.includes(etapa);
}
