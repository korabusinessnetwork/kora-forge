import { avaliacaoSchema, patchHitSchema } from '../../../shared/schemas/regra.js';
import { validar } from '../../lib/validar.js';

export default async function rotasRegras(app, { regras, projetos, presets }) {
  const contextoDe = (id) => {
    const { projeto, blueprint } = projetos.obterOuFalhar(id);
    return { projeto, blueprint, preset: presets.obterOuFalhar(projeto.presetId) };
  };

  app.get('/projects/:id/regras', { config: { schemaSaida: avaliacaoSchema } }, async (request) => {
    projetos.obterOuFalhar(request.params.id);
    return regras.listar(request.params.id);
  });

  app.post('/projects/:id/regras/avaliar', { config: { schemaSaida: avaliacaoSchema } }, async (request) => regras.avaliar(contextoDe(request.params.id)));

  app.patch('/projects/:id/regras/:hitId', { config: { schemaSaida: avaliacaoSchema } }, async (request) => {
    const patch = validar(patchHitSchema, request.body ?? {});
    const { projeto } = projetos.obterOuFalhar(request.params.id);
    return regras.atualizarHit({ projeto, hitId: request.params.hitId, patch });
  });
}
