import { criarConexaoSchema, conexaoSchema, idConexaoSchema, listaConexoesSchema, testeConexaoSchema } from '../../../shared/schemas/conexoes.js';
import { validar } from '../../lib/validar.js';

export default async function rotasConexoes(app, { conexoes }) {
  app.get('/connections', { config: { schemaSaida: listaConexoesSchema } }, async () => conexoes.listar());
  app.post('/connections', { config: { schemaSaida: conexaoSchema } }, async (request, reply) => {
    const dados = validar(criarConexaoSchema, request.body ?? {});
    reply.code(201);
    return conexoes.criar(dados);
  });
  app.post('/connections/:id/testar', { config: { schemaSaida: testeConexaoSchema } }, async (request) => conexoes.testar(validar(idConexaoSchema, request.params).id));
}
