import { z } from 'zod';
import { ETAPAS, slugSchema } from './preset.js';
import { OPERADORES_FOLHA, OPERADORES_GRUPO } from '../avaliador.js';

// Contrato da regra (ADR-004, padrão P-08). Objeto estrito: campo desconhecido é rejeitado,
// nunca ignorado (controle C7), porque regra importada é dado de fora.
export const SEVERIDADES = Object.freeze(['info', 'aviso', 'bloqueio']);
export const RESOLUCOES = Object.freeze(['automatica', 'humana']);
export const ESTADOS_HIT = Object.freeze(['aberto', 'resolvido', 'dispensado', 'ignorado']);
export const TIPOS_EFEITO = Object.freeze([
  'avisar', 'exigir_adr', 'adicionar_arquivo', 'remover_arquivo', 'sugerir_valor',
  'adicionar_dependencia', 'adicionar_comando', 'adicionar_item_backlog', 'marcar_seguranca', 'bloquear',
]);

const condicaoFolhaSchema = z.strictObject({
  campo: z.string().min(1),
  operador: z.enum(OPERADORES_FOLHA),
  valor: z.unknown().optional(),
});

export const condicaoSchema = z.lazy(() => z.union([
  condicaoFolhaSchema,
  z.strictObject({
    operador: z.enum(OPERADORES_GRUPO),
    condicoes: z.array(condicaoSchema).min(2),
  }),
]));

export const efeitoSchema = z.strictObject({
  tipo: z.enum(TIPOS_EFEITO),
  template: z.string().optional(),
  texto: z.string().optional(),
  campo: z.string().optional(),
  valor: z.union([z.string(), z.number(), z.boolean()]).optional(),
  pacote: z.string().optional(),
  comando: z.string().optional(),
  controle: z.string().optional(),
});

export const regraSchema = z.strictObject({
  id: slugSchema,
  versao: z.number().int().min(1),
  severidade: z.enum(SEVERIDADES),
  titulo: z.string().min(1),
  explicacao: z.string().min(1),
  quando: condicaoSchema,
  efeitos: z.array(efeitoSchema).min(1),
  dispensavel: z.boolean(),
  resolucao: z.enum(RESOLUCOES),
  etapa: z.enum(ETAPAS).optional(),
  campo: z.string().optional(),
}).superRefine((regra, ctx) => {
  if (regra.efeitos.some((efeito) => efeito.tipo === 'bloquear') && regra.severidade !== 'bloqueio') {
    ctx.addIssue({ code: 'custom', path: ['efeitos'], message: 'efeito "bloquear" exige severidade "bloqueio"' });
  }
  // Resolução automática é do gerador, não do usuário. Dispensar o que ninguém precisa
  // resolver seria oferecer uma decisão que não existe.
  if (regra.resolucao === 'automatica' && regra.dispensavel) {
    ctx.addIssue({ code: 'custom', path: ['resolucao'], message: 'regra de resolução automática não pode ser dispensável' });
  }
});

export const hitSchema = z.strictObject({
  id: z.string().min(1),
  regraId: slugSchema,
  severidade: z.enum(SEVERIDADES),
  estado: z.enum(ESTADOS_HIT),
  titulo: z.string().min(1),
  explicacao: z.string().min(1),
  etapa: z.enum(ETAPAS).nullable(),
  campo: z.string().nullable(),
  dispensavel: z.boolean(),
  resolucao: z.enum(RESOLUCOES),
  efeitos: z.array(efeitoSchema),
  justificativa: z.string().nullable(),
});

export const avaliacaoSchema = z.strictObject({
  hits: z.array(hitSchema),
  bloqueios: z.number().int().nonnegative(),
  podeMaterializar: z.boolean(),
});

export const patchHitSchema = z.strictObject({
  estado: z.enum(ESTADOS_HIT),
  justificativa: z.string().optional(),
});
