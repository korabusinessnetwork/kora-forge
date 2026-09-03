import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { regraSchema } from '../../../shared/schemas/regra.js';
import { montarContexto } from '../../../shared/contexto.js';
import { avaliarCondicao, ordenarRegras } from '../../../shared/avaliador.js';
import { ErroForge } from '../../lib/erro.js';
import { formatarIssues } from '../../lib/validar.js';

export const PASTA_REGRAS_BUILTIN = fileURLToPath(new URL('../../../regras/', import.meta.url));
const TAMANHO_MINIMO_JUSTIFICATIVA = 10;

function erroCampo(caminho, mensagem) {
  return new ErroForge('FORGE_VALIDATION', mensagem, { issues: [{ caminho, mensagem }] });
}

// Regra inválida derruba o boot. Subir com catálogo pela metade daria conselho errado com cara
// de certeza, que é pior que não dar conselho nenhum.
export function carregarRegrasBuiltin(pasta = PASTA_REGRAS_BUILTIN) {
  return fs.readdirSync(pasta).filter((nome) => nome.endsWith('.json')).sort().map((arquivo) => {
    let bruto;
    try {
      bruto = JSON.parse(fs.readFileSync(path.join(pasta, arquivo), 'utf8'));
    } catch (erro) {
      throw new ErroForge('FORGE_VALIDATION', `Regra ${arquivo} não é JSON válido.`, { issues: [{ caminho: arquivo, mensagem: erro.message }] });
    }
    const resultado = regraSchema.safeParse(bruto);
    if (!resultado.success) {
      throw new ErroForge('FORGE_VALIDATION', `Regra ${arquivo} fora do contrato.`, {
        issues: formatarIssues(resultado.error).map((issue) => ({ ...issue, caminho: `${arquivo}:${issue.caminho}` })),
      });
    }
    return resultado.data;
  });
}

export function sincronizarRegras(db, lista) {
  const ler = db.prepare('SELECT payload_json FROM rules WHERE id = ?');
  const inserir = db.prepare('INSERT INTO rules (id, versao, severidade, payload_json, ativo, criado_em) VALUES (@id, @versao, @severidade, @payload_json, 1, @agora)');
  const atualizar = db.prepare('UPDATE rules SET versao = @versao, severidade = @severidade, payload_json = @payload_json, ativo = 1 WHERE id = @id');
  const resultado = { inseridas: [], atualizadas: [], inalteradas: [] };
  db.transaction(() => {
    for (const regra of lista) {
      const payload_json = JSON.stringify(regra);
      const linha = { id: regra.id, versao: regra.versao, severidade: regra.severidade, payload_json, agora: new Date().toISOString() };
      const atual = ler.get(regra.id);
      if (!atual) {
        inserir.run(linha);
        resultado.inseridas.push(regra.id);
      } else if (atual.payload_json === payload_json) {
        resultado.inalteradas.push(regra.id);
      } else {
        atualizar.run(linha);
        resultado.atualizadas.push(regra.id);
      }
    }
  })();
  return resultado;
}

function paraHit(regra, linha) {
  return {
    id: linha.id,
    regraId: regra.id,
    severidade: regra.severidade,
    estado: linha.estado,
    titulo: regra.titulo,
    explicacao: regra.explicacao,
    etapa: regra.etapa ?? null,
    campo: regra.campo ?? null,
    dispensavel: regra.dispensavel,
    resolucao: regra.resolucao,
    efeitos: regra.efeitos,
    justificativa: linha.justificativa ?? null,
  };
}

export function criarServicoRegras({ db, registrarEvento = () => true }) {
  const stmts = {
    catalogo: db.prepare('SELECT payload_json FROM rules WHERE ativo = 1'),
    doProjeto: db.prepare('SELECT id, rule_id, estado, justificativa FROM rule_hits WHERE project_id = ?'),
    hitPorId: db.prepare('SELECT id, project_id, rule_id, estado, justificativa FROM rule_hits WHERE id = ?'),
    inserir: db.prepare('INSERT INTO rule_hits (id, project_id, rule_id, severidade, estado, justificativa, criado_em, atualizado_em) VALUES (@id, @project_id, @rule_id, @severidade, @estado, NULL, @agora, @agora)'),
    atualizarEstado: db.prepare('UPDATE rule_hits SET estado = @estado, severidade = @severidade, atualizado_em = @agora WHERE id = @id'),
    atualizarDecisao: db.prepare('UPDATE rule_hits SET estado = @estado, justificativa = @justificativa, atualizado_em = @agora WHERE id = @id'),
  };

  function catalogo() {
    return ordenarRegras(stmts.catalogo.all().map((linha) => JSON.parse(linha.payload_json)));
  }

  function porRegra(projectId) {
    const mapa = new Map();
    for (const linha of stmts.doProjeto.all(projectId)) mapa.set(linha.rule_id, linha);
    return mapa;
  }

  // Estado novo de um hit que continua disparando. Dispensado e ignorado são decisões humanas
  // e sobrevivem à reavaliação; resolvido volta a aberto porque o problema voltou.
  function estadoAoDisparar(regra, existente) {
    if (regra.resolucao === 'automatica') return 'resolvido';
    if (!existente) return 'aberto';
    if (existente.estado === 'dispensado' || existente.estado === 'ignorado') return existente.estado;
    return 'aberto';
  }

  function montar(projectId, regras) {
    const gravados = porRegra(projectId);
    const hits = [];
    for (const regra of regras) {
      const linha = gravados.get(regra.id);
      if (linha) hits.push(paraHit(regra, linha));
    }
    const bloqueios = hits.filter((hit) => hit.severidade === 'bloqueio' && hit.estado === 'aberto').length;
    return { hits, bloqueios, podeMaterializar: bloqueios === 0 };
  }

  function avaliar({ projeto, preset, blueprint }) {
    const regras = catalogo();
    const contexto = montarContexto({ projeto, preset, blueprint });
    const gravados = porRegra(projeto.id);
    const agora = new Date().toISOString();
    const novosAbertos = [];

    db.transaction(() => {
      for (const regra of regras) {
        const existente = gravados.get(regra.id);
        const dispara = avaliarCondicao(regra.quando, contexto);
        if (dispara) {
          const estado = estadoAoDisparar(regra, existente);
          if (!existente) {
            stmts.inserir.run({ id: randomUUID(), project_id: projeto.id, rule_id: regra.id, severidade: regra.severidade, estado, agora });
            if (estado === 'aberto') novosAbertos.push(regra.id);
          } else if (existente.estado !== estado) {
            stmts.atualizarEstado.run({ id: existente.id, estado, severidade: regra.severidade, agora });
            if (estado === 'aberto') novosAbertos.push(regra.id);
          }
        } else if (existente && existente.estado !== 'resolvido' && existente.estado !== 'dispensado') {
          // Parou de disparar: o blueprint mudou e o problema sumiu (auto-resolução).
          stmts.atualizarEstado.run({ id: existente.id, estado: 'resolvido', severidade: regra.severidade, agora });
        }
      }
    })();

    for (const regraId of novosAbertos) registrarEvento('regra.disparou', { regraId }, projeto.id);
    return montar(projeto.id, regras);
  }

  function listar(projectId) {
    return montar(projectId, catalogo());
  }

  function atualizarHit({ projeto, hitId, patch }) {
    const linha = stmts.hitPorId.get(hitId);
    if (!linha || linha.project_id !== projeto.id) throw new ErroForge('FORGE_NOT_FOUND', 'Aviso não encontrado.');
    if (projeto.status === 'arquivado') throw erroCampo('estado', 'Projeto arquivado. Restaure antes de decidir sobre os avisos.');

    const regra = catalogo().find((item) => item.id === linha.rule_id);
    if (!regra) throw new ErroForge('FORGE_NOT_FOUND', 'A regra deste aviso não está mais no catálogo.');

    let justificativa = patch.justificativa?.trim() ?? null;
    if (patch.estado === 'dispensado') {
      if (!regra.dispensavel) throw erroCampo('estado', 'Este aviso não pode ser dispensado. Ele existe para impedir um erro que custa caro.');
      if (!justificativa || justificativa.length < TAMANHO_MINIMO_JUSTIFICATIVA) {
        throw erroCampo('justificativa', `Diga em ao menos ${TAMANHO_MINIMO_JUSTIFICATIVA} caracteres por que este aviso não se aplica aqui.`);
      }
    } else {
      justificativa = null;
    }

    stmts.atualizarDecisao.run({ id: hitId, estado: patch.estado, justificativa, agora: new Date().toISOString() });
    if (patch.estado === 'dispensado') registrarEvento('regra.dispensada', { regraId: regra.id, justificativa }, projeto.id);
    return listar(projeto.id);
  }

  return { catalogo, avaliar, listar, atualizarHit };
}
