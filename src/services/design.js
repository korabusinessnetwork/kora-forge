import { designOuNadaSchema, listaVersoesDesignSchema } from '@shared/schemas/design.js';
import { obter, enviar, validarContrato } from './api.js';

// Único ponto do front que fala com as rotas de design. Componente nunca chama a API direto.
const daRota = (id) => `/projects/${encodeURIComponent(id)}/design`;

// `design` vem null quando o projeto ainda usa o padrão Kora, e isso é estado normal, não erro.
export async function obterDesign(id) {
  return validarContrato(designOuNadaSchema, await obter(daRota(id))).design;
}

export async function salvarDesign(id, documento) {
  return validarContrato(designOuNadaSchema, await enviar(daRota(id), documento)).design;
}

export async function listarVersoesDesign(id) {
  return validarContrato(listaVersoesDesignSchema, await obter(`${daRota(id)}/versoes`));
}
