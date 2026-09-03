import { planoSchema } from '@shared/schemas/plano.js';
import { enviar, validarContrato } from './api.js';

// Dry-run: pede o plano ao servidor. Nada é escrito em disco por esta chamada.
export async function gerarPlano(id) {
  return validarContrato(planoSchema, await enviar(`/projects/${encodeURIComponent(id)}/plano`, {}));
}
