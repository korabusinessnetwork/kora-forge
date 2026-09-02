import { settingsSchema } from '@shared/schemas/settings.js';
import { obter, alterar, validarContrato } from './api.js';

export async function obterSettings() {
  return validarContrato(settingsSchema, await obter('/settings'));
}

export async function atualizarSettings(patch) {
  return validarContrato(settingsSchema, await alterar('/settings', patch));
}
