import { z } from 'zod';

// Contrato do motor de eficiência (custo por tarefa concluída do copiloto).
// Os mesmos schemas validam o catálogo e os perfis ao carregar, a entrada das rotas
// e a saída que chega na UI (C7: Zod nas duas pontas).

export const INTENCOES = ['site', 'aplicacao', 'local', 'api', 'automacao'];
export const INTENCOES_FILTRO = ['todas', ...INTENCOES];
export const ETAPAS_COPILOTO = [
  'identidade-redigir',
  'personas-derivar',
  'nome-sugerir',
  'entidades-derivar',
  'regras-redigir',
  'blueprint-revisar',
];
export const CLASSES_ETAPA = ['redacao', 'derivacao', 'nomeacao', 'revisao'];
export const ESTADOS_CHAMADA = ['sucesso', 'invalido', 'erro', 'timeout'];
export const PERIODOS = ['mes', '30d', 'tudo'];
export const TIERS = ['economico', 'equilibrio', 'frontier'];
export const ESFORCOS = ['low', 'medium', 'high', 'xhigh', 'max'];
export const TTLS_CACHE = ['5m', '1h'];
export const CONFIANCAS = ['alta', 'media', 'baixa'];

const inteiroNaoNegativo = z.number().int().nonnegative();
const naoNegativo = z.number().nonnegative();
const dataIso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data no formato AAAA-MM-DD.');

function porChave(chaves, schema) {
  return z.strictObject(Object.fromEntries(chaves.map((chave) => [chave, schema])));
}

// Catálogo de modelos: dado versionado, nunca buscado em runtime (T-01).
export const precoSchema = z.strictObject({
  entrada: naoNegativo,
  saida: naoNegativo,
  cache_escrita_5m: naoNegativo,
  cache_escrita_1h: naoNegativo,
  cache_leitura: naoNegativo,
});

export const modeloSchema = z.strictObject({
  id: z.string().min(1),
  nome: z.string().min(1),
  tier: z.enum(TIERS),
  preco: precoSchema,
  contexto: z.number().int().positive(),
  saida_maxima: z.number().int().positive(),
  esforcos: z.array(z.enum(ESFORCOS)),
  forcas: z.array(z.string().min(1)),
  evitar: z.array(z.string().min(1)),
});

export const catalogoSchema = z.strictObject({
  versao: z.number().int().positive(),
  atualizado_em: dataIso,
  fonte: z.string().url(),
  moeda: z.literal('USD'),
  unidade: z.string().min(1),
  lote_desconto: z.number().min(0).max(1),
  modelos: z.array(modeloSchema).min(1),
});

// Perfis de intenção: o que cada tipo de aplicação pede em cada etapa do copiloto.
export const cacheRecomendadoSchema = z.strictObject({
  escopo: z.string().min(1),
  ttl: z.enum(TTLS_CACHE),
});

export const recomendacaoEtapaPerfilSchema = z.strictObject({
  modelo: z.string().min(1),
  escalar_para: z.string().min(1),
  esforco: z.enum(ESFORCOS).nullable(),
  max_tokens: z.number().int().positive(),
  cache: cacheRecomendadoSchema,
  motivo: z.string().min(1),
});

export const chamadaTipicaSchema = z.strictObject({
  entrada: inteiroNaoNegativo,
  saida: inteiroNaoNegativo,
  fracao_cache: z.number().min(0).max(1),
});

export const etapaPerfilSchema = z.strictObject({
  classe: z.enum(CLASSES_ETAPA),
  descricao: z.string().min(1),
  chamada_tipica: chamadaTipicaSchema,
});

export const intencaoPerfilSchema = z.strictObject({
  nome: z.string().min(1),
  categoria_preset: z.string().min(1),
  descricao: z.string().min(1),
  sinais: z.array(z.string().min(1)).min(1),
  etapas: porChave(ETAPAS_COPILOTO, recomendacaoEtapaPerfilSchema),
});

export const perfisSchema = z.strictObject({
  versao: z.number().int().positive(),
  atualizado_em: dataIso,
  intencao_padrao: z.enum(INTENCOES),
  etapas: porChave(ETAPAS_COPILOTO, etapaPerfilSchema),
  intencoes: porChave(INTENCOES, intencaoPerfilSchema),
});

// Saídas da API local e do motor.
export const modeloResumoSchema = z.strictObject({
  id: z.string().min(1),
  nome: z.string().min(1),
  tier: z.enum(TIERS),
});

export const alternativaSchema = modeloResumoSchema.extend({
  custoTipicoUsd: naoNegativo,
  custoTipicoComCacheUsd: naoNegativo,
});

export const recomendacaoSchema = z.strictObject({
  intencao: z.enum(INTENCOES),
  etapa: z.enum(ETAPAS_COPILOTO),
  classe: z.enum(CLASSES_ETAPA),
  descricao: z.string().min(1),
  modelo: modeloResumoSchema,
  escalarPara: modeloResumoSchema,
  esforco: z.enum(ESFORCOS).nullable(),
  maxTokens: z.number().int().positive(),
  cache: cacheRecomendadoSchema,
  motivo: z.string().min(1),
  chamadaTipica: z.strictObject({ entrada: inteiroNaoNegativo, saida: inteiroNaoNegativo, fracaoCache: z.number().min(0).max(1) }),
  custoTipicoUsd: naoNegativo,
  custoTipicoComCacheUsd: naoNegativo,
  custoEscaladaUsd: naoNegativo,
  alternativas: z.array(alternativaSchema).min(1),
});

export const recomendacoesSchema = z.strictObject({
  intencao: z.enum(INTENCOES),
  nome: z.string().min(1),
  descricao: z.string().min(1),
  etapas: z.array(recomendacaoSchema).min(1),
});

export const recomendacaoQuerySchema = z.strictObject({
  intencao: z.enum(INTENCOES),
  etapa: z.enum(ETAPAS_COPILOTO).optional(),
});

export const inferenciaSchema = z.strictObject({
  intencao: z.enum(INTENCOES),
  confianca: z.enum(CONFIANCAS),
  origem: z.enum(['preset', 'descricao', 'padrao']),
  sinais: z.array(z.string()),
});

// Registro de chamada do copiloto. O custo é sempre calculado no servidor, nunca aceito do cliente.
export const chamadaEntradaSchema = z.strictObject({
  etapa: z.enum(ETAPAS_COPILOTO),
  modelo: z.string().min(1),
  estado: z.enum(ESTADOS_CHAMADA),
  tokensEntrada: inteiroNaoNegativo.default(0),
  tokensSaida: inteiroNaoNegativo.default(0),
  tokensCacheLeitura: inteiroNaoNegativo.default(0),
  tokensCacheEscrita: inteiroNaoNegativo.default(0),
  cacheTtl: z.enum(TTLS_CACHE).default('5m'),
  lote: z.boolean().default(false),
  intencao: z.enum(INTENCOES).nullable().optional(),
  projectId: z.string().min(1).nullable().optional(),
  duracaoMs: inteiroNaoNegativo.nullable().optional(),
});

export const chamadaSchema = z.strictObject({
  id: z.string().min(1),
  projectId: z.string().nullable(),
  intencao: z.enum(INTENCOES).nullable(),
  etapa: z.string().min(1),
  modelo: z.string().min(1),
  estado: z.enum(ESTADOS_CHAMADA),
  tokensEntrada: inteiroNaoNegativo,
  tokensSaida: inteiroNaoNegativo,
  tokensCacheLeitura: inteiroNaoNegativo,
  tokensCacheEscrita: inteiroNaoNegativo,
  lote: z.boolean(),
  duracaoMs: inteiroNaoNegativo.nullable(),
  custoEstimadoUsd: naoNegativo,
  criadoEm: z.string().min(1),
});

export const linhaRankingSchema = z.strictObject({
  modelo: z.string().min(1),
  nome: z.string().min(1),
  tier: z.enum(TIERS).nullable(),
  chamadas: z.number().int().positive(),
  sucessos: inteiroNaoNegativo,
  taxaSucesso: z.number().min(0).max(1),
  custoTotalUsd: naoNegativo,
  custoMedioUsd: naoNegativo,
  custoPorSucessoUsd: naoNegativo.nullable(),
  sucessosPorDolar: naoNegativo.nullable(),
  duracaoMediaMs: naoNegativo.nullable(),
  pontuacao: z.number().min(0).max(100),
  amostraPequena: z.boolean(),
});

export const porEtapaSchema = z.strictObject({
  etapa: z.string().min(1),
  chamadas: z.number().int().positive(),
  sucessos: inteiroNaoNegativo,
  custoTotalUsd: naoNegativo,
  modeloMaisUsado: z.string().nullable(),
});

export const painelSchema = z.strictObject({
  periodo: z.enum(PERIODOS),
  intencao: z.enum(INTENCOES_FILTRO),
  tetoUsd: naoNegativo,
  totais: z.strictObject({
    chamadas: inteiroNaoNegativo,
    sucessos: inteiroNaoNegativo,
    taxaSucesso: z.number().min(0).max(1),
    custoUsd: naoNegativo,
    percentualDoTeto: naoNegativo.nullable(),
  }),
  melhorModelo: z.string().nullable(),
  ranking: z.array(linhaRankingSchema),
  porEtapa: z.array(porEtapaSchema),
});

export const painelQuerySchema = z.strictObject({
  intencao: z.enum(INTENCOES_FILTRO).default('todas'),
  periodo: z.enum(PERIODOS).default('mes'),
});
