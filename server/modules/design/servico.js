import { randomUUID } from 'node:crypto';
import { saoIguais } from '../../../shared/serializar.js';
import { CATALOGO_VERSAO_ATUAL } from '../../../shared/schemas/design.js';
import { ErroForge } from '../../lib/erro.js';

function erroCampo(caminho, mensagem) {
  return new ErroForge('FORGE_VALIDATION', mensagem, { issues: [{ caminho, mensagem }] });
}

// Documento de design (ADR-009). Versionado como o blueprint: salvar cria a versão n+1 e a
// anterior fica no histórico. A tabela `design_documents` não tem coluna `ativo`, e não precisa:
// a versão ativa é sempre a de maior número, então não existe estado para dessincronizar.
//
// A coluna `paginas_json` guarda a parte estrutural inteira, `{ catalogo, paginas }`, e não só o
// array de páginas. É o que evita migration para gravar a versão do catálogo.
export function criarServicoDesign({ db, projetos, catalogo, registrarEvento = () => true }) {
  const stmts = {
    ativo: db.prepare(`
      SELECT versao, tokens_json, paginas_json, criado_em FROM design_documents
      WHERE project_id = ? ORDER BY versao DESC LIMIT 1
    `),
    versoes: db.prepare('SELECT versao, criado_em FROM design_documents WHERE project_id = ? ORDER BY versao DESC'),
    ultimaVersao: db.prepare('SELECT COALESCE(MAX(versao), 0) AS ultima FROM design_documents WHERE project_id = ?'),
    inserir: db.prepare(`
      INSERT INTO design_documents (id, project_id, versao, tokens_json, paginas_json, criado_em)
      VALUES (@id, @project_id, @versao, @tokens_json, @paginas_json, @agora)
    `),
  };

  function paraRegistro(linha) {
    const estrutura = JSON.parse(linha.paginas_json);
    const payload = {
      catalogo: estrutura.catalogo,
      tokens: JSON.parse(linha.tokens_json),
      paginas: estrutura.paginas,
    };
    return {
      versao: linha.versao,
      ativo: true,
      criadoEm: linha.criado_em,
      payload,
      pendencias: catalogo.pendenciasDe(payload),
    };
  }

  // Ausência é estado normal, e quer dizer "usei o padrão Kora". Por isso null, e nunca 404.
  function obter(id) {
    projetos.obterOuFalhar(id);
    const linha = stmts.ativo.get(id);
    return linha ? paraRegistro(linha) : null;
  }

  function salvar(id, payload) {
    const { projeto } = projetos.obterOuFalhar(id);
    if (projeto.status === 'arquivado') throw erroCampo('', 'Projeto arquivado. Restaure antes de editar o design.');
    if (payload.catalogo.versao > CATALOGO_VERSAO_ATUAL) {
      throw erroCampo('catalogo.versao', `Este documento foi feito num Forge mais novo (catálogo versão ${payload.catalogo.versao}, aqui é ${CATALOGO_VERSAO_ATUAL}). Atualize o Forge para abrir.`);
    }

    // O desenho tem que caber no catálogo deste Forge, senão o gerador não saberia escrevê-lo.
    // Recusa na escrita, com o caminho do nó; na leitura o mesmo caso vira pendência, e nunca
    // reescrita do documento de quem já tinha salvado.
    catalogo.validarDocumento(payload);

    // Salvar sem mudar nada não versiona: o Studio salva sozinho enquanto a pessoa desenha, e o
    // histórico ficaria cheio de versão idêntica. Mesma regra do blueprint.
    const atual = stmts.ativo.get(id);
    if (atual && saoIguais(paraRegistro(atual).payload, payload)) return paraRegistro(atual);

    const versao = stmts.ultimaVersao.get(id).ultima + 1;
    const agora = new Date().toISOString();
    stmts.inserir.run({
      id: randomUUID(),
      project_id: id,
      versao,
      tokens_json: JSON.stringify(payload.tokens),
      paginas_json: JSON.stringify({ catalogo: payload.catalogo, paginas: payload.paginas }),
      agora,
    });
    registrarEvento('design.salvo', { versao, paginas: payload.paginas.length, catalogoVersao: payload.catalogo.versao }, id);
    return obter(id);
  }

  function listarVersoes(id) {
    projetos.obterOuFalhar(id);
    const linhas = stmts.versoes.all(id);
    return linhas.map((linha, indice) => ({ versao: linha.versao, ativo: indice === 0, criadoEm: linha.criado_em }));
  }

  return { obter, salvar, listarVersoes };
}
