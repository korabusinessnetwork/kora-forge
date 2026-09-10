import { ideiaSchema, listaIdeiasSchema, criarIdeiaSchema, patchIdeiaSchema } from '../../../shared/schemas/ideia.js';
import { validar } from '../../lib/validar.js';

export default async function rotasIdeias(app, { ideias }) {
  app.get('/ideias', { config: { schemaSaida: listaIdeiasSchema } }, async () => ideias.listar());

  app.post('/ideias', { config: { schemaSaida: ideiaSchema } }, async (request, reply) => {
    const dados = validar(criarIdeiaSchema, request.body ?? {});
    reply.code(201);
    return ideias.criar(dados);
  });

  app.patch('/ideias/:id', { config: { schemaSaida: ideiaSchema } }, async (request) => {
    const { estado } = validar(patchIdeiaSchema, request.body ?? {});
    return ideias.mudarEstado(request.params.id, estado);
  });
}
