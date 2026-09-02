import { z } from 'zod';
import { codigosErro } from '../erros.js';

// Envelope de toda resposta da API local: { data, error, meta }. Validado nas duas pontas.
export const issueSchema = z.strictObject({
  caminho: z.string(),
  mensagem: z.string(),
});

export const erroApiSchema = z.strictObject({
  codigo: z.enum(codigosErro),
  mensagem: z.string().min(1),
  detalhe: z.record(z.string(), z.unknown()),
});

export const metaSchema = z.strictObject({
  requestId: z.string().min(1),
  duracaoMs: z.number().nonnegative(),
});

export const envelopeSchema = z.strictObject({
  data: z.unknown(),
  error: erroApiSchema.nullable(),
  meta: metaSchema,
});
