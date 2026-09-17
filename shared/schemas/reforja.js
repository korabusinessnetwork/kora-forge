import { z } from 'zod';
import { ESTADOS_ITEM } from '../reforja/estados.js';
import { SEVERIDADES, UNIDADES } from '../reforja/sinais.js';
import { LIMITES_PROPOSTA } from '../reforja/propostas.js';

// Contratos da Auto-Reforja (ADR-014). Tabela `reforge_items`, migração 20260914_reforja.sql.
export const ORIGENS_ITEM = Object.freeze(['manual', 'diagnostico', 'modelo']);
export const PRIORIDADES_ITEM = Object.freeze(['alta', 'media', 'baixa']);
export const MOTIVOS_INDISPONIVEL = Object.freeze(['sem_modelos', 'desligado', 'desconectado']);
export const LIMITES_ITEM = Object.freeze({ titulo: 120, descricao: 2000, sinalId: 80 });

const inteiro = z.number().int().nonnegative();

export const itemSchema = z.strictObject({
  id: z.string().min(1),
  titulo: z.string().min(1).max(LIMITES_ITEM.titulo),
  descricao: z.string().max(LIMITES_ITEM.descricao).nullable(),
  origem: z.enum(ORIGENS_ITEM),
  sinal: z.string().max(LIMITES_ITEM.sinalId).nullable(),
  estado: z.enum(ESTADOS_ITEM),
  prioridade: z.enum(PRIORIDADES_ITEM),
  specCaminho: z.string().nullable(),
  criadoEm: z.string().min(1),
  atualizadoEm: z.string().min(1),
});

export const listaItensSchema = z.strictObject({
  itens: z.array(itemSchema),
  contagem: z.strictObject(Object.fromEntries(ESTADOS_ITEM.map((estado) => [estado, inteiro]))),
});

export const criarItemSchema = z.strictObject({
  titulo: z.string().trim().min(1, 'Escreva um título para a melhoria.').max(LIMITES_ITEM.titulo, `O título passa de ${LIMITES_ITEM.titulo} caracteres.`),
  descricao: z.string().trim().max(LIMITES_ITEM.descricao, `A descrição passa de ${LIMITES_ITEM.descricao} caracteres.`).optional(),
  prioridade: z.enum(PRIORIDADES_ITEM).optional(),
  // Diagnóstico não entra por aqui: item de sinal nasce só pela rota que recalcula o sinal.
  origem: z.enum(['manual', 'modelo']).optional(),
});

export const transformarSinalSchema = z.strictObject({
  sinalId: z.string().trim().min(1).max(LIMITES_ITEM.sinalId).regex(/^[a-z0-9-]+$/, 'Id de sinal inválido.'),
});

export const resultadoSinalSchema = z.strictObject({
  item: itemSchema,
  criado: z.boolean(),
});

export const mudarEstadoSchema = z.strictObject({
  para: z.enum(ESTADOS_ITEM),
});

export const gerarSpecSchema = z.strictObject({
  sobrescrever: z.boolean().optional(),
});

export const previaSpecSchema = z.strictObject({
  caminho: z.string().min(1),
  conteudo: z.string().min(1),
  existe: z.boolean(),
  versaoTemplate: z.string().min(1),
});

export const specGeradaSchema = z.strictObject({
  item: itemSchema,
  caminho: z.string().min(1),
  sobrescrito: z.boolean(),
});

export const evidenciaSchema = z.strictObject({
  arquivo: z.string().min(1),
  contagem: inteiro.nullable(),
});

export const sinalSchema = z.strictObject({
  id: z.string().min(1),
  titulo: z.string().min(1),
  severidade: z.enum(SEVERIDADES),
  unidade: z.enum(UNIDADES),
  sugestao: z.string().min(1),
  total: inteiro,
  ocorrencias: inteiro,
  evidencias: z.array(evidenciaSchema),
  evidenciasOcultas: inteiro,
});

export const diagnosticoSchema = z.strictObject({
  sinais: z.array(sinalSchema),
  resumo: z.strictObject({ total: inteiro, alta: inteiro, media: inteiro, baixa: inteiro }),
  arquivosLidos: inteiro,
  limites: z.strictObject({ linhas: inteiro, bytes: inteiro, evidencias: inteiro }),
});

export const estadoSugestoesSchema = z.strictObject({
  disponivel: z.boolean(),
  motivo: z.enum(MOTIVOS_INDISPONIVEL).nullable(),
});

export const propostaSchema = z.strictObject({
  titulo: z.string().min(1).max(LIMITES_PROPOSTA.titulo),
  descricao: z.string().max(LIMITES_PROPOSTA.descricao),
});

export const sugestoesSchema = z.strictObject({
  propostas: z.array(propostaSchema).max(LIMITES_PROPOSTA.maximo),
  descartadas: inteiro,
  formatoReconhecido: z.boolean(),
  modelo: z.string().max(120).nullable(),
});

export const manifestoSpecSchema = z.strictObject({
  id: z.literal('reforja-spec'),
  versao: z.string().regex(/^\d+\.\d+\.\d+$/),
  descricao: z.string().min(1),
  vazios: z.strictObject({ descricao: z.string().min(1), sinal: z.string().min(1), aDefinir: z.string().min(1) }),
  origens: z.strictObject(Object.fromEntries(ORIGENS_ITEM.map((origem) => [origem, z.string().min(1)]))),
  prioridades: z.strictObject(Object.fromEntries(PRIORIDADES_ITEM.map((prioridade) => [prioridade, z.string().min(1)]))),
});

export const manifestoSugestaoSchema = z.strictObject({
  id: z.literal('reforja-sugestao'),
  versao: z.string().regex(/^\d+\.\d+\.\d+$/),
  descricao: z.string().min(1),
  maxTokens: z.number().int().positive().max(4000),
});
