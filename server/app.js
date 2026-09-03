import fs from 'node:fs';
import path from 'node:path';
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import { ErroForge } from './lib/erro.js';
import { envelopar, envelopeDeErro, ehEnvelope } from './lib/envelope.js';
import { formatarIssues } from './lib/validar.js';
import { criarGuarda } from './lib/guarda.js';
import { criarRegistradorDeEventos } from './modules/eventos/servico.js';
import { criarServicoSettings } from './modules/settings/servico.js';
import { criarServicoEficiencia } from './modules/eficiencia/servico.js';
import rotasHealth from './modules/health/rotas.js';
import rotasSettings from './modules/settings/rotas.js';
import rotasEficiencia from './modules/eficiencia/rotas.js';

// Nunca logar segredo (C6): o token e headers de autorização saem redigidos.
const CAMINHOS_REDIGIDOS = ['req.headers["x-forge-token"]', 'req.headers.authorization', 'req.headers.cookie'];

function opcoesDeLog(logger) {
  if (logger === true) return { level: 'info', redact: { paths: CAMINHOS_REDIGIDOS, censor: '***' } };
  return logger;
}

function mensagemSegura(erro) {
  if (erro instanceof SyntaxError || String(erro?.code ?? '').startsWith('FST_ERR_CTP')) {
    return 'Corpo da requisição não é JSON válido.';
  }
  return typeof erro?.message === 'string' && erro.message ? erro.message : 'Requisição inválida.';
}

// Todo erro vira ErroForge antes de virar resposta. Erro desconhecido é logado e vira
// FORGE_INTERNAL sem detalhe no corpo (nada de stack nem mensagem interna para o cliente).
export function traduzirErro(erro, log = null) {
  if (erro instanceof ErroForge) return erro;
  const status = Number(erro?.statusCode);
  if (status === 401) return new ErroForge('FORGE_UNAUTHORIZED');
  if (status === 404) return new ErroForge('FORGE_NOT_FOUND');
  if (Number.isInteger(status) && status >= 400 && status < 500) {
    return new ErroForge('FORGE_VALIDATION', 'Requisição inválida.', {
      issues: [{ caminho: '', mensagem: mensagemSegura(erro) }],
    });
  }
  log?.error({ err: erro }, 'erro inesperado');
  return new ErroForge('FORGE_INTERNAL');
}

export function construirApp({ db, tokenSessao, config, versao, logger = false, pastaDist = null, pluginsApi = [] }) {
  const app = Fastify({ logger: opcoesDeLog(logger) });

  app.decorateRequest('forgeInicio', 0);
  app.addHook('onRequest', async (request) => {
    request.forgeInicio = performance.now();
  });

  const registrarEvento = criarRegistradorDeEventos({ db, log: app.log });
  const settings = criarServicoSettings({
    db,
    padrao: {
      workspace: config.workspacePadrao ?? null,
      tema: 'escuro',
      copilotoTetoUsd: config.copilotoTetoUsdPadrao ?? 5,
    },
    registrarEvento,
  });
  const eficiencia = criarServicoEficiencia({ db, settings, registrarEvento });
  app.decorate('servicos', { settings, registrarEvento, eficiencia });

  app.register(async function api(instancia) {
    instancia.addHook('onRequest', criarGuarda({ tokenSessao, porta: config.porta, portaDev: config.portaDev }));

    // Zod na saída: toda rota declara schemaSaida. Saída fora do contrato nunca chega ao cliente.
    instancia.addHook('preSerialization', async (request, reply, payload) => {
      if (ehEnvelope(payload)) return payload;
      const schemaSaida = request.routeOptions?.config?.schemaSaida;
      if (!schemaSaida) {
        request.log.error({ rota: request.url }, 'rota sem schemaSaida');
        throw new ErroForge('FORGE_INTERNAL');
      }
      const resultado = schemaSaida.safeParse(payload);
      if (!resultado.success) {
        request.log.error({ rota: request.url, issues: formatarIssues(resultado.error) }, 'saída fora do contrato');
        throw new ErroForge('FORGE_INTERNAL');
      }
      return envelopar(request, resultado.data);
    });

    instancia.setErrorHandler((erro, request, reply) => {
      const tratado = traduzirErro(erro, request.log);
      reply.code(tratado.status);
      return envelopeDeErro(request, tratado);
    });

    instancia.setNotFoundHandler((request, reply) => {
      const erro = new ErroForge('FORGE_NOT_FOUND');
      reply.code(erro.status);
      return envelopeDeErro(request, erro);
    });

    instancia.register(rotasHealth, { versao, home: config.home, settings });
    instancia.register(rotasSettings, { settings });
    instancia.register(rotasEficiencia, { eficiencia });
    for (const plugin of pluginsApi) instancia.register(plugin);
  }, { prefix: '/api' });

  // Com dist/ presente, o Fastify serve o front na própria origem. Sem wildcard, para /api/*
  // nunca cair no estático. Rota do front que não é arquivo volta para o index.html (SPA).
  if (pastaDist && fs.existsSync(path.join(pastaDist, 'index.html'))) {
    app.register(fastifyStatic, { root: pastaDist, prefix: '/', wildcard: false });
    app.setNotFoundHandler((request, reply) => {
      const caminho = request.url.split('?')[0];
      const pareceArquivo = /\.[a-z0-9]+$/i.test(caminho);
      if (request.method === 'GET' && !caminho.startsWith('/api') && !pareceArquivo) return reply.sendFile('index.html');
      reply.code(404);
      return { statusCode: 404, mensagem: 'Não encontrado.' };
    });
  }

  return app;
}
