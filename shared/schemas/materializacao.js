import { z } from 'zod';
import { COMANDOS_PERMITIDOS } from '../comandos.js';

export const ESTADOS_RUN = Object.freeze(['rodando', 'sucesso', 'falha', 'cancelado', 'timeout', 'pulado']);
export const ESTADOS_MATERIALIZACAO = Object.freeze(['escrevendo', 'rodando', 'parado_em_falha', 'concluida', 'abortada']);
export const ACOES_DECISAO = Object.freeze(['repetir', 'pular', 'abortar']);

// O cliente manda só o hash. O servidor regera o plano e confere: o executado é o aprovado.
export const pedidoMaterializacaoSchema = z.strictObject({
  hashBlueprint: z.string().regex(/^sha256:[0-9a-f]{64}$/),
});

export const decisaoSchema = z.strictObject({
  acao: z.enum(ACOES_DECISAO),
});

export const comandoExecutadoSchema = z.strictObject({
  id: z.string().min(1),
  cmd: z.enum(COMANDOS_PERMITIDOS),
  args: z.array(z.string()),
  obrigatorio: z.boolean(),
  longaDuracao: z.boolean(),
  estado: z.enum([...ESTADOS_RUN, 'pendente']),
  runId: z.string().nullable(),
  exitCode: z.number().int().nullable(),
  erro: z.string().nullable(),
});

export const materializacaoSchema = z.strictObject({
  projetoId: z.string().min(1),
  raiz: z.string().min(1),
  estado: z.enum(ESTADOS_MATERIALIZACAO),
  arquivos: z.strictObject({
    criados: z.number().int().nonnegative(),
    sobrescritos: z.number().int().nonnegative(),
    pulados: z.number().int().nonnegative(),
  }),
  comandos: z.array(comandoExecutadoSchema),
  indice: z.number().int(),
  iniciadaEm: z.string().min(1),
  terminadaEm: z.string().nullable(),
});

export const materializacaoOuNadaSchema = z.strictObject({
  materializacao: materializacaoSchema.nullable(),
});

export const ferramentaSchema = z.strictObject({
  bin: z.string().min(1),
  min: z.string().nullable(),
  encontrada: z.string().nullable(),
  ok: z.boolean(),
});
