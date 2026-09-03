import { planoSchema } from '../../../shared/schemas/plano.js';

export default async function rotasGerador(app, { gerador, projetos, presets, settings }) {
  // Dry-run: monta o plano e não escreve nada. A escrita é do runner, com o plano aprovado.
  app.post('/projects/:id/plano', { config: { schemaSaida: planoSchema } }, async (request) => {
    const { projeto, blueprint } = projetos.obterOuFalhar(request.params.id);
    const preset = presets.obterOuFalhar(projeto.presetId);
    return gerador.gerarPlano({ projeto, preset, blueprint, workspace: settings.obter().workspace });
  });
}
