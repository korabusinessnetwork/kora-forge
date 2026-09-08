import { ideiaSchema, listaIdeiasSchema } from '@shared/schemas/ideia.js';
import { obter, enviar, alterar, validarContrato } from './api.js';

export async function listarIdeias() {
  return validarContrato(listaIdeiasSchema, await obter('/ideias')).ideias;
}

export async function registrarIdeia({ titulo, proximoPasso, origem }) {
  const corpo = { titulo };
  // Campo opcional só vai quando tem conteúdo: o schema é estrito e string vazia não é ausência.
  if (proximoPasso?.trim()) corpo.proximoPasso = proximoPasso.trim();
  if (origem?.trim()) corpo.origem = origem.trim();
  return validarContrato(ideiaSchema, await enviar('/ideias', corpo));
}

export async function descartarIdeia(id) {
  return validarContrato(ideiaSchema, await alterar(`/ideias/${encodeURIComponent(id)}`, { estado: 'descartada' }));
}
