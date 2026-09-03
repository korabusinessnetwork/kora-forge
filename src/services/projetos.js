import { listaProjetosSchema, projetoComBlueprintSchema } from '@shared/schemas/projeto.js';
import { listaVersoesBlueprintSchema } from '@shared/schemas/blueprint.js';
import { obter, enviar, alterar, validarContrato } from './api.js';

export function montarQueryProjetos({ status, busca } = {}) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (busca) params.set('busca', busca);
  const texto = params.toString();
  return texto ? `?${texto}` : '';
}

export async function listarProjetos(filtro = {}) {
  return validarContrato(listaProjetosSchema, await obter(`/projects${montarQueryProjetos(filtro)}`));
}

export async function criarProjeto(dados) {
  return validarContrato(projetoComBlueprintSchema, await enviar('/projects', dados));
}

export async function obterProjeto(id) {
  return validarContrato(projetoComBlueprintSchema, await obter(`/projects/${encodeURIComponent(id)}`));
}

export async function atualizarProjeto(id, patch) {
  return validarContrato(projetoComBlueprintSchema, await alterar(`/projects/${encodeURIComponent(id)}`, patch));
}

export async function salvarBlueprint(id, payload) {
  return validarContrato(projetoComBlueprintSchema, await enviar(`/projects/${encodeURIComponent(id)}/blueprint`, payload));
}

export async function listarVersoesBlueprint(id) {
  return validarContrato(listaVersoesBlueprintSchema, await obter(`/projects/${encodeURIComponent(id)}/blueprint/versoes`));
}
