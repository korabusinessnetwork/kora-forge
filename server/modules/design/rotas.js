import { documentoDesignSchema, salvarDesignSchema } from '../../../shared/schemas/design.js';
import { validar } from '../../lib/validar.js';

export default async function rotasDesign(app, { design }) {
  app.get('/projects/:id/design', { config: { schemaSaida: documentoDesignSchema } }, async (request) => design.obter(request.params.id));

  // PUT porque o documento é substituído inteiro: o cliente manda o conjunto de tokens que quer,
  // não um pedaço. Quem decide o que virou versão nova é o servidor.
  app.put('/projects/:id/design', { config: { schemaSaida: documentoDesignSchema } }, async (request) => {
    const dados = validar(salvarDesignSchema, request.body ?? {});
    return design.salvar(request.params.id, dados);
  });
}
