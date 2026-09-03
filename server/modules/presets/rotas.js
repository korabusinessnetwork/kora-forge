import { listaPresetsSchema, presetSchema } from '../../../shared/schemas/preset.js';

export default async function rotasPresets(app, { presets }) {
  app.get('/presets', { config: { schemaSaida: listaPresetsSchema } }, async () => presets.listar());
  app.get('/presets/:id', { config: { schemaSaida: presetSchema } }, async (request) => presets.obterOuFalhar(request.params.id));
}
