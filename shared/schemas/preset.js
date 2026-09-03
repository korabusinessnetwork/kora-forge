import { z } from 'zod';
import { COMANDOS_PERMITIDOS } from '../comandos.js';

// Contrato do preset (docs/03_REGRAS_DE_NEGOCIO/presets.md, ADR-007). Preset é dado, nunca código.
export const ETAPAS = Object.freeze([
  'identidade', 'escopo', 'arquitetura', 'design', 'dados', 'apis', 'seguranca', 'fundacao', 'materializar',
]);
export const ETAPAS_OBRIGATORIAS = Object.freeze(['identidade', 'materializar']);
export const CATEGORIAS_PRESET = Object.freeze(['site', 'aplicacao', 'api', 'automacao']);
export const ORIGENS_PRESET = Object.freeze(['builtin', 'custom']);

export const slugSchema = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'use letras minúsculas, números e hífen');

export const comandoPresetSchema = z.strictObject({
  id: slugSchema,
  cmd: z.enum(COMANDOS_PERMITIDOS),
  args: z.array(z.string()),
  obrigatorio: z.boolean().default(false),
  timeout_ms: z.number().int().positive().optional(),
  longa_duracao: z.boolean().default(false),
});

export const requisitoPresetSchema = z.strictObject({
  bin: z.string().min(1),
  min: z.string().min(1).optional(),
});

export const presetSchema = z.strictObject({
  id: slugSchema,
  nome: z.string().min(1).max(60),
  descricao: z.string().min(1),
  versao: z.number().int().min(1),
  categoria: z.enum(CATEGORIAS_PRESET),
  icone: z.string().min(1),
  etapas: z.array(z.enum(ETAPAS)).min(2),
  defaults: z.record(z.string(), z.unknown()),
  arvore: z.array(z.string().min(1)),
  regras_extras: z.array(slugSchema),
  skills: z.array(z.string().min(1)),
  mcps: z.array(z.string().min(1)),
  requisitos: z.array(requisitoPresetSchema),
  comandos: z.array(comandoPresetSchema),
  definition_of_done: z.array(z.string().min(1)),
}).superRefine((preset, ctx) => {
  if (new Set(preset.etapas).size !== preset.etapas.length) {
    ctx.addIssue({ code: 'custom', path: ['etapas'], message: 'etapa repetida' });
  }
  for (const obrigatoria of ETAPAS_OBRIGATORIAS) {
    if (!preset.etapas.includes(obrigatoria)) {
      ctx.addIssue({ code: 'custom', path: ['etapas'], message: `etapa obrigatória ausente: ${obrigatoria}` });
    }
  }
  const ids = preset.comandos.map((comando) => comando.id);
  if (new Set(ids).size !== ids.length) {
    ctx.addIssue({ code: 'custom', path: ['comandos'], message: 'id de comando repetido' });
  }
});

export const presetResumoSchema = z.strictObject({
  id: slugSchema,
  nome: z.string().min(1),
  descricao: z.string().min(1),
  categoria: z.enum(CATEGORIAS_PRESET),
  icone: z.string().min(1),
  versao: z.number().int().min(1),
  origem: z.enum(ORIGENS_PRESET),
  etapas: z.array(z.enum(ETAPAS)),
});

export const listaPresetsSchema = z.array(presetResumoSchema);
