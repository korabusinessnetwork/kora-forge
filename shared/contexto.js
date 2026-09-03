import { SCHEMA_POR_ETAPA } from './schemas/respostas.js';

// Contexto de avaliação: a visão achatada e documentada do projeto que as regras enxergam.
// Toda etapa sem resposta entra com o default do schema, então regra nunca vê `undefined` por
// blueprint parcial. Campos previstos para fases futuras nascem vazios, não ausentes.
function respostaDe(etapa, respostas) {
  const schema = SCHEMA_POR_ETAPA[etapa];
  if (!schema) return {};
  const salvo = respostas?.[etapa] ?? {};
  const resultado = schema.safeParse(salvo);
  return resultado.success ? resultado.data : schema.parse({});
}

export function montarContexto({ projeto, preset, blueprint }) {
  const payload = blueprint?.payload ?? blueprint ?? {};
  const respostas = payload.respostas ?? {};
  return {
    preset: {
      id: preset.id,
      categoria: preset.categoria,
      etapas: preset.etapas,
      versao: preset.versao,
    },
    projeto: {
      status: projeto.status,
      slug: projeto.slug,
      materializado: projeto.caminhoDisco !== null && projeto.caminhoDisco !== undefined,
    },
    identidade: respostaDe('identidade', respostas),
    escopo: respostaDe('escopo', respostas),
    arquitetura: respostaDe('arquitetura', respostas),
    dados: respostaDe('dados', respostas),
    seguranca: respostaDe('seguranca', respostas),
    fundacao: respostaDe('fundacao', respostas),
    materializar: respostaDe('materializar', respostas),
    etapasConcluidas: payload.etapasConcluidas ?? [],
    assumidas: payload.assumidas ?? [],
    temUi: Boolean(preset.defaults?.tem_ui),
    // Preenchidos em fases futuras: integrações na Fase 3, ferramentas ausentes no bloco 7.
    integracoes: [],
    ferramentasAusentes: [],
  };
}
