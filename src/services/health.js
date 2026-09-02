import { healthSchema } from '@shared/schemas/health.js';
import { obter, validarContrato } from './api.js';

export async function obterHealth() {
  return validarContrato(healthSchema, await obter('/health'));
}
