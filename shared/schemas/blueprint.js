import { z } from 'zod';
import { ETAPAS, slugSchema } from './preset.js';
import { respostasSchema } from './respostas.js';

const listaDeEtapas = () => z.array(z.enum(ETAPAS));

// Blueprint (RN-02): o projeto inteiro como dado, versionado. O wizard preenche `respostas`.
export const blueprintSchema = z.strictObject({
  preset: z.strictObject({
    id: slugSchema,
    versao: z.number().int().min(1),
  }),
  etapaAtual: z.enum(ETAPAS),
  etapasConcluidas: listaDeEtapas(),
  assumidas: listaDeEtapas(),
  respostas: respostasSchema,
}).superRefine((blueprint, ctx) => {
  for (const campo of ['etapasConcluidas', 'assumidas']) {
    const lista = blueprint[campo];
    if (new Set(lista).size !== lista.length) {
      ctx.addIssue({ code: 'custom', path: [campo], message: 'etapa repetida' });
    }
  }
  // Concluída e assumida são exclusivas: ou o usuário respondeu, ou aceitou o default.
  const nasDuas = blueprint.etapasConcluidas.filter((etapa) => blueprint.assumidas.includes(etapa));
  if (nasDuas.length > 0) {
    ctx.addIssue({ code: 'custom', path: ['assumidas'], message: `etapa não pode ser concluída e assumida ao mesmo tempo: ${nasDuas.join(', ')}` });
  }
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
