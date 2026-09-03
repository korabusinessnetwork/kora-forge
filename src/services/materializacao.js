import { z } from 'zod';
import { materializacaoSchema, materializacaoOuNadaSchema } from '@shared/schemas/materializacao.js';
import { obter, enviar, validarContrato } from './api.js';

const paradaSchema = z.strictObject({ runId: z.string().min(1), estado: z.string().min(1) });
const base = (id) => `/projects/${encodeURIComponent(id)}/materializar`;

// O cliente manda só o hash do plano aprovado. Quem regera o plano e escreve é o servidor.
export async function materializar(id, hashBlueprint) {
  return validarContrato(materializacaoSchema, await enviar(base(id), { hashBlueprint }));
}

export async function obterMaterializacao(id) {
  return validarContrato(materializacaoOuNadaSchema, await obter(base(id))).materializacao;
}

export async function decidirMaterializacao(id, acao) {
  return validarContrato(materializacaoSchema, await enviar(`${base(id)}/decidir`, { acao }));
}

export async function pararRun(runId) {
  return validarContrato(paradaSchema, await enviar(`/runs/${encodeURIComponent(runId)}/parar`, {}));
}
