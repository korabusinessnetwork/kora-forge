import { z } from 'zod';

export const ESTADOS_COFRE = ['ausente', 'trancado', 'destrancado'];

export const healthSchema = z.strictObject({
  versao: z.string().min(1),
  workspace: z.strictObject({
    configurado: z.boolean(),
    caminho: z.string().nullable(),
  }),
  cofre: z.enum(ESTADOS_COFRE),
  copiloto: z.strictObject({
    ligado: z.boolean(),
  }),
});
