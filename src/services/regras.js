import { avaliacaoSchema } from '@shared/schemas/regra.js';
import { obter, enviar, alterar, validarContrato } from './api.js';

const base = (id) => `/projects/${encodeURIComponent(id)}/regras`;

export async function listarRegras(id) {
  return validarContrato(avaliacaoSchema, await obter(base(id)));
}

export async function avaliarRegras(id) {
  return validarContrato(avaliacaoSchema, await enviar(`${base(id)}/avaliar`, {}));
}

export async function decidirSobreHit(id, hitId, patch) {
  return validarContrato(avaliacaoSchema, await alterar(`${base(id)}/${encodeURIComponent(hitId)}`, patch));
}
