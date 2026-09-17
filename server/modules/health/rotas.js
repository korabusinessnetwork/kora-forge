import fs from 'node:fs';
import path from 'node:path';
import { healthSchema } from '../../../shared/schemas/health.js';

export default async function rotasHealth(app, { versao, home, settings, cofre = null }) {
  app.get('/health', { config: { schemaSaida: healthSchema } }, async () => {
    const atual = settings.obter();
    const estadoCofre = cofre?.estado?.() ?? (fs.existsSync(path.join(home, 'vault.bin')) ? 'trancado' : 'ausente');
    return {
      versao,
      workspace: { configurado: atual.workspace !== null, caminho: atual.workspace },
      cofre: estadoCofre,
      // O copiloto só pode ligar na Fase 4 e exige uma conexão guardada no cofre.
      copiloto: { ligado: false },
    };
  });
}
