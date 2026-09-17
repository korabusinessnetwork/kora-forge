import { criarCofreSchema, destrancarCofreSchema, estadoCofreSchema } from '../../../shared/schemas/cofre.js';
import { validar } from '../../lib/validar.js';

export default async function rotasCofre(app, { cofre }) {
  app.get('/vault', { config: { schemaSaida: estadoCofreSchema } }, async () => ({ estado: cofre.estado() }));
  app.post('/vault', { config: { schemaSaida: estadoCofreSchema } }, async (request, reply) => {
    const { senha } = validar(criarCofreSchema, request.body ?? {});
    reply.code(201);
    return cofre.criar(senha);
  });
  app.post('/vault/destrancar', { config: { schemaSaida: estadoCofreSchema } }, async (request) => {
    const { senha } = validar(destrancarCofreSchema, request.body ?? {});
    return cofre.destrancar(senha);
  });
}
