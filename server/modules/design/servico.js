import { randomUUID } from 'node:crypto';
import { completarTokens, TOKENS_PADRAO } from '../../../shared/schemas/design.js';
import { ErroForge } from '../../lib/erro.js';

// Documento de design do projeto (ADR-005, Fase 2 bloco 1). Espelha o que `blueprints` já faz:
// uma versão por mudança, e salvar igual não versiona.
//
// Sem documento, valem os defaults do catálogo. Isso não é um caso de borda: é o caminho normal de
// quem nunca abriu a etapa Design, e é o que garante que o `tokens.css` gerado continue idêntico
// ao de sempre para quem não pediu mudança nenhuma.

const PAGINAS_VAZIAS = { paginas: [] };

function paraDocumento(linha) {
  return {
    versao: linha.versao,
    tokens: completarTokens(JSON.parse(linha.tokens_json)),
    paginas: JSON.parse(linha.paginas_json).paginas ?? [],
    criadoEm: linha.criado_em,
  };
}

// Documento que não existe ainda. Versão zero diz "nada foi salvo", e a primeira gravação vira 1.
export function documentoPadrao() {
  return { versao: 0, tokens: { ...TOKENS_PADRAO }, paginas: [], criadoEm: null };
}

// Só o que diverge do default é gravado. Assim o documento não engessa valor que o dono nunca
// escolheu: token que ganhar default melhor no futuro acompanha, em vez de ficar congelado.
export function apenasAlterados(tokens) {
  const alterados = {};
  for (const [chave, valor] of Object.entries(tokens)) {
    if (TOKENS_PADRAO[chave] !== valor) alterados[chave] = valor;
  }
  return alterados;
}

export function criarServicoDesign({ db, projetos, registrarEvento = () => true }) {
  const stmts = {
    ativo: db.prepare('SELECT versao, tokens_json, paginas_json, criado_em FROM design_documents WHERE project_id = ? ORDER BY versao DESC LIMIT 1'),
    inserir: db.prepare('INSERT INTO design_documents (id, project_id, versao, tokens_json, paginas_json, criado_em) VALUES (@id, @project_id, @versao, @tokens_json, @paginas_json, @criado_em)'),
  };

  function obter(projetoId) {
    projetos.obterOuFalhar(projetoId);
    const linha = stmts.ativo.get(projetoId);
    return linha ? paraDocumento(linha) : documentoPadrao();
  }

  function salvar(projetoId, { tokens }) {
    const { projeto } = projetos.obterOuFalhar(projetoId);
    if (projeto.status === 'arquivado') {
      throw new ErroForge('FORGE_VALIDATION', 'Projeto arquivado. Restaure antes de mudar o design.', {
        issues: [{ caminho: 'projeto', mensagem: 'Projeto arquivado.' }],
      });
    }

    const atual = obter(projetoId);
    const completos = completarTokens(tokens);
    // Salvar o mesmo conteúdo não versiona, mesma regra do blueprint: navegar não é editar.
    const igual = Object.keys(TOKENS_PADRAO).every((chave) => atual.tokens[chave] === completos[chave]);
    if (igual) return atual;

    const documento = {
      id: randomUUID(),
      project_id: projetoId,
      versao: atual.versao + 1,
      tokens_json: JSON.stringify(apenasAlterados(completos)),
      paginas_json: JSON.stringify(PAGINAS_VAZIAS),
      criado_em: new Date().toISOString(),
    };
    stmts.inserir.run(documento);
    registrarEvento('design.alterado', { versao: documento.versao }, projetoId);
    return paraDocumento(documento);
  }

  // O gerador pede só os tokens, e nunca precisa saber se existe documento ou não.
  const tokensDe = (projetoId) => obter(projetoId).tokens;

  return { obter, salvar, tokensDe };
}
