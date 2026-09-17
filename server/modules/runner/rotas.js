import { pedidoMaterializacaoSchema, decisaoSchema, materializacaoSchema, materializacaoOuNadaSchema } from '../../../shared/schemas/materializacao.js';
import { validar } from '../../lib/validar.js';
import { ErroForge } from '../../lib/erro.js';
import { z } from 'zod';

const paradaSchema = z.strictObject({ runId: z.string().min(1), estado: z.string().min(1) });

export default async function rotasRunner(app, { runner, gerador, projetos, presets, design, settings, transmissor }) {
  app.post('/projects/:id/materializar', { config: { schemaSaida: materializacaoSchema } }, async (request) => {
    const { hashBlueprint } = validar(pedidoMaterializacaoSchema, request.body ?? {});
    const { projeto, blueprint } = projetos.obterOuFalhar(request.params.id);
    const preset = presets.obterOuFalhar(projeto.presetId);
    // O plano é regenerado aqui. O hash prova que é o mesmo que o usuário aprovou (ADR-002).
    const plano = gerador.gerarPlano({ projeto, preset, blueprint, design: design.obter(projeto.id), workspace: settings.obter().workspace });
    if (plano.hashBlueprint !== hashBlueprint) {
      throw new ErroForge('FORGE_PLAN_STALE', 'O blueprint ou o design mudou depois do plano. Gere o plano de novo e confira antes de aprovar.');
    }
    return runner.materializar({ projeto, preset, plano });
  });

  app.get('/projects/:id/materializar', { config: { schemaSaida: materializacaoOuNadaSchema } }, async (request) => {
    projetos.obterOuFalhar(request.params.id);
    return { materializacao: runner.obter(request.params.id) };
  });

  app.post('/projects/:id/materializar/decidir', { config: { schemaSaida: materializacaoSchema } }, async (request) => {
    const { acao } = validar(decisaoSchema, request.body ?? {});
    projetos.obterOuFalhar(request.params.id);
    return runner.decidir(request.params.id, acao);
  });

  app.post('/runs/:runId/parar', { config: { schemaSaida: paradaSchema } }, async (request) => runner.pararRun(request.params.runId));

  // Log ao vivo. A conexão passa pela mesma guarda das rotas: o hook de onRequest do escopo /api
  // roda antes do upgrade, então token, Host e Origin já foram checados aqui.
  app.get('/ws/runs/:runId', { websocket: true }, (socket, request) => {
    const enviar = (evento) => socket.send(JSON.stringify(evento));
    const cancelar = transmissor.assinar(request.params.runId, enviar);
    socket.on('close', cancelar);
    socket.on('error', cancelar);
  });
}
