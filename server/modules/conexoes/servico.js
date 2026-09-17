import { randomUUID } from 'node:crypto';
import { ErroForge } from '../../lib/erro.js';

const COLUNAS = 'c.id, c.alias, c.status, c.criado_em, c.atualizado_em, t.provider, t.payload_json';
const paraConexao = (linha) => {
  const modelo = JSON.parse(linha.payload_json);
  return { id: linha.id, alias: linha.alias, provedor: linha.provider, tipo: modelo.tipo, endpoint: modelo.endpoint ?? null, urlTeste: modelo.urlTeste ?? null, cabecalhoChave: modelo.cabecalhoChave ?? 'Authorization', prefixoChave: modelo.prefixoChave ?? 'Bearer ', status: linha.status, criadaEm: linha.criado_em, atualizadaEm: linha.atualizado_em };
};

export function criarServicoConexoes({ db, cofre, registrarEvento = () => true }) {
  const listar = db.prepare(`SELECT ${COLUNAS} FROM api_connections c JOIN api_templates t ON t.id = c.template_id ORDER BY c.criado_em DESC`);
  const porId = db.prepare(`SELECT ${COLUNAS} FROM api_connections c JOIN api_templates t ON t.id = c.template_id WHERE c.id = ?`);
  const inserirModelo = db.prepare('INSERT INTO api_templates (id, provider, nome, versao, payload_json, criado_em) VALUES (@id, @provedor, @provedor, 1, @payload, @agora)');
  const inserir = db.prepare('INSERT INTO api_connections (id, template_id, alias, escopo, status, testada_em, criado_em, atualizado_em) VALUES (@id, @templateId, @alias, NULL, \'pendente\', NULL, @agora, @agora)');
  const atualizarTeste = db.prepare('UPDATE api_connections SET status = @status, testada_em = @agora, atualizado_em = @agora WHERE id = @id');
  function criar({ alias, provedor, tipo, endpoint, urlTeste, cabecalhoChave, prefixoChave, chave }) {
    if (cofre.estado() !== 'destrancado') throw new ErroForge('FORGE_VAULT_LOCKED');
    const id = randomUUID();
    const templateId = randomUUID();
    const agora = new Date().toISOString();
    try {
      inserirModelo.run({ id: templateId, provedor, payload: JSON.stringify({ tipo, endpoint: endpoint ?? null, urlTeste: urlTeste ?? null, cabecalhoChave, prefixoChave }), agora });
      inserir.run({ id, templateId, alias, agora });
    } catch (erro) {
      if (String(erro.message).includes('UNIQUE')) throw new ErroForge('FORGE_VALIDATION', 'Esse alias já existe.', { issues: [{ caminho: 'alias', mensagem: 'Escolha outro nome.' }] });
      throw erro;
    }
    try { cofre.guardar(id, chave); } catch (erro) {
      db.transaction(() => { db.prepare('DELETE FROM api_connections WHERE id = ?').run(id); db.prepare('DELETE FROM api_templates WHERE id = ?').run(templateId); })();
      throw erro;
    }
    registrarEvento('conexao.criada', { conexaoId: id, provedor, tipo });
    return { id, alias, provedor, tipo, endpoint: endpoint ?? null, urlTeste: urlTeste ?? null, cabecalhoChave, prefixoChave, status: 'pendente', criadaEm: agora, atualizadaEm: agora };
  }
  async function testar(id, { fetchImpl = globalThis.fetch } = {}) {
    if (cofre.estado() !== 'destrancado') throw new ErroForge('FORGE_VAULT_LOCKED');
    const linha = porId.get(id);
    if (!linha) throw new ErroForge('FORGE_NOT_FOUND', 'Conexao nao encontrada.');
    const conexao = paraConexao(linha);
    if (!conexao.urlTeste) throw new ErroForge('FORGE_VALIDATION', 'Informe a URL de teste para esta conexao.');
    let resultado = 'indisponivel';
    try {
      const chave = cofre.obter(id);
      const resposta = await fetchImpl(conexao.urlTeste, { method: 'GET', redirect: 'error', signal: AbortSignal.timeout(10_000), headers: { Accept: 'application/json', [conexao.cabecalhoChave]: `${conexao.prefixoChave}${chave}` } });
      resultado = resposta.ok ? 'sucesso' : 'recusada';
    } catch (erro) {
      if (erro instanceof ErroForge) throw erro;
    }
    const agora = new Date().toISOString();
    const status = resultado === 'sucesso' ? 'ativa' : 'invalida';
    atualizarTeste.run({ id, status, agora });
    registrarEvento('conexao.testada', { conexaoId: id, provedor: conexao.provedor, resultado, status });
    return { conexao: { ...conexao, status, atualizadaEm: agora }, resultado };
  }
  return { listar: () => ({ conexoes: listar.all().map(paraConexao) }), criar, testar };
}
