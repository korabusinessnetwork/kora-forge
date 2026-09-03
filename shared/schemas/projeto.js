import { z } from 'zod';
import { ETAPAS, slugSchema } from './preset.js';
import { blueprintRegistroSchema } from './blueprint.js';

// Projeto (RN-01). Status e regras de slug em docs/03_REGRAS_DE_NEGOCIO/README.md.
export const STATUS_PROJETO = Object.freeze(['rascunho', 'pronto_para_materializar', 'materializado', 'arquivado']);

const nomeSchema = z.string().trim().min(1, 'informe um nome').max(80, 'no máximo 80 caracteres');

export const projetoResumoSchema = z.strictObject({
  id: z.string().min(1),
  nome: z.string().min(1),
  slug: slugSchema,
  presetId: slugSchema,
  presetNome: z.string().min(1),
  presetVersao: z.number().int().min(1),
  status: z.enum(STATUS_PROJETO),
  etapaAtual: z.enum(ETAPAS).nullable(),
  caminhoDisco: z.string().nullable(),
  criadoEm: z.string().min(1),
  atualizadoEm: z.string().min(1),
});

export const listaProjetosSchema = z.array(projetoResumoSchema);

export const projetoComBlueprintSchema = z.strictObject({
  projeto: projetoResumoSchema,
  blueprint: blueprintRegistroSchema,
});

export const criarProjetoSchema = z.strictObject({
  nome: nomeSchema,
  presetId: slugSchema,
});

export const patchProjetoSchema = z.strictObject({
  nome: nomeSchema.optional(),
  arquivado: z.boolean().optional(),
});

export const filtroProjetosSchema = z.strictObject({
  status: z.enum(STATUS_PROJETO).optional(),
  busca: z.string().max(80).optional(),
});
