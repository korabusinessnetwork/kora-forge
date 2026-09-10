import { randomUUID } from 'node:crypto';
import { ErroForge } from '../../lib/erro.js';

// Gaveta de ideias (RN-10). Capturar não pode custar nada: nenhuma pergunta além do título, e a
// ideia nunca interrompe o que estava em andamento. Ideia não é apagada, é descartada, do mesmo
// jeito que projeto é arquivado e não deletado.

const CAMPOS = 'id, titulo, proximo_passo, origem, estado, criado_em';

function paraIdeia(linha) {
  return {
    id: linha.id,
    titulo: linha.titulo,
    proximoPasso: linha.proximo_passo,
    origem: linha.origem,
    estado: linha.estado,
    criadoEm: linha.criado_em,
  };
}

// Texto opcional vazio vira null: coluna com string vazia mente, dizendo que existe conteúdo.
function ouNulo(texto) {
  const limpo = typeof texto === 'string' ? texto.trim() : '';
  return limpo === '' ? null : limpo;
}

export function criarServicoIdeias({ db, registrarEvento = () => true }) {
  const stmts = {
    inserir: db.prepare('INSERT INTO ideas (id, titulo, proximo_passo, origem, estado, criado_em) VALUES (@id, @titulo, @proximo_passo, @origem, @estado, @criado_em)'),
    porId: db.prepare(`SELECT ${CAMPOS} FROM ideas WHERE id = ?`),
    abertas: db.prepare(`SELECT ${CAMPOS} FROM ideas WHERE estado = 'aberta' ORDER BY criado_em DESC, rowid DESC`),
    mudarEstado: db.prepare('UPDATE ideas SET estado = @estado WHERE id = @id'),
  };

  function obterOuFalhar(id) {
    const linha = stmts.porId.get(id);
    if (!linha) throw new ErroForge('FORGE_NOT_FOUND', 'Ideia não encontrada.');
    return paraIdeia(linha);
  }

  function criar({ titulo, proximoPasso, origem }) {
    const ideia = {
      id: randomUUID(),
      titulo: titulo.trim(),
      proximo_passo: ouNulo(proximoPasso),
      origem: ouNulo(origem),
      estado: 'aberta',
      criado_em: new Date().toISOString(),
    };
    stmts.inserir.run(ideia);
    registrarEvento('ideia.registrada', { origem: ideia.origem });
    return paraIdeia(ideia);
  }

  function listar() {
    return { ideias: stmts.abertas.all().map(paraIdeia) };
  }

  // Idempotente de propósito: descartar de novo o que já está descartado não é erro, porque duas
  // abas abertas na mesma gaveta são um caso normal, não uma condição excepcional.
  function mudarEstado(id, estado) {
    const atual = obterOuFalhar(id);
    if (atual.estado === estado) return atual;
    stmts.mudarEstado.run({ id, estado });
    if (estado === 'descartada') registrarEvento('ideia.descartada', { ideiaId: id });
    return { ...atual, estado };
  }

  return { criar, listar, obterOuFalhar, mudarEstado };
}
