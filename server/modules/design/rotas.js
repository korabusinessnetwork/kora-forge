import { documentoDesignSchema, designOuNadaSchema, listaVersoesDesignSchema } from '../../../shared/schemas/design.js';
import { validar } from '../../lib/validar.js';

export default async function rotasDesign(app, { design }) {
  app.get('/projects/:id/design', { config: { schemaSaida: designOuNadaSchema } }, async (request) => ({
    design: design.obter(request.params.id),
  }));

  app.post('/projects/:id/design', { config: { schemaSaida: designOuNadaSchema } }, async (request) => {
    const payload = validar(documentoDesignSchema, request.body ?? {});
    return { design: design.salvar(request.params.id, payload) };
  });

  app.get('/projects/:id/design/versoes', { config: { schemaSaida: listaVersoesDesignSchema } }, async (request) => design.listarVersoes(request.params.id));
}
