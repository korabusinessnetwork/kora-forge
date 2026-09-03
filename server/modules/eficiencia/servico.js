import { randomUUID } from 'node:crypto';
import { CATALOGO, ErroEficiencia, calcularCustoUsd, resumirPainel } from '../../../shared/eficiencia/motor.js';
import { ErroForge } from '../../lib/erro.js';

const COLUNAS = `
  id, project_id, intencao, etapa, modelo, estado,
  tokens_entrada, tokens_saida, tokens_cache_leitura, tokens_cache_escrita,
  lote, duracao_ms, custo_estimado, criado_em
`;

// O motor lança ErroEficiencia (sem dependência do servidor). Aqui vira ErroForge, que o
// handler global sabe transformar em envelope com código estável.
export function traduzirErroEficiencia(erro) {
  if (erro instanceof ErroEficiencia) return new ErroForge(erro.codigo, erro.message, erro.detalhe);
  return erro;
}

// Início do período em ISO UTC. `mes` é o mês civil em UTC; `30d` são 30 × 24 h; `tudo` não filtra.
export function inicioDoPeriodo(periodo, agora = new Date()) {
  if (periodo === 'mes') return new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), 1)).toISOString();
  if (periodo === '30d') return new Date(agora.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  return null;
}

export function paraChamada(linha) {
  return {
    id: linha.id,
    projectId: linha.project_id ?? null,
    intencao: linha.intencao ?? null,
    etapa: linha.etapa,
    modelo: linha.modelo,
    estado: linha.estado,
    tokensEntrada: linha.tokens_entrada,
    tokensSaida: linha.tokens_saida,
    tokensCacheLeitura: linha.tokens_cache_leitura,
    tokensCacheEscrita: linha.tokens_cache_escrita,
    lote: linha.lote === 1,
    duracaoMs: linha.duracao_ms ?? null,
    custoEstimadoUsd: linha.custo_estimado,
    criadoEm: linha.criado_em,
  };
}

export function criarServicoEficiencia({ db, settings, registrarEvento = () => true, catalogo = CATALOGO, agora = () => new Date() }) {
  const inserir = db.prepare(`
    INSERT INTO copilot_calls (${COLUNAS})
    VALUES (@id, @projectId, @intencao, @etapa, @modelo, @estado,
            @tokensEntrada, @tokensSaida, @tokensCacheLeitura, @tokensCacheEscrita,
            @lote, @duracaoMs, @custoEstimado, @criadoEm)
  `);
  const lerUma = db.prepare(`SELECT ${COLUNAS} FROM copilot_calls WHERE id = ?`);
  const projetoExiste = db.prepare('SELECT 1 FROM projects WHERE id = ?');
  const lerPeriodo = db.prepare(`
    SELECT ${COLUNAS} FROM copilot_calls
    WHERE (@inicio IS NULL OR criado_em >= @inicio)
      AND (@intencao IS NULL OR intencao = @intencao)
    ORDER BY criado_em ASC, id ASC
  `);

  // O custo é sempre calculado aqui, com o catálogo versionado. Nunca aceito do cliente.
  function registrar(entrada) {
    if (entrada.projectId && !projetoExiste.get(entrada.projectId)) {
      throw new ErroForge('FORGE_VALIDATION', 'Projeto não encontrado.', {
        issues: [{ caminho: 'projectId', mensagem: 'Nenhum projeto com esse id. Deixe vazio para uma chamada sem projeto.' }],
      });
    }
    let custoEstimado;
    try {
      custoEstimado = calcularCustoUsd(entrada, catalogo);
    } catch (erro) {
      throw traduzirErroEficiencia(erro);
    }
    const registro = {
      id: randomUUID(),
      projectId: entrada.projectId ?? null,
      intencao: entrada.intencao ?? null,
      etapa: entrada.etapa,
      modelo: entrada.modelo,
      estado: entrada.estado,
      tokensEntrada: entrada.tokensEntrada,
      tokensSaida: entrada.tokensSaida,
      tokensCacheLeitura: entrada.tokensCacheLeitura,
      tokensCacheEscrita: entrada.tokensCacheEscrita,
      lote: entrada.lote ? 1 : 0,
      duracaoMs: entrada.duracaoMs ?? null,
      custoEstimado,
      criadoEm: agora().toISOString(),
    };
    inserir.run(registro);
    registrarEvento('copiloto.chamada.registrada', {
      id: registro.id,
      etapa: registro.etapa,
      modelo: registro.modelo,
      estado: registro.estado,
      custoEstimadoUsd: custoEstimado,
    }, registro.projectId);
    return paraChamada(lerUma.get(registro.id));
  }

  function listar({ intencao = 'todas', periodo = 'mes' } = {}) {
    return lerPeriodo
      .all({ inicio: inicioDoPeriodo(periodo, agora()), intencao: intencao === 'todas' ? null : intencao })
      .map(paraChamada);
  }

  function painel({ intencao = 'todas', periodo = 'mes' } = {}) {
    const chamadas = listar({ intencao, periodo });
    const tetoUsd = settings.obter().copilotoTetoUsd;
    return resumirPainel({ chamadas, tetoUsd, periodo, intencao }, catalogo);
  }

  return { registrar, listar, painel };
}
