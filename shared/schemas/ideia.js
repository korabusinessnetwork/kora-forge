import { z } from 'zod';

// Ideia capturada sem sair do fluxo (RN-10, fluxo F-07). Tabela `ideas` já existe no schema
// inicial. `virou_projeto` está no enum e não é usado na Fase 1: transformar ideia em projeto é
// item próprio, e o estado ficou aqui para não precisar de migration quando chegar.
export const ESTADOS_IDEIA = Object.freeze(['aberta', 'virou_projeto', 'descartada']);

export const LIMITES_IDEIA = Object.freeze({ titulo: 120, proximoPasso: 500, origem: 80 });

export const ideiaSchema = z.strictObject({
  id: z.string().min(1),
  titulo: z.string().min(1).max(LIMITES_IDEIA.titulo),
  proximoPasso: z.string().max(LIMITES_IDEIA.proximoPasso).nullable(),
  origem: z.string().max(LIMITES_IDEIA.origem).nullable(),
  estado: z.enum(ESTADOS_IDEIA),
  criadoEm: z.string().min(1),
});

export const listaIdeiasSchema = z.strictObject({
  ideias: z.array(ideiaSchema),
});

// O título é aparado antes de medir: espaço nas pontas não conta como conteúdo, e um título só de
// espaços é vazio, não é título curto.
export const criarIdeiaSchema = z.strictObject({
  titulo: z.string().trim().min(1, 'Escreva um título para a ideia.').max(LIMITES_IDEIA.titulo, `O título passa de ${LIMITES_IDEIA.titulo} caracteres.`),
  proximoPasso: z.string().trim().max(LIMITES_IDEIA.proximoPasso, `O próximo passo passa de ${LIMITES_IDEIA.proximoPasso} caracteres.`).optional(),
  origem: z.string().trim().max(LIMITES_IDEIA.origem).optional(),
});

export const patchIdeiaSchema = z.strictObject({
  estado: z.enum(ESTADOS_IDEIA),
});
