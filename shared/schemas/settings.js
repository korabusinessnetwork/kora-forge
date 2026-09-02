import { z } from 'zod';

export const TEMAS = ['escuro', 'claro'];

export const SETTINGS_PADRAO = Object.freeze({
  workspace: null,
  tema: 'escuro',
  copilotoTetoUsd: 5,
});

export const settingsSchema = z.strictObject({
  workspace: z.string().nullable(),
  tema: z.enum(TEMAS),
  copilotoTetoUsd: z.number().nonnegative(),
});

// PATCH aceita subconjunto. Schema estrito: chave desconhecida é rejeitada (C7).
export const settingsPatchSchema = z.strictObject({
  workspace: z.string().nullable().optional(),
  tema: z.enum(TEMAS).optional(),
  copilotoTetoUsd: z.number().nonnegative().optional(),
});
