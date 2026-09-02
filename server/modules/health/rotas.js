import fs from 'node:fs';
import path from 'node:path';
import { healthSchema } from '../../../shared/schemas/health.js';

export default async function rotasHealth(app, { versao, home, settings }) {
  app.get('/health', { config: { schemaSaida: healthSchema } }, async () => {
    const atual = settings.obter();
    const cofre = fs.existsSync(path.join(home, 'vault.bin')) ? 'trancado' : 'ausente';
    return {
      versao,
      workspace: { configurado: atual.workspace !== null, caminho: atual.workspace },
      cofre,
      // O copiloto só pode ligar com chave no cofre, que chega na Fase 3. Até lá, sempre desligado.
      copiloto: { ligado: false },
    };
  });
}
