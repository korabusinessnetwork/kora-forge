import { z } from 'zod';
import { COMANDOS_PERMITIDOS } from '../comandos.js';

// O plano é o contrato entre planejar e executar (ADR-002). O runner recebe isto, não a intenção.
export const ACOES_ARQUIVO = Object.freeze(['criar', 'sobrescrever', 'pular']);

export const arquivoPlanoSchema = z.strictObject({
  caminho: z.string().min(1),
  acao: z.enum(ACOES_ARQUIVO),
  tamanho: z.number().int().nonnegative(),
  tamanhoAtual: z.number().int().nonnegative().nullable(),
  template: z.string().min(1),
  conteudo: z.string(),
});

export const comandoPlanoSchema = z.strictObject({
  id: z.string().min(1),
  cmd: z.enum(COMANDOS_PERMITIDOS),
  args: z.array(z.string()),
  obrigatorio: z.boolean(),
  longaDuracao: z.boolean(),
  timeoutMs: z.number().int().positive(),
});

export const pendenciaSchema = z.strictObject({
  tipo: z.enum(['template']),
  item: z.string().min(1),
  motivo: z.string().min(1),
});

export const planoSchema = z.strictObject({
  hashBlueprint: z.string().regex(/^sha256:[0-9a-f]{64}$/),
  raiz: z.string().min(1),
  arquivos: z.array(arquivoPlanoSchema),
  comandos: z.array(comandoPlanoSchema),
  pendencias: z.array(pendenciaSchema),
  totais: z.strictObject({
    arquivos: z.number().int().nonnegative(),
    bytes: z.number().int().nonnegative(),
    conflitos: z.number().int().nonnegative(),
    pulados: z.number().int().nonnegative(),
  }),
});

export const manifestoTemplateSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  versao: z.number().int().min(1),
  descricao: z.string().min(1),
  // Ordem de escrita (RN-05.4): fundação, config, código.
  ordem: z.number().int().min(0).max(99),
});
