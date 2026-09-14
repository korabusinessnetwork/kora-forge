import { painelSchema, recomendacoesSchema, chamadaSchema } from '@shared/schemas/eficiencia.js';
import { obter, criar, validarContrato } from './api.js';

export async function obterPainel({ intencao = 'todas', periodo = 'mes' } = {}) {
  const consulta = new URLSearchParams({ intencao, periodo });
  return validarContrato(painelSchema, await obter(`/eficiencia/painel?${consulta}`));
}

export async function obterRecomendacoes(intencao) {
  const consulta = new URLSearchParams({ intencao });
  return validarContrato(recomendacoesSchema, await obter(`/eficiencia/recomendacao?${consulta}`));
}

// Usado pelo copiloto (Fase 4) para registrar cada chamada. O custo vem calculado do servidor.
export async function registrarChamada(entrada) {
  return validarContrato(chamadaSchema, await criar('/eficiencia/chamadas', entrada));
}
