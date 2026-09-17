import {
  criarItemSchema,
  diagnosticoSchema,
  estadoSugestoesSchema,
  gerarSpecSchema,
  itemSchema,
  listaItensSchema,
  mudarEstadoSchema,
  previaSpecSchema,
  resultadoSinalSchema,
  specGeradaSchema,
  sugestoesSchema,
  transformarSinalSchema,
} from '../../../shared/schemas/reforja.js';
import { validar } from '../../lib/validar.js';

// Rotas da Auto-Reforja (ADR-014). Não existe DELETE: melhoria é descartada, nunca apagada.
export default async function rotasReforja(app, { reforja }) {
  app.get('/reforja/diagnostico', { config: { schemaSaida: diagnosticoSchema } }, async () => reforja.diagnosticar());

  app.get('/reforja/itens', { config: { schemaSaida: listaItensSchema } }, async () => reforja.listar());

  app.post('/reforja/itens', { config: { schemaSaida: itemSchema } }, async (request, reply) => {
    const dados = validar(criarItemSchema, request.body ?? {});
    reply.code(201);
    return reforja.criar(dados);
  });

  app.post('/reforja/itens/do-sinal', { config: { schemaSaida: resultadoSinalSchema } }, async (request, reply) => {
    const { sinalId } = validar(transformarSinalSchema, request.body ?? {});
    const resultado = reforja.transformarSinal(sinalId);
    reply.code(resultado.criado ? 201 : 200);
    return resultado;
  });

  app.patch('/reforja/itens/:id/estado', { config: { schemaSaida: itemSchema } }, async (request) => {
    const { para } = validar(mudarEstadoSchema, request.body ?? {});
    return reforja.mudarEstado(request.params.id, para);
  });

  app.post('/reforja/itens/:id/spec/previa', { config: { schemaSaida: previaSpecSchema } }, async (request) => reforja.previaSpec(request.params.id));

  app.post('/reforja/itens/:id/spec', { config: { schemaSaida: specGeradaSchema } }, async (request, reply) => {
    const { sobrescrever } = validar(gerarSpecSchema, request.body ?? {});
    const resultado = reforja.gerarSpec(request.params.id, { sobrescrever });
    reply.code(201);
    return resultado;
  });

  app.get('/reforja/sugestoes/estado', { config: { schemaSaida: estadoSugestoesSchema } }, async () => reforja.estadoSugestoes());

  app.post('/reforja/sugestoes', { config: { schemaSaida: sugestoesSchema } }, async () => reforja.pedirSugestoes());
}
