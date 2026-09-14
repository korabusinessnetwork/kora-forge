import {
  diagnosticoSchema,
  estadoSugestoesSchema,
  itemSchema,
  listaItensSchema,
  previaSpecSchema,
  resultadoSinalSchema,
  specGeradaSchema,
  sugestoesSchema,
} from '@shared/schemas/reforja.js';
import { obter, enviar, alterar, validarContrato } from './api.js';

// Auto-Reforja (ADR-014). Toda resposta passa pelo contrato antes de chegar na tela.
const doItem = (id) => `/reforja/itens/${encodeURIComponent(id)}`;

export async function obterDiagnostico() {
  return validarContrato(diagnosticoSchema, await obter('/reforja/diagnostico'));
}

export async function listarMelhorias() {
  return validarContrato(listaItensSchema, await obter('/reforja/itens'));
}

export async function criarMelhoria({ titulo, descricao, prioridade, origem }) {
  const corpo = { titulo: String(titulo ?? '').trim() };
  // Opcional só vai com conteúdo: o schema do servidor é estrito e string vazia não é ausência.
  if (descricao?.trim()) corpo.descricao = descricao.trim();
  if (prioridade) corpo.prioridade = prioridade;
  if (origem) corpo.origem = origem;
  return validarContrato(itemSchema, await enviar('/reforja/itens', corpo));
}

export async function transformarSinalEmMelhoria(sinalId) {
  return validarContrato(resultadoSinalSchema, await enviar('/reforja/itens/do-sinal', { sinalId }));
}

export async function mudarEstadoDaMelhoria(id, para) {
  return validarContrato(itemSchema, await alterar(`${doItem(id)}/estado`, { para }));
}

export async function preverSpec(id) {
  return validarContrato(previaSpecSchema, await enviar(`${doItem(id)}/spec/previa`, {}));
}

export async function gravarSpec(id, { sobrescrever = false } = {}) {
  return validarContrato(specGeradaSchema, await enviar(`${doItem(id)}/spec`, sobrescrever ? { sobrescrever: true } : {}));
}

export async function obterEstadoSugestoes() {
  return validarContrato(estadoSugestoesSchema, await obter('/reforja/sugestoes/estado'));
}

export async function pedirSugestoes() {
  return validarContrato(sugestoesSchema, await enviar('/reforja/sugestoes', {}));
}
