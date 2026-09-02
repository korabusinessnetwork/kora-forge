import { settingsSchema, settingsPatchSchema } from '../../../shared/schemas/settings.js';
import { validar } from '../../lib/validar.js';

export default async function rotasSettings(app, { settings }) {
  app.get('/settings', { config: { schemaSaida: settingsSchema } }, async () => settings.obter());

  app.patch('/settings', { config: { schemaSaida: settingsSchema } }, async (request) => {
    const patch = validar(settingsPatchSchema, request.body ?? {});
    return settings.atualizar(patch);
  });
}
