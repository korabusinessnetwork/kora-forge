import { documentoDesignSchema } from '@shared/schemas/design.js';
import { obter, requisitar, validarContrato } from './api.js';

const caminho = (id) => `/projects/${encodeURIComponent(id)}/design`;

export async function obterDesign(id) {
  return validarContrato(documentoDesignSchema, await obter(caminho(id)));
}

// PUT porque o documento vai inteiro: o cliente manda o conjunto que quer, e quem decide o que
// virou versão nova é o servidor.
export async function salvarDesign(id, tokens) {
  return validarContrato(documentoDesignSchema, await requisitar('PUT', caminho(id), { tokens }));
}
