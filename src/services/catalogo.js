import { catalogoSchema } from '@shared/schemas/catalogo.js';
import { obter, validarContrato } from './api.js';

// Único ponto do front que fala com a rota do catálogo. O catálogo é o mesmo para todo projeto,
// então não leva id: quem guarda a versão usada é o documento de design.
export async function obterCatalogo() {
  return validarContrato(catalogoSchema, await obter('/catalog'));
}
