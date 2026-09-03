import {
  listaProjetosSchema, projetoComBlueprintSchema, criarProjetoSchema, patchProjetoSchema, filtroProjetosSchema,
} from '../../../shared/schemas/projeto.js';
import { blueprintSchema, listaVersoesBlueprintSchema } from '../../../shared/schemas/blueprint.js';
import { validar } from '../../lib/validar.js';

// Query string vazia equivale a ausente: "?status=" é o padrão, não um erro.
function limparQuery(query) {
  const limpa = {};
  for (const [chave, valor] of Object.entries(query ?? {})) {
    if (typeof valor === 'string' && valor !== '') limpa[chave] = valor;
  }
  return limpa;
}

export default async function rotasProjetos(app, { projetos }) {
  app.get('/projects', { config: { schemaSaida: listaProjetosSchema } }, async (request) => {
    const filtro = validar(filtroProjetosSchema, limparQuery(request.query));
    return projetos.listar(filtro);
  });

  app.post('/projects', { config: { schemaSaida: projetoComBlueprintSchema } }, async (request, reply) => {
    const dados = validar(criarProjetoSchema, request.body ?? {});
    reply.code(201);
    return projetos.criar(dados);
  });

  app.get('/projects/:id', { config: { schemaSaida: projetoComBlueprintSchema } }, async (request) => projetos.obterOuFalhar(request.params.id));

  app.patch('/projects/:id', { config: { schemaSaida: projetoComBlueprintSchema } }, async (request) => {
    const patch = validar(patchProjetoSchema, request.body ?? {});
    return projetos.atualizar(request.params.id, patch);
  });

  app.post('/projects/:id/blueprint', { config: { schemaSaida: projetoComBlueprintSchema } }, async (request) => {
    const payload = validar(blueprintSchema, request.body ?? {});
    return projetos.salvarBlueprint(request.params.id, payload);
  });

  app.get('/projects/:id/blueprint/versoes', { config: { schemaSaida: listaVersoesBlueprintSchema } }, async (request) => projetos.listarVersoes(request.params.id));
}
