import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, afterEach } from 'vitest';
import { criarAppDeTeste, criarPastaTemporaria } from '../../testes/apoio.js';
import { criarServicoReforja } from './servico.js';
import rotasReforja from './rotas.js';
import {
  diagnosticoSchema,
  estadoSugestoesSchema,
  itemSchema,
  listaItensSchema,
  previaSpecSchema,
  resultadoSinalSchema,
  specGeradaSchema,
  sugestoesSchema,
} from '../../../shared/schemas/reforja.js';

let contexto;
const pastas = [];
afterEach(async () => {
  if (contexto) {
    await contexto.fechar();
    contexto = null;
  }
  while (pastas.length) fs.rmSync(pastas.pop(), { recursive: true, force: true });
});

// O app real registra a reforja com a raiz do repositório. Para rota que escreve, a mesma rota é
// montada de novo sob `/api/teste`, com um serviço apontado para uma pasta temporária, e passa pela
// mesma guarda, pelo mesmo schema de saída e pelo mesmo tratador de erro. O plugin só roda no
// primeiro `inject`, quando `contexto` já existe.
function novo({ modelos = null } = {}) {
  const raizForge = criarPastaTemporaria('kora-forge-reforja-');
  pastas.push(raizForge);
  fs.mkdirSync(path.join(raizForge, 'src'), { recursive: true });
  fs.writeFileSync(path.join(raizForge, 'src', 'a.js'), `// ${'TO'}${'DO'} x\n`);
  let servico = null;
  const plugin = async (instancia) => {
    servico = criarServicoReforja({ db: contexto.db, registrarEvento: instancia.servicos.registrarEvento, modelos, raizForge });
    instancia.register(rotasReforja, { reforja: servico, prefix: '/teste' });
  };
  contexto = criarAppDeTeste({ pluginsApi: [plugin] });
  return { ctx: contexto, raizForge, servico: () => servico };
}

const pedir = (ctx, method, url, payload) => ctx.app.inject({ method, url, headers: ctx.cabecalhos, payload });

describe('rotas da reforja no app real', () => {
  it('sem token é 401', async () => {
    const { ctx } = novo();
    const resposta = await ctx.app.inject({ method: 'GET', url: '/api/reforja/itens', headers: { host: '127.0.0.1:7337' } });
    expect(resposta.statusCode).toBe(401);
    expect(resposta.json().error.codigo).toBe('FORGE_UNAUTHORIZED');
  });

  it('GET /api/reforja/itens responde o contrato', async () => {
    const { ctx } = novo();
    const resposta = await pedir(ctx, 'GET', '/api/reforja/itens');
    expect(resposta.statusCode).toBe(200);
    expect(listaItensSchema.parse(resposta.json().data).itens).toEqual([]);
  });

  it('GET /api/reforja/diagnostico varre o repositório do Forge dentro do contrato', async () => {
    const { ctx } = novo();
    const resposta = await pedir(ctx, 'GET', '/api/reforja/diagnostico');
    expect(resposta.statusCode).toBe(200);
    expect(diagnosticoSchema.safeParse(resposta.json().data).success).toBe(true);
  });

  it('GET /api/reforja/sugestoes/estado responde mesmo sem o serviço de modelos pronto', async () => {
    const { ctx } = novo();
    const resposta = await pedir(ctx, 'GET', '/api/reforja/sugestoes/estado');
    expect(resposta.statusCode).toBe(200);
    expect(estadoSugestoesSchema.safeParse(resposta.json().data).success).toBe(true);
  });

  it('não existe rota para apagar item', async () => {
    const { ctx } = novo();
    const criado = await pedir(ctx, 'POST', '/api/reforja/itens', { titulo: 'x' });
    const resposta = await pedir(ctx, 'DELETE', `/api/reforja/itens/${criado.json().data.id}`);
    expect(resposta.statusCode).toBe(404);
  });
});

describe('ciclo completo pela API, com raiz temporária', () => {
  it('cria, transforma sinal sem duplicar, muda estado, prevê e grava spec', async () => {
    const { ctx, raizForge } = novo();

    const manual = await pedir(ctx, 'POST', '/api/teste/reforja/itens', { titulo: 'Melhorar a página', prioridade: 'alta' });
    expect(manual.statusCode).toBe(201);
    const item = itemSchema.parse(manual.json().data);

    const doSinal = await pedir(ctx, 'POST', '/api/teste/reforja/itens/do-sinal', { sinalId: 'marcadores-pendentes' });
    expect(doSinal.statusCode).toBe(201);
    expect(resultadoSinalSchema.parse(doSinal.json().data).criado).toBe(true);
    const repetido = await pedir(ctx, 'POST', '/api/teste/reforja/itens/do-sinal', { sinalId: 'marcadores-pendentes' });
    expect(repetido.statusCode).toBe(200);
    expect(repetido.json().data.criado).toBe(false);

    const invalida = await pedir(ctx, 'PATCH', `/api/teste/reforja/itens/${item.id}/estado`, { para: 'concluida' });
    expect(invalida.statusCode).toBe(409);
    expect(invalida.json().error).toMatchObject({ codigo: 'FORGE_CONFLICT', detalhe: { de: 'proposta', para: 'concluida' } });

    const previa = await pedir(ctx, 'POST', `/api/teste/reforja/itens/${item.id}/spec/previa`, {});
    expect(previa.statusCode).toBe(200);
    expect(previaSpecSchema.parse(previa.json().data)).toMatchObject({ caminho: 'specs/reforja-melhorar-a-pagina.md', existe: false });
    expect(fs.existsSync(path.join(raizForge, 'specs'))).toBe(false);

    const gravada = await pedir(ctx, 'POST', `/api/teste/reforja/itens/${item.id}/spec`, {});
    expect(gravada.statusCode).toBe(201);
    expect(specGeradaSchema.parse(gravada.json().data).item.estado).toBe('especificada');

    const conflito = await pedir(ctx, 'POST', `/api/teste/reforja/itens/${item.id}/spec`, {});
    expect(conflito.statusCode).toBe(409);
    expect(conflito.json().error.codigo).toBe('FORGE_CONFLICT');

    const sobrescrita = await pedir(ctx, 'POST', `/api/teste/reforja/itens/${item.id}/spec`, { sobrescrever: true });
    expect(sobrescrita.statusCode).toBe(201);
    expect(sobrescrita.json().data.sobrescrito).toBe(true);

    const avancou = await pedir(ctx, 'PATCH', `/api/teste/reforja/itens/${item.id}/estado`, { para: 'em_construcao' });
    expect(avancou.json().data.estado).toBe('em_construcao');

    const eventos = ctx.db.prepare("SELECT nome FROM events WHERE nome LIKE 'reforja.%' ORDER BY id").all().map((e) => e.nome);
    expect(eventos).toEqual(['reforja.item_criado', 'reforja.item_criado', 'reforja.spec_gerada', 'reforja.estado_mudou', 'reforja.spec_gerada', 'reforja.estado_mudou']);
  });

  it('entrada fora do contrato é FORGE_VALIDATION com o campo apontado', async () => {
    const { ctx } = novo();
    const semTitulo = await pedir(ctx, 'POST', '/api/teste/reforja/itens', { descricao: 'x' });
    expect(semTitulo.statusCode).toBe(400);
    expect(semTitulo.json().error.codigo).toBe('FORGE_VALIDATION');
    expect(semTitulo.json().error.detalhe.issues.map((i) => i.caminho)).toContain('titulo');

    const campoAMais = await pedir(ctx, 'POST', '/api/teste/reforja/itens/do-sinal', { sinalId: 'x', titulo: 'y' });
    expect(campoAMais.statusCode).toBe(400);

    const estadoRuim = await pedir(ctx, 'PATCH', '/api/teste/reforja/itens/qualquer/estado', { para: 'apagada' });
    expect(estadoRuim.statusCode).toBe(400);

    const sobrescreverRuim = await pedir(ctx, 'POST', '/api/teste/reforja/itens/qualquer/spec', { sobrescrever: 'sim' });
    expect(sobrescreverRuim.statusCode).toBe(400);
  });

  it('item e sinal inexistentes são FORGE_NOT_FOUND', async () => {
    const { ctx } = novo();
    expect((await pedir(ctx, 'PATCH', '/api/teste/reforja/itens/nao-existe/estado', { para: 'especificada' })).statusCode).toBe(404);
    expect((await pedir(ctx, 'POST', '/api/teste/reforja/itens/nao-existe/spec/previa', {})).statusCode).toBe(404);
    expect((await pedir(ctx, 'POST', '/api/teste/reforja/itens/do-sinal', { sinalId: 'arquivos-grandes' })).statusCode).toBe(404);
  });

  it('sugestões: indisponível diz o motivo e recusa; disponível devolve propostas no contrato', async () => {
    const semModelos = novo();
    const estado = await pedir(semModelos.ctx, 'GET', '/api/teste/reforja/sugestoes/estado');
    expect(estado.json().data).toEqual({ disponivel: false, motivo: 'sem_modelos' });
    const recusa = await pedir(semModelos.ctx, 'POST', '/api/teste/reforja/sugestoes', {});
    expect(recusa.statusCode).toBeGreaterThanOrEqual(400);
    expect(recusa.json().error.mensagem).toMatch(/Configurações/);
    await contexto.fechar();
    contexto = null;

    const modelos = {
      estado: async () => ({ ligado: true, conectado: true, modelos: ['m'] }),
      completar: async () => ({ texto: '[{"titulo":"Criar teste das rotas","descricao":"x"}]', modelo: 'm', duracaoMs: 1 }),
    };
    const comModelos = novo({ modelos });
    const resposta = await pedir(comModelos.ctx, 'POST', '/api/teste/reforja/sugestoes', {});
    expect(resposta.statusCode).toBe(200);
    expect(sugestoesSchema.parse(resposta.json().data).propostas).toEqual([{ titulo: 'Criar teste das rotas', descricao: 'x' }]);
  });
});
