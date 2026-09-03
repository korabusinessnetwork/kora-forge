import { z } from 'zod';
import { ETAPAS, slugSchema } from './preset.js';

// Blueprint (RN-02): o projeto inteiro como dado, versionado. O wizard (bloco 4) preenche respostas.
export const blueprintSchema = z.strictObject({
  preset: z.strictObject({
    id: slugSchema,
    versao: z.number().int().min(1),
  }),
  etapaAtual: z.enum(ETAPAS),
  etapasConcluidas: z.array(z.enum(ETAPAS)),
  assumidas: z.array(z.enum(ETAPAS)),
  respostas: z.record(z.string(), z.record(z.string(), z.unknown())),
});

export const versaoBlueprintSchema = z.strictObject({
  versao: z.number().int().min(1),
  ativo: z.boolean(),
  criadoEm: z.string().min(1),
});

export const listaVersoesBlueprintSchema = z.array(versaoBlueprintSchema);

export const blueprintRegistroSchema = z.strictObject({
  versao: z.number().int().min(1),
  ativo: z.boolean(),
  criadoEm: z.string().min(1),
  payload: blueprintSchema,
});
