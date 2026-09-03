import { SCHEMA_POR_ETAPA } from '@shared/schemas/respostas.js';

// Nenhuma pergunta sem default (princípio nº 1). O default vem do schema e, quando o preset tem
// opinião sobre o campo, do preset. Função pura, testada.
export function defaultsDaEtapa(etapa, preset, projeto) {
  const schema = SCHEMA_POR_ETAPA[etapa];
  if (!schema) return {};
  const base = schema.parse({});
  if (etapa === 'identidade') return { ...base, nome: projeto?.nome ?? '' };
  if (etapa === 'arquitetura') {
    const d = preset?.defaults ?? {};
    return {
      ...base,
      modelo: ['A', 'B', 'C'].includes(d.modelo_arquitetura) ? d.modelo_arquitetura : base.modelo,
      stack: Array.isArray(d.stack) ? d.stack : base.stack,
      multiTenant: Boolean(d.multi_tenant),
      whiteLabel: Boolean(d.white_label),
      auth: Boolean(d.auth),
      deploy: typeof d.deploy === 'string' ? d.deploy : base.deploy,
    };
  }
  return base;
}

// Estado inicial do wizard: default do preset por baixo, o que já foi respondido por cima.
export function respostasIniciais(payload, preset, projeto) {
  const respostas = {};
  for (const etapa of preset.etapas) {
    respostas[etapa] = { ...defaultsDaEtapa(etapa, preset, projeto), ...(payload.respostas?.[etapa] ?? {}) };
  }
  return respostas;
}
