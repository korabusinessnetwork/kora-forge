import { listaPresetsSchema, presetSchema } from '@shared/schemas/preset.js';
import { obter, validarContrato } from './api.js';

export async function listarPresets() {
  return validarContrato(listaPresetsSchema, await obter('/presets'));
}

export async function obterPreset(id) {
  return validarContrato(presetSchema, await obter(`/presets/${encodeURIComponent(id)}`));
}
