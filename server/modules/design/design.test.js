import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, afterEach } from 'vitest';
import { criarAppDeTeste, criarPastaTemporaria } from '../../testes/apoio.js';
import { listarMigrations, PASTA_MIGRATIONS } from '../../db/migrar.js';
import { designOuNadaSchema, listaVersoesDesignSchema, documentoDesignSchema, CATALOGO_VERSAO_ATUAL } from '../../../shared/schemas/design.js';

let contexto;
const temporarias = [];
afterEach(async () => {
  if (contexto) { await contexto.fechar(); contexto = null; }
  while (temporarias.length > 0) fs.rmSync(temporarias.pop(), { recursive: true, force: true });
});
function novo() { contexto = criarAppDeTeste(); return contexto; }
function workspace() {
  const p = criarPastaTemporaria('kora-forge-ws-');
  temporarias.push(p);
  return p;
}

const post = (ctx, url, payload) => ctx.app.inject({ method: 'POST', url, headers: ctx.cabecalhos, payload });
const get = (ctx, url) => ctx.app.inject({ method: 'GET', url, headers: ctx.cabecalhos });
const patch = (ctx, url, payload) => ctx.app.inject({ method: 'PATCH', url, headers: ctx.cabecalhos, payload });
const eventos = (ctx, projectId) => ctx.db.prepare('SELECT nome, payload_json FROM events WHERE project_id = ? ORDER BY id').all(projectId);

const criar = async (ctx, nome = 'Site da Kora') => {
  const r = await post(ctx, '/api/projects', { nome, presetId: 'criar-site' });
  expect(r.statusCode).toBe(201);
  return r.json().data.projeto;
};

const documento = (extra = {}) => ({
  catalogo: { versao: 1 },
  tokens: documentoDesignSchema.parse({}).tokens,
  paginas: [{
    id: 'inicio',
    nome: 'Início',
    rota: '/',
    // Desde o bloco 3 o tipo e as props precisam existir no catálogo. Antes disso qualquer slug
    // passava, e este fixture usava `props: { titulo }` numa seção, que hoje é recusa correta.
    regioes: [{
      id: 'topo',
      tipo: 'secao',
      props: { espacamento: 'normal' },
      filhos: [{ id: 'titulo-topo', tipo: 'titulo', props: { texto: 'Kora' }, filhos: [] }],
    }],
  }],
  ...extra,
});

// A versão do preset vem do projeto criado, nunca cravada aqui (mesma razão do gerador.test.js).
// Sem opção, a etapa Design fica assumida: é o padrão Kora, e o blueprint da Fase 1 que o hash
// congelado mede. `comDesenho` escolhe o desenho do Studio, que é a etapa concluída (bloco 5).
const blueprintSite = (projeto, { comDesenho = false } = {}) => ({
  preset: { id: projeto.presetId, versao: projeto.presetVersao },
  etapaAtual: 'materializar',
  etapasConcluidas: comDesenho
    ? ['identidade', 'escopo', 'design', 'seguranca', 'fundacao', 'materializar']
    : ['identidade', 'escopo', 'seguranca', 'fundacao', 'materializar'],
  assumidas: comDesenho ? [] : ['design'],
  respostas: {
    identidade: { nome: 'Site da Kora', essencia: 'A casa digital da Kora.', problema: 'Não temos onde apontar.', valor: 'Presença própria.' },
    escopo: { publico: 'clientes', personas: ['dono de restaurante'], ahaMoment: 'ver o site no ar', naoObjetivos: ['não é blog'] },
    design: {},
    seguranca: { dadoPessoal: false, dadoFinanceiro: false, compliance: [], tierGratuito: true, observacoes: '' },
    fundacao: { observacoes: '' },
    materializar: { confirmada: true },
  },
});

async function projetoPronto(ctx, ws, nome = 'Site da Kora', opcoes = {}) {
  await patch(ctx, '/api/settings', { workspace: ws });
  const projeto = await criar(ctx, nome);
  const salvo = await post(ctx, `/api/projects/${projeto.id}/blueprint`, blueprintSite(projeto, opcoes));
  expect(salvo.statusCode).toBe(200);
  return projeto;
}
const gerarPlano = async (ctx, id) => {
  const r = await post(ctx, `/api/projects/${id}/plano`);
  expect(r.statusCode).toBe(200);
  return r.json().data;
};

describe('GET /projects/:id/design', () => {
  it('projeto sem design responde design null: ausência é estado normal, não 404', async () => {
    const ctx = novo();
    const projeto = await criar(ctx);
    const r = await get(ctx, `/api/projects/${projeto.id}/design`);
    expect(r.statusCode).toBe(200);
    expect(r.json().data).toEqual({ design: null });
    expect(designOuNadaSchema.safeParse(r.json().data).success).toBe(true);
  });

  it('devolve o documento ativo, com tokens e páginas de volta inteiros', async () => {
    const ctx = novo();
    const projeto = await criar(ctx);
    await post(ctx, `/api/projects/${projeto.id}/design`, documento());
    const { design } = (await get(ctx, `/api/projects/${projeto.id}/design`)).json().data;
    expect(design).toMatchObject({ versao: 1, ativo: true });
    expect(design.payload).toEqual(documento());
    expect(design.criadoEm).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('projeto inexistente responde 404 nas três rotas', async () => {
    const ctx = novo();
    expect((await get(ctx, '/api/projects/nao-existe/design')).statusCode).toBe(404);
    expect((await get(ctx, '/api/projects/nao-existe/design/versoes')).statusCode).toBe(404);
    expect((await post(ctx, '/api/projects/nao-existe/design', documento())).statusCode).toBe(404);
  });
});

describe('POST /projects/:id/design', () => {
  it('cria versão n+1 e a anterior sai de ativa, com o histórico inteiro preservado', async () => {
    const ctx = novo();
    const projeto = await criar(ctx);
    const primeira = await post(ctx, `/api/projects/${projeto.id}/design`, documento());
    expect(primeira.statusCode).toBe(200);
    expect(primeira.json().data.design.versao).toBe(1);

    const segunda = await post(ctx, `/api/projects/${projeto.id}/design`, documento({ paginas: [] }));
    expect(segunda.json().data.design).toMatchObject({ versao: 2, ativo: true });
    expect(segunda.json().data.design.payload.paginas).toEqual([]);

    const versoes = (await get(ctx, `/api/projects/${projeto.id}/design/versoes`)).json().data;
    expect(listaVersoesDesignSchema.safeParse(versoes).success).toBe(true);
    expect(versoes.map((v) => [v.versao, v.ativo])).toEqual([[2, true], [1, false]]);
    expect(ctx.db.prepare('SELECT COUNT(*) AS n FROM design_documents WHERE project_id = ?').get(projeto.id).n).toBe(2);
  });

  it('salvar sem mudar nada não cria versão nova: o Studio salva sozinho o tempo todo', async () => {
    const ctx = novo();
    const projeto = await criar(ctx);
    await post(ctx, `/api/projects/${projeto.id}/design`, documento());
    const repetido = await post(ctx, `/api/projects/${projeto.id}/design`, documento());
    expect(repetido.json().data.design.versao).toBe(1);
    expect((await get(ctx, `/api/projects/${projeto.id}/design/versoes`)).json().data).toHaveLength(1);
  });

  it('emite design.salvo com a versão, e não emite quando nada mudou', async () => {
    const ctx = novo();
    const projeto = await criar(ctx);
    await post(ctx, `/api/projects/${projeto.id}/design`, documento());
    await post(ctx, `/api/projects/${projeto.id}/design`, documento());
    const salvos = eventos(ctx, projeto.id).filter((e) => e.nome === 'design.salvo');
    expect(salvos).toHaveLength(1);
    expect(JSON.parse(salvos[0].payload_json)).toEqual({ versao: 1, paginas: 1, catalogoVersao: 1 });
  });

  it('documento parcial é aceito e sai completo: o Studio salva enquanto a pessoa desenha', async () => {
    const ctx = novo();
    const projeto = await criar(ctx);
    const r = await post(ctx, `/api/projects/${projeto.id}/design`, {});
    expect(r.statusCode).toBe(200);
    expect(r.json().data.design.payload.tokens.cor.fundo).toBe('#ffffff');
    expect(r.json().data.design.payload.catalogo).toEqual({ versao: CATALOGO_VERSAO_ATUAL });
  });

  it('corpo fora do contrato responde 400 FORGE_VALIDATION com o caminho do campo', async () => {
    const ctx = novo();
    const projeto = await criar(ctx);
    const url = `/api/projects/${projeto.id}/design`;

    const coordenada = await post(ctx, url, documento({
      paginas: [{ id: 'p', nome: 'P', rota: '/', regioes: [{ id: 'r', tipo: 'secao', props: {}, filhos: [], x: 10 }] }],
    }));
    expect(coordenada.statusCode).toBe(400);
    expect(coordenada.json().error.codigo).toBe('FORGE_VALIDATION');
    expect(coordenada.json().error.detalhe.issues[0].caminho).toBe('paginas.0.regioes.0.x');

    const rotaRuim = await post(ctx, url, documento({ paginas: [{ id: 'p', nome: 'P', rota: 'sem-barra', regioes: [] }] }));
    expect(rotaRuim.statusCode).toBe(400);
    expect(rotaRuim.json().error.detalhe.issues[0].caminho).toBe('paginas.0.rota');

    const tokenVazio = await post(ctx, url, documento({ tokens: { cor: { fundo: '  ' } } }));
    expect(tokenVazio.statusCode).toBe(400);
    expect(tokenVazio.json().error.detalhe.issues[0].caminho).toBe('tokens.cor.fundo');
  });

  it('projeto arquivado recusa com 400 e mensagem que manda restaurar', async () => {
    const ctx = novo();
    const projeto = await criar(ctx);
    await patch(ctx, `/api/projects/${projeto.id}`, { arquivado: true });
    const r = await post(ctx, `/api/projects/${projeto.id}/design`, documento());
    expect(r.statusCode).toBe(400);
    expect(r.json().error.mensagem).toContain('Restaure');
  });

  it('documento de catálogo mais novo é recusado nomeando as duas versões', async () => {
    const ctx = novo();
    const projeto = await criar(ctx);
    const r = await post(ctx, `/api/projects/${projeto.id}/design`, documento({ catalogo: { versao: CATALOGO_VERSAO_ATUAL + 1 } }));
    expect(r.statusCode).toBe(400);
    expect(r.json().error.detalhe.issues[0].caminho).toBe('catalogo.versao');
    expect(r.json().error.mensagem).toContain(String(CATALOGO_VERSAO_ATUAL + 1));
  });

  it('as três rotas de design exigem a mesma guarda das outras', async () => {
    const ctx = novo();
    const projeto = await criar(ctx);
    const semToken = { host: '127.0.0.1:7337', origin: 'http://127.0.0.1:5173' };
    const outraOrigem = { ...ctx.cabecalhos, origin: 'http://malicioso.example' };
    const outroHost = { ...ctx.cabecalhos, host: 'evil.example' };
    const urls = [`/api/projects/${projeto.id}/design`, `/api/projects/${projeto.id}/design/versoes`];

    for (const url of urls) {
      expect((await ctx.app.inject({ method: 'GET', url, headers: semToken })).statusCode).toBe(401);
      expect((await ctx.app.inject({ method: 'GET', url, headers: outraOrigem })).statusCode).toBe(401);
      expect((await ctx.app.inject({ method: 'GET', url, headers: outroHost })).statusCode).toBe(401);
    }
    const url = `/api/projects/${projeto.id}/design`;
    expect((await ctx.app.inject({ method: 'POST', url, headers: semToken, payload: {} })).statusCode).toBe(401);
    expect((await ctx.app.inject({ method: 'POST', url, headers: outraOrigem, payload: {} })).statusCode).toBe(401);
  });
});

describe('a tabela que já existia', () => {
  it('o bloco não abriu migration: a mesma tabela do schema inicial, coluna por coluna', () => {
    // A tabela nasceu no schema inicial e nenhuma migration depois dela encosta em `design_documents`.
    const tocam = listarMigrations().filter((nome) => fs.readFileSync(path.join(PASTA_MIGRATIONS, nome), 'utf8').includes('design_documents'));
    expect(tocam).toEqual(['20260902_schema_inicial.sql']);
    const ctx = novo();
    expect(ctx.db.pragma('table_info(design_documents)').map((c) => c.name))
      .toEqual(['id', 'project_id', 'versao', 'tokens_json', 'paginas_json', 'criado_em']);
  });

  it('a versão ativa é a de maior número, e não uma coluna que possa dessincronizar', async () => {
    const ctx = novo();
    const projeto = await criar(ctx);
    await post(ctx, `/api/projects/${projeto.id}/design`, documento());
    await post(ctx, `/api/projects/${projeto.id}/design`, documento({ paginas: [] }));
    const guardado = ctx.db.prepare('SELECT versao, tokens_json, paginas_json FROM design_documents WHERE project_id = ? ORDER BY versao').all(projeto.id);
    expect(guardado.map((l) => l.versao)).toEqual([1, 2]);
    // `paginas_json` guarda a parte estrutural inteira, e não só o array de páginas: é o que
    // grava a versão do catálogo sem abrir migration.
    expect(Object.keys(JSON.parse(guardado[0].paginas_json)).sort()).toEqual(['catalogo', 'paginas']);
    expect(JSON.parse(guardado[0].tokens_json).cor.fundo).toBe('#ffffff');
  });
});

describe('o design entra no hash do plano', () => {
  it('projeto sem design gera o mesmo plano de sempre, e o hash não muda por causa deste bloco', async () => {
    const ctx = novo();
    const projeto = await projetoPronto(ctx, workspace());
    const primeiro = await gerarPlano(ctx, projeto.id);
    const segundo = await gerarPlano(ctx, projeto.id);
    expect(primeiro.hashBlueprint).toBe(segundo.hashBlueprint);
    // Hash congelado do plano do preset `criar-site` sem documento de design, medido no commit
    // anterior a este bloco e conferido de novo depois dele. É o guarda de não-regressão da Fase 1:
    // projeto que nunca abriu o Studio tem que gerar exatamente o mesmo plano de sempre.
    // Este valor só muda junto com blueprint, preset ou template, e mudá-lo é decisão consciente.
    expect(primeiro.hashBlueprint).toBe('sha256:175a2bf0d3df9f7513ac3f69cd13c2beedad33fca9073cb2b4c70a9c64edb7db');
  });

  it('com o desenho do Studio escolhido, salvar design muda o hash, e o mesmo design gera sempre o mesmo hash', async () => {
    const ctx = novo();
    const projeto = await projetoPronto(ctx, workspace(), undefined, { comDesenho: true });
    const semDesign = await gerarPlano(ctx, projeto.id);

    await post(ctx, `/api/projects/${projeto.id}/design`, documento());
    const comDesign = await gerarPlano(ctx, projeto.id);
    expect(comDesign.hashBlueprint).not.toBe(semDesign.hashBlueprint);
    expect((await gerarPlano(ctx, projeto.id)).hashBlueprint).toBe(comDesign.hashBlueprint);

    await post(ctx, `/api/projects/${projeto.id}/design`, documento({ tokens: { cor: { acento: '#ff0055' } } }));
    const redesenhado = await gerarPlano(ctx, projeto.id);
    expect(redesenhado.hashBlueprint).not.toBe(comDesign.hashBlueprint);
  });

  it('o design vira arquivo no plano: tokens do Studio, uma página por rota e App com as rotas (bloco 6)', async () => {
    const ctx = novo();
    const projeto = await projetoPronto(ctx, workspace(), undefined, { comDesenho: true });
    const antes = await gerarPlano(ctx, projeto.id);
    await post(ctx, `/api/projects/${projeto.id}/design`, documento({ tokens: { cor: { acento: '#ff0055' } } }));
    const depois = await gerarPlano(ctx, projeto.id);
    const porCaminho = new Map(depois.arquivos.map((a) => [a.caminho, a]));

    expect(porCaminho.get('src/styles/tokens.css').conteudo).toContain('--cor-acento: #ff0055;');
    expect(porCaminho.get('src/paginas/PaginaInicio.jsx').template).toBe('studio-paginas');
    expect(porCaminho.get('src/paginas/PaginaInicio.jsx').conteudo).toContain('Kora');
    expect(porCaminho.get('src/App.jsx').conteudo).toContain('<Route path="/" element={<PaginaInicio />} />');
    expect(porCaminho.has('src/App.module.css')).toBe(false);
    expect(antes.arquivos.some((a) => a.caminho === 'src/App.module.css')).toBe(true);

    // Mesmo documento, mesmo plano.
    const deNovo = await gerarPlano(ctx, projeto.id);
    expect(deNovo.arquivos).toEqual(depois.arquivos);
    expect(deNovo.hashBlueprint).toBe(depois.hashBlueprint);
  });

  it('aprovar o plano e depois salvar design faz materializar responder FORGE_PLAN_STALE sem escrever nada', async () => {
    const ctx = novo();
    const ws = workspace();
    const projeto = await projetoPronto(ctx, ws, undefined, { comDesenho: true });
    const plano = await gerarPlano(ctx, projeto.id);

    await post(ctx, `/api/projects/${projeto.id}/design`, documento());
    const r = await post(ctx, `/api/projects/${projeto.id}/materializar`, { hashBlueprint: plano.hashBlueprint });
    expect(r.statusCode).toBe(409);
    expect(r.json().error.codigo).toBe('FORGE_PLAN_STALE');
    expect(fs.existsSync(plano.raiz)).toBe(false);
  });
});

// Bloco 5. Assumir o padrão Kora na etapa Design tem que dar o plano de quem nunca abriu o Studio,
// mesmo com um desenho salvo antes da decisão. É o critério "pular a etapa Design continua
// funcionando" da Fase 2, medido contra o mesmo hash congelado da Fase 1.
const HASH_CONGELADO_SEM_DESIGN = 'sha256:175a2bf0d3df9f7513ac3f69cd13c2beedad33fca9073cb2b4c70a9c64edb7db';

describe('padrão Kora escolhido na etapa Design', () => {
  it('com documento salvo, gera o hash congelado e os mesmos arquivos de um projeto sem Studio', async () => {
    const ctx = novo();
    const ws = workspace();
    const semStudio = await projetoPronto(ctx, ws, 'Site da Kora');
    const referencia = await gerarPlano(ctx, semStudio.id);
    await contexto.fechar();

    const outro = novo();
    const comDesenho = await projetoPronto(outro, workspace(), 'Site da Kora');
    const salvo = await post(outro, `/api/projects/${comDesenho.id}/design`, documento({ tokens: { cor: { acento: '#ff0055' } } }));
    expect(salvo.statusCode).toBe(200);
    const plano = await gerarPlano(outro, comDesenho.id);

    expect(plano.hashBlueprint).toBe(HASH_CONGELADO_SEM_DESIGN);
    expect(plano.arquivos.map((a) => [a.caminho, a.conteudo])).toEqual(referencia.arquivos.map((a) => [a.caminho, a.conteudo]));
  });

  it('trocar o documento salvo não invalida o plano aprovado', async () => {
    const ctx = novo();
    const projeto = await projetoPronto(ctx, workspace());
    await post(ctx, `/api/projects/${projeto.id}/design`, documento());
    const antes = await gerarPlano(ctx, projeto.id);
    await post(ctx, `/api/projects/${projeto.id}/design`, documento({ tokens: { cor: { acento: '#00aa55' } } }));
    expect((await gerarPlano(ctx, projeto.id)).hashBlueprint).toBe(antes.hashBlueprint);
  });

  it('voltar a escolher o desenho do Studio traz o documento de volta, com o mesmo hash de antes', async () => {
    const ctx = novo();
    const projeto = await projetoPronto(ctx, workspace(), undefined, { comDesenho: true });
    await post(ctx, `/api/projects/${projeto.id}/design`, documento());
    const comDesenho = await gerarPlano(ctx, projeto.id);

    await post(ctx, `/api/projects/${projeto.id}/blueprint`, blueprintSite(projeto));
    expect((await gerarPlano(ctx, projeto.id)).hashBlueprint).toBe(HASH_CONGELADO_SEM_DESIGN);

    await post(ctx, `/api/projects/${projeto.id}/blueprint`, blueprintSite(projeto, { comDesenho: true }));
    expect((await gerarPlano(ctx, projeto.id)).hashBlueprint).toBe(comDesenho.hashBlueprint);
  });
});

// ---------------------------------------------------------------------------
// Bloco 3: o documento passa a ser conferido contra o catálogo.
// ---------------------------------------------------------------------------

const salvarDesign = (ctx, id, payload) => post(ctx, `/api/projects/${id}/design`, payload);
const paginaCom = (regioes) => ({ id: 'inicio', nome: 'Início', rota: '/', regioes });
const noDe = (tipo, extra = {}) => ({ id: `n-${tipo}`, tipo, props: {}, filhos: [], ...extra });

describe('o desenho é conferido contra o catálogo antes de gravar', () => {
  it('desenho válido grava, com região, componente aninhado e props do catálogo', async () => {
    const ctx = novo();
    const projeto = await criar(ctx);
    const r = await salvarDesign(ctx, projeto.id, documento({
      paginas: [paginaCom([noDe('secao', {
        props: { espacamento: 'amplo' },
        filhos: [
          noDe('titulo', { props: { texto: 'Bem-vindo', nivel: '1' } }),
          noDe('cartao', { filhos: [noDe('texto', { props: { conteudo: 'Um parágrafo.' } })] }),
        ],
      })])],
    }));
    expect(r.statusCode).toBe(200);
    expect(r.json().data.design.payload.paginas[0].regioes[0].filhos).toHaveLength(2);
  });

  it('tipo que não existe no catálogo é recusado, com o caminho do nó', async () => {
    const ctx = novo();
    const projeto = await criar(ctx);
    const r = await salvarDesign(ctx, projeto.id, documento({ paginas: [paginaCom([noDe('carrossel')])] }));
    expect(r.statusCode).toBe(400);
    expect(r.json().error.codigo).toBe('FORGE_VALIDATION');
    expect(r.json().error.detalhe.issues[0]).toMatchObject({ caminho: 'paginas.0.regioes.0.tipo' });
    expect(r.json().error.detalhe.issues[0].mensagem).toContain('carrossel');
  });

  it('componente no topo da página e região no meio da árvore são recusados pelo papel', async () => {
    const ctx = novo();
    const projeto = await criar(ctx);
    const topo = await salvarDesign(ctx, projeto.id, documento({ paginas: [paginaCom([noDe('titulo', { props: { texto: 'x' } })])] }));
    expect(topo.statusCode).toBe(400);
    expect(topo.json().error.detalhe.issues[0].mensagem).toContain('só entra dentro de uma região');

    const dentro = await salvarDesign(ctx, projeto.id, documento({ paginas: [paginaCom([noDe('secao', { props: {}, filhos: [noDe('rodape')] })])] }));
    expect(dentro.statusCode).toBe(400);
    expect(dentro.json().error.detalhe.issues[0].mensagem).toContain('só entra no topo da página');
  });

  it('filho que o pai não aceita é recusado, dizendo o que o pai aceita', async () => {
    const ctx = novo();
    const projeto = await criar(ctx);
    const r = await salvarDesign(ctx, projeto.id, documento({
      paginas: [paginaCom([noDe('rodape', { filhos: [noDe('campo', { props: { rotulo: 'Nome', microtexto: 'seu nome' } })] })])],
    }));
    expect(r.statusCode).toBe(400);
    expect(r.json().error.detalhe.issues[0].mensagem).toContain('não aceita');
  });

  it('prop não declarada, valor fora do tipo e obrigatória ausente são recusados, cada um com seu caminho', async () => {
    const ctx = novo();
    const projeto = await criar(ctx);
    const r = await salvarDesign(ctx, projeto.id, documento({
      paginas: [paginaCom([noDe('secao', {
        props: { cor: 'azul' },
        filhos: [noDe('titulo'), noDe('botao', { props: { texto: 'ok', variante: 'neon' } })],
      })])],
    }));
    expect(r.statusCode).toBe(400);
    const caminhos = r.json().error.detalhe.issues.map((issue) => issue.caminho);
    expect(caminhos).toContain('paginas.0.regioes.0.props.cor');
    expect(caminhos).toContain('paginas.0.regioes.0.filhos.0.props.texto');
    expect(caminhos).toContain('paginas.0.regioes.0.filhos.1.props.variante');
  });

  it('prop opcional ausente não é erro: vale o padrão do catálogo', async () => {
    const ctx = novo();
    const projeto = await criar(ctx);
    const r = await salvarDesign(ctx, projeto.id, documento({
      paginas: [paginaCom([noDe('secao', { filhos: [noDe('titulo', { props: { texto: 'Sem nível' } })] })])],
    }));
    expect(r.statusCode).toBe(200);
  });

  it('documento sem página nenhuma continua válido: é o que o painel de tokens salva', async () => {
    const ctx = novo();
    const projeto = await criar(ctx);
    const r = await salvarDesign(ctx, projeto.id, documento({ paginas: [] }));
    expect(r.statusCode).toBe(200);
    expect(r.json().data.design.payload.paginas).toEqual([]);
  });
});

describe('item que saiu do catálogo vira pendência, nunca documento corrompido', () => {
  // Grava direto na tabela para simular o que só acontece com o tempo: o documento foi salvo por
  // um Forge que tinha o item, e este Forge não tem mais. Pela rota isso seria recusado, que é
  // justamente a assimetria da decisão 4 do ADR-009: recusa na escrita, pendência na leitura.
  const gravarDireto = (ctx, projectId, payload) => ctx.db.prepare(`
    INSERT INTO design_documents (id, project_id, versao, tokens_json, paginas_json, criado_em)
    VALUES (?, ?, 1, ?, ?, ?)
  `).run('doc-antigo', projectId, JSON.stringify(payload.tokens), JSON.stringify({ catalogo: payload.catalogo, paginas: payload.paginas }), new Date().toISOString());

  it('o desenho volta inteiro, com o item ausente nomeado ao lado', async () => {
    const ctx = novo();
    const projeto = await criar(ctx);
    gravarDireto(ctx, projeto.id, documento({
      paginas: [paginaCom([noDe('secao', { filhos: [noDe('carrossel', { id: 'antigo-1' })] })])],
    }));

    const { design } = (await get(ctx, `/api/projects/${projeto.id}/design`)).json().data;
    expect(design.payload.paginas[0].regioes[0].filhos[0].tipo).toBe('carrossel');
    expect(design.pendencias).toEqual([{
      no: 'antigo-1', tipo: 'carrossel', pagina: 'inicio',
      catalogoDoDocumento: 1, catalogoDoForge: CATALOGO_VERSAO_ATUAL,
    }]);
  });

  it('ler não reescreve nem apaga nada: o documento continua igual na tabela', async () => {
    const ctx = novo();
    const projeto = await criar(ctx);
    gravarDireto(ctx, projeto.id, documento({ paginas: [paginaCom([noDe('secao', { filhos: [noDe('carrossel', { id: 'antigo-1' })] })])] }));
    const antes = ctx.db.prepare('SELECT paginas_json FROM design_documents WHERE project_id = ?').get(projeto.id).paginas_json;

    await get(ctx, `/api/projects/${projeto.id}/design`);
    const depois = ctx.db.prepare('SELECT paginas_json, COUNT(*) AS total FROM design_documents WHERE project_id = ?').get(projeto.id);
    expect(depois.paginas_json).toBe(antes);
    expect(depois.total).toBe(1);
  });

  it('sem pendência a lista vem vazia, nunca null nem ausente', async () => {
    const ctx = novo();
    const projeto = await criar(ctx);
    await salvarDesign(ctx, projeto.id, documento());
    const { design } = (await get(ctx, `/api/projects/${projeto.id}/design`)).json().data;
    expect(design.pendencias).toEqual([]);
    expect(designOuNadaSchema.safeParse({ design }).success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Bloco 6: o design efetivo vira arquivo no plano.
// ---------------------------------------------------------------------------

const TOKENS_PADRAO_CSS = fs.readFileSync(new URL('../gerador/fixtures/tokens-padrao.css', import.meta.url), 'utf8');
const conteudoDe = (plano, caminho) => plano.arquivos.find((a) => a.caminho === caminho)?.conteudo;
const normalizarEol = (texto) => texto.replace(/\r\n/g, '\n');
// A cópia congelada é o template de antes, então ainda tem as duas chaves que não são token.
const tokensPadraoDe = (nome) => normalizarEol(TOKENS_PADRAO_CSS).replace('{{PROJETO}}', nome).replace('{{WHITE_LABEL}}', 'Não');

describe('exportação do design para o plano (bloco 6)', () => {
  it('sem documento, o hash é o congelado e o tokens.css é o de antes, byte a byte', async () => {
    const ctx = novo();
    const projeto = await projetoPronto(ctx, workspace());
    const plano = await gerarPlano(ctx, projeto.id);
    expect(plano.hashBlueprint).toBe(HASH_CONGELADO_SEM_DESIGN);
    expect(normalizarEol(conteudoDe(plano, 'src/styles/tokens.css'))).toBe(tokensPadraoDe('Site da Kora'));
  });

  it('desenho do Studio só com tokens padrão e sem página: o disco é o mesmo, o hash não', async () => {
    const ctx = novo();
    // Mesmo blueprint, com o desenho do Studio escolhido e sem documento: designEfetivo é null.
    const semStudio = await projetoPronto(ctx, workspace(), 'Site da Kora', { comDesenho: true });
    const referencia = await gerarPlano(ctx, semStudio.id);
    await contexto.fechar();

    const outro = novo();
    const projeto = await projetoPronto(outro, workspace(), 'Site da Kora', { comDesenho: true });
    await post(outro, `/api/projects/${projeto.id}/design`, documento({ paginas: [] }));
    const plano = await gerarPlano(outro, projeto.id);
    expect(plano.hashBlueprint).not.toBe(referencia.hashBlueprint);
    expect(plano.arquivos.map((a) => [a.caminho, a.conteudo])).toEqual(referencia.arquivos.map((a) => [a.caminho, a.conteudo]));
  });

  it('um token trocado muda só a linha dele, e o escuro sai só no bloco escuro', async () => {
    const ctx = novo();
    const projeto = await projetoPronto(ctx, workspace(), undefined, { comDesenho: true });
    await post(ctx, `/api/projects/${projeto.id}/design`, documento({ paginas: [], tokens: { cor: { acento: '#ff0055' }, corEscuro: { fundo: '#000001' } } }));
    const css = normalizarEol(conteudoDe(await gerarPlano(ctx, projeto.id), 'src/styles/tokens.css')).split('\n');
    const padrao = tokensPadraoDe('Site da Kora').split('\n');
    expect(css).toHaveLength(padrao.length);
    const diferentes = css.map((linha, i) => [linha, padrao[i]]).filter(([a, b]) => a !== b).map(([a]) => a.trim());
    expect(diferentes).toEqual(['--cor-acento: #ff0055;', '--cor-fundo: #000001;']);
    const inicioEscuro = css.findIndex((linha) => linha.includes('prefers-color-scheme: dark'));
    expect(css.findIndex((linha) => linha.includes('#000001'))).toBeGreaterThan(inicioEscuro);
  });

  it.each([';', '{', '}', '<', '>', '\\', '\n', '/*', '*/'])('token com %j é recusado na escrita com o caminho do token', async (perigo) => {
    const ctx = novo();
    const projeto = await criar(ctx);
    const r = await post(ctx, `/api/projects/${projeto.id}/design`, documento({ tokens: { cor: { acento: `red${perigo}x` } } }));
    expect(r.statusCode).toBe(400);
    expect(r.json().error.detalhe.issues.map((issue) => issue.caminho)).toContain('tokens.cor.acento');
  });

  it('com página, entra studio-paginas no plano e sai o App.module.css; sem página, fica', async () => {
    const ctx = novo();
    const projeto = await projetoPronto(ctx, workspace(), undefined, { comDesenho: true });
    await post(ctx, `/api/projects/${projeto.id}/design`, documento({
      paginas: [
        { id: 'inicio', nome: 'Início', rota: '/', regioes: [] },
        { id: 'sobre-nos', nome: 'Sobre nós', rota: '/sobre-nos', regioes: [] },
      ],
    }));
    const plano = await gerarPlano(ctx, projeto.id);
    const caminhos = plano.arquivos.map((a) => a.caminho);
    expect(caminhos).toEqual(expect.arrayContaining(['src/paginas/PaginaInicio.jsx', 'src/paginas/PaginaSobreNos.jsx', 'src/paginas/pagina.module.css', 'src/App.jsx']));
    expect(caminhos).not.toContain('src/App.module.css');
    expect([...caminhos].sort()).toEqual(caminhos);
    const app = conteudoDe(plano, 'src/App.jsx');
    expect(app.indexOf('PaginaInicio />')).toBeLessThan(app.indexOf('PaginaSobreNos />'));
  });

  it('trocar a ordem das páginas muda App e hash; trocar uma prop muda só o arquivo da página', async () => {
    const ctx = novo();
    const projeto = await projetoPronto(ctx, workspace(), undefined, { comDesenho: true });
    const paginaA = (texto) => ({ id: 'inicio', nome: 'Início', rota: '/', regioes: [{ id: 'topo', tipo: 'secao', props: {}, filhos: [{ id: 't', tipo: 'titulo', props: { texto }, filhos: [] }] }] });
    const paginaB = { id: 'contato', nome: 'Contato', rota: '/contato', regioes: [] };

    await post(ctx, `/api/projects/${projeto.id}/design`, documento({ paginas: [paginaA('Um'), paginaB] }));
    const base = await gerarPlano(ctx, projeto.id);
    await post(ctx, `/api/projects/${projeto.id}/design`, documento({ paginas: [paginaB, paginaA('Um')] }));
    const invertida = await gerarPlano(ctx, projeto.id);
    await post(ctx, `/api/projects/${projeto.id}/design`, documento({ paginas: [paginaA('Dois'), paginaB] }));
    const outraProp = await gerarPlano(ctx, projeto.id);

    const diferencas = (a, b) => a.arquivos.filter((arquivo, i) => arquivo.conteudo !== b.arquivos[i].conteudo).map((arquivo) => arquivo.caminho);
    expect(invertida.hashBlueprint).not.toBe(base.hashBlueprint);
    expect(diferencas(invertida, base)).toEqual(['src/App.jsx']);
    expect(outraProp.hashBlueprint).not.toBe(base.hashBlueprint);
    expect(diferencas(outraProp, base)).toEqual(['src/paginas/PaginaInicio.jsx']);
  });

  it('item que saiu do catálogo vira pendência de catálogo no plano, e o resto da página sai', async () => {
    const ctx = novo();
    const projeto = await projetoPronto(ctx, workspace(), undefined, { comDesenho: true });
    ctx.db.prepare(`
      INSERT INTO design_documents (id, project_id, versao, tokens_json, paginas_json, criado_em)
      VALUES (?, ?, 1, ?, ?, ?)
    `).run('doc-antigo', projeto.id, JSON.stringify(documento().tokens), JSON.stringify({
      catalogo: { versao: 1 },
      paginas: [paginaCom([noDe('secao', { filhos: [noDe('carrossel', { id: 'antigo-1' }), noDe('texto', { props: { conteudo: 'Fica' } })] })])],
    }), new Date().toISOString());

    const plano = await gerarPlano(ctx, projeto.id);
    expect(plano.pendencias.filter((p) => p.tipo !== 'template')).toEqual([expect.objectContaining({ tipo: 'catalogo', item: 'inicio/antigo-1' })]);
    expect(conteudoDe(plano, 'src/paginas/PaginaInicio.jsx')).toContain('Fica');
  });
});
