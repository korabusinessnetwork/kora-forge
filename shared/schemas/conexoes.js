import { z } from 'zod';

const cabecalhoChaveSchema = z.string().trim().regex(/^[A-Za-z0-9-]{1,80}$/, 'Use somente letras, numeros e hifen no nome do cabecalho.');
const prefixoChaveSchema = z.string().max(100).refine((valor) => !/[\r\n]/.test(valor), 'O prefixo nao pode conter quebra de linha.');
const urlTesteSchema = z.string().trim().url('Use uma URL completa para testar a conexao.').max(500).refine((valor) => {
  const url = new URL(valor);
  return url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname));
}, 'Use HTTPS. HTTP so e aceito para localhost.');

export const conexaoSchema = z.strictObject({
  id: z.string().uuid(),
  alias: z.string().min(1).max(80),
  provedor: z.string().min(1).max(80),
  tipo: z.string().min(1).max(80),
  endpoint: z.string().url().nullable(),
  urlTeste: z.string().url().nullable(),
  cabecalhoChave: cabecalhoChaveSchema,
  prefixoChave: prefixoChaveSchema,
  status: z.enum(['pendente', 'ativa', 'invalida']),
  criadaEm: z.string().min(1),
  atualizadaEm: z.string().min(1),
});
export const listaConexoesSchema = z.strictObject({ conexoes: z.array(conexaoSchema) });
export const criarConexaoSchema = z.strictObject({
  alias: z.string().trim().min(1, 'Dê um nome para reconhecer esta chave.').max(80),
  provedor: z.string().trim().min(1, 'Informe o provedor.').max(80),
  tipo: z.string().trim().min(1, 'Informe o tipo de API.').max(80),
  endpoint: z.string().trim().url('Use uma URL completa, como https://api.exemplo.com.').max(500).optional(),
  urlTeste: urlTesteSchema.optional(),
  cabecalhoChave: cabecalhoChaveSchema.default('Authorization'),
  prefixoChave: prefixoChaveSchema.default('Bearer '),
  chave: z.string().trim().min(1, 'Cole a chave da API.'),
});
export const testeConexaoSchema = z.strictObject({
  conexao: conexaoSchema,
  resultado: z.enum(['sucesso', 'recusada', 'indisponivel']),
});
export const idConexaoSchema = z.strictObject({ id: z.string().uuid() });
