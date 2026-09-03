import { z } from 'zod';

// Respostas do wizard, uma por etapa. Todo campo tem default: resposta parcial é válida,
// porque o wizard salva enquanto o usuário preenche. O schema valida forma, nunca completude
// (completude é `etapaEstaCompleta` em shared/etapas.js).
const texto = () => z.string().default('');
const listaDeTextos = () => z.array(z.string()).default([]);

export const MODELOS_ARQUITETURA = Object.freeze(['A', 'B', 'C']);

export const entidadeSchema = z.strictObject({
  nome: texto(),
  descricao: texto(),
  campos: listaDeTextos(),
});

export const respostaIdentidadeSchema = z.strictObject({
  nome: texto(),
  essencia: texto(),
  problema: texto(),
  valor: texto(),
});

export const respostaEscopoSchema = z.strictObject({
  publico: texto(),
  personas: listaDeTextos(),
  ahaMoment: texto(),
  naoObjetivos: listaDeTextos(),
});

export const respostaArquiteturaSchema = z.strictObject({
  modelo: z.enum(MODELOS_ARQUITETURA).default('A'),
  stack: listaDeTextos(),
  multiTenant: z.boolean().default(false),
  whiteLabel: z.boolean().default(false),
  auth: z.boolean().default(false),
  deploy: texto(),
});

export const respostaDadosSchema = z.strictObject({
  entidades: z.array(entidadeSchema).default([]),
});

export const respostaSegurancaSchema = z.strictObject({
  dadoPessoal: z.boolean().default(false),
  dadoFinanceiro: z.boolean().default(false),
  compliance: listaDeTextos(),
  tierGratuito: z.boolean().default(true),
  observacoes: texto(),
});

export const respostaFundacaoSchema = z.strictObject({
  observacoes: texto(),
});

export const respostaMaterializarSchema = z.strictObject({
  confirmada: z.boolean().default(false),
});

// Design e APIs chegam nas fases 2 e 3. Nesta fase a etapa existe e só pode ser assumida.
export const respostaVaziaSchema = z.strictObject({});

export const SCHEMA_POR_ETAPA = Object.freeze({
  identidade: respostaIdentidadeSchema,
  escopo: respostaEscopoSchema,
  arquitetura: respostaArquiteturaSchema,
  design: respostaVaziaSchema,
  dados: respostaDadosSchema,
  apis: respostaVaziaSchema,
  seguranca: respostaSegurancaSchema,
  fundacao: respostaFundacaoSchema,
  materializar: respostaMaterializarSchema,
});

export const respostasSchema = z.strictObject({
  identidade: respostaIdentidadeSchema.optional(),
  escopo: respostaEscopoSchema.optional(),
  arquitetura: respostaArquiteturaSchema.optional(),
  design: respostaVaziaSchema.optional(),
  dados: respostaDadosSchema.optional(),
  apis: respostaVaziaSchema.optional(),
  seguranca: respostaSegurancaSchema.optional(),
  fundacao: respostaFundacaoSchema.optional(),
  materializar: respostaMaterializarSchema.optional(),
});
