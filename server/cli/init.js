import path from 'node:path';
import { carregarConfig } from '../config.js';
import { prepararHome } from '../boot.js';
import { abrirBanco } from '../db/conexao.js';
import { migrar } from '../db/migrar.js';
import { carregarPresetsBuiltin, sincronizarPresets } from '../modules/presets/servico.js';
import { carregarRegrasBuiltin, sincronizarRegras } from '../modules/regras/servico.js';
import { carregarTemplatesBuiltin } from '../modules/gerador/servico.js';
import { RAIZ, encerrarComErro } from './apoio.js';

// npm run forge:init. Idempotente: pode rodar quantas vezes quiser.
try {
  const config = carregarConfig({ raiz: RAIZ });
  const criadas = prepararHome(config.home);
  const db = abrirBanco(path.join(config.home, 'forge.db'));
  const novas = migrar(db);
  const presets = sincronizarPresets(db, carregarPresetsBuiltin());
  const regras = sincronizarRegras(db, carregarRegrasBuiltin());
  const templates = carregarTemplatesBuiltin();
  db.close();

  console.log(`Home do Forge: ${config.home}`);
  console.log(criadas.length > 0 ? `Pastas criadas: ${criadas.join(', ')}` : 'Pastas: já existiam.');
  console.log(`Banco: ${path.join(config.home, 'forge.db')}`);
  console.log(novas.length > 0 ? `Migrations aplicadas: ${novas.join(', ')}` : 'Migrations: banco já estava em dia.');
  console.log(`Presets builtin: ${presets.inseridos.length} novos, ${presets.atualizados.length} atualizados, ${presets.inalterados.length} em dia.`);
  console.log(`Regras builtin: ${regras.inseridas.length} novas, ${regras.atualizadas.length} atualizadas, ${regras.inalteradas.length} em dia.`);
  console.log(`Templates builtin: ${templates.length} válidos (${templates.reduce((n, t) => n + t.arquivos.length, 0)} arquivos).`);
  console.log('Cofre de segredos: chega na Fase 3. Até lá o Forge roda sem ele.');
  console.log('Próximo passo: npm run forge');
} catch (erro) {
  encerrarComErro(erro);
}
