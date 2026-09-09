import { describe, it, expect } from 'vitest';
import { criarAppDeTeste } from '../../testes/apoio.js';
import { documentoDesignSchema, TOKENS_PADRAO } from '../../../shared/schemas/design.js';
import { apenasAlterados, documentoPadrao } from './servico.js';

async function comProjeto() {
  const ctx = criarAppDeTeste();
  const criado = await ctx.app.inject({
    method: 'POST', url: '/api/projects', headers: ctx.cabecalhos,
    payload: { nome: 'Alvo', presetId: 'criar-site' },
  });
  return { ctx, projeto: criado.json().data.projeto };
}

describe('sem documento', () => {
  it('devolve os defaults do catálogo, e não 404', async () => {
    const { ctx, projeto } = await comProjeto();
    const documento = ctx.app.servicos.design.obter(projeto.id);

    expect(documentoDesignSchema.safeParse(documento).success).toBe(true);
    expect(documento.versao).toBe(0);
    expect(documento.tokens).toEqual(TOKENS_PADRAO);
    expect(documento.paginas).toEqual([]);
    await ctx.fechar();
  });

  it('o gerador recebe os defaults sem precisar saber que não há documento', async () => {
    const { ctx, projeto } = await comProjeto();
    expect(ctx.app.servicos.design.tokensDe(projeto.id)).toEqual(TOKENS_PADRAO);
    await ctx.fechar();
  });
});

describe('salvar', () => {
  it('grava versão 1 e devolve o documento completo', async () => {
    const { ctx, projeto } = await comProjeto();
    const documento = ctx.app.servicos.design.salvar(projeto.id, { tokens: { COR_ACENTO: '#ff0000' } });

    expect(documento.versao).toBe(1);
    expect(documento.tokens.COR_ACENTO).toBe('#ff0000');
    expect(documento.tokens.COR_FUNDO).toBe(TOKENS_PADRAO.COR_FUNDO);
    await ctx.fechar();
  });

  it('cada mudança vira versão nova', async () => {
    const { ctx, projeto } = await comProjeto();
    const { design } = ctx.app.servicos;

    expect(design.salvar(projeto.id, { tokens: { COR_ACENTO: '#ff0000' } }).versao).toBe(1);
    expect(design.salvar(projeto.id, { tokens: { COR_ACENTO: '#00ff00' } }).versao).toBe(2);
    expect(design.obter(projeto.id).tokens.COR_ACENTO).toBe('#00ff00');
    await ctx.fechar();
  });

  it('salvar o mesmo conteúdo não versiona', async () => {
    const { ctx, projeto } = await comProjeto();
    const { design } = ctx.app.servicos;

    design.salvar(projeto.id, { tokens: { COR_ACENTO: '#ff0000' } });
    expect(design.salvar(projeto.id, { tokens: { COR_ACENTO: '#ff0000' } }).versao).toBe(1);
    expect(ctx.db.prepare('SELECT COUNT(*) AS n FROM design_documents').get().n).toBe(1);
    await ctx.fechar();
  });

  it('voltar tudo ao padrão versiona e devolve os defaults', async () => {
    const { ctx, projeto } = await comProjeto();
    const { design } = ctx.app.servicos;

    design.salvar(projeto.id, { tokens: { COR_ACENTO: '#ff0000' } });
    const voltou = design.salvar(projeto.id, { tokens: { ...TOKENS_PADRAO } });
    expect(voltou.versao).toBe(2);
    expect(voltou.tokens).toEqual(TOKENS_PADRAO);
    await ctx.fechar();
  });

  it('emite design.alterado', async () => {
    const { ctx, projeto } = await comProjeto();
    ctx.app.servicos.design.salvar(projeto.id, { tokens: { COR_ACENTO: '#ff0000' } });

    const eventos = ctx.db.prepare('SELECT nome FROM events WHERE project_id = ?').all(projeto.id).map((e) => e.nome);
    expect(eventos).toContain('design.alterado');
    await ctx.fechar();
  });

  it('projeto inexistente falha como as outras rotas de projeto', async () => {
    const ctx = criarAppDeTeste();
    let erro;
    try { ctx.app.servicos.design.obter('nao-existe'); } catch (e) { erro = e; }
    expect(erro?.codigo).toBe('FORGE_NOT_FOUND');
    await ctx.fechar();
  });
});

describe('apenasAlterados', () => {
  // Só o que diverge do default é gravado, para token que ganhar default melhor no futuro
  // acompanhar em vez de ficar congelado no documento.
  it('guarda só o que diverge do padrão', () => {
    expect(apenasAlterados({ ...TOKENS_PADRAO, COR_ACENTO: '#ff0000' })).toEqual({ COR_ACENTO: '#ff0000' });
    expect(apenasAlterados({ ...TOKENS_PADRAO })).toEqual({});
  });
});

describe('documentoPadrao', () => {
  it('versão zero diz que nada foi salvo ainda', () => {
    expect(documentoPadrao()).toEqual({ versao: 0, tokens: TOKENS_PADRAO, paginas: [], criadoEm: null });
  });
});
