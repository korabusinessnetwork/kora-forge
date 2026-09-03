import {
  catalogoSchema,
  chamadaEntradaSchema,
  chamadaSchema,
  painelQuerySchema,
  painelSchema,
  recomendacaoQuerySchema,
  recomendacoesSchema,
} from '../../../shared/schemas/eficiencia.js';
import { CATALOGO, recomendarTodas } from '../../../shared/eficiencia/motor.js';
import { validar } from '../../lib/validar.js';
import { traduzirErroEficiencia } from './servico.js';

export default async function rotasEficiencia(app, { eficiencia }) {
  app.get('/eficiencia/catalogo', { config: { schemaSaida: catalogoSchema } }, async () => CATALOGO);

  // Sem `etapa`, devolve as seis etapas da intenção. Com `etapa`, só aquela, no mesmo formato.
  app.get('/eficiencia/recomendacao', { config: { schemaSaida: recomendacoesSchema } }, async (request) => {
    const consulta = validar(recomendacaoQuerySchema, request.query ?? {});
    try {
      const todas = recomendarTodas(consulta.intencao);
      if (!consulta.etapa) return todas;
      return { ...todas, etapas: todas.etapas.filter((etapa) => etapa.etapa === consulta.etapa) };
    } catch (erro) {
      throw traduzirErroEficiencia(erro);
    }
  });

  app.get('/eficiencia/painel', { config: { schemaSaida: painelSchema } }, async (request) => {
    const consulta = validar(painelQuerySchema, request.query ?? {});
    return eficiencia.painel(consulta);
  });

  app.post('/eficiencia/chamadas', { config: { schemaSaida: chamadaSchema } }, async (request, reply) => {
    const entrada = validar(chamadaEntradaSchema, request.body ?? {});
    reply.code(201);
    return eficiencia.registrar(entrada);
  });
}
