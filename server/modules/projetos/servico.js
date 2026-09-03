import { randomUUID } from 'node:crypto';
import { gerarSlug } from '../../../shared/slug.js';
import { ErroForge } from '../../lib/erro.js';

function erroCampo(caminho, mensagem) {
  return new ErroForge('FORGE_VALIDATION', mensagem, { issues: [{ caminho, mensagem }] });
}

function paraResumo(linha) {
  return {
    id: linha.id,
    nome: linha.nome,
    slug: linha.slug,
    presetId: linha.preset_id,
    presetNome: linha.preset_nome,
    presetVersao: linha.preset_versao,
    status: linha.status,
    etapaAtual: linha.etapa_atual,
    caminhoDisco: linha.caminho_disco,
    criadoEm: linha.criado_em,
    atualizadoEm: linha.atualizado_em,
  };
}

const escaparLike = (texto) => texto.replace(/[\\%_]/g, '\\$&');

// Registry (RN-01, RN-02). Nunca apaga projeto; arquiva. Uma versão ativa de blueprint por projeto.
export function criarServicoProjetos({ db, presets, registrarEvento = () => true }) {
  const stmts = {
    porId: db.prepare('SELECT p.*, pr.nome AS preset_nome FROM projects p JOIN presets pr ON pr.id = p.preset_id WHERE p.id = ?'),
    porSlug: db.prepare('SELECT id FROM projects WHERE slug = ?'),
    listar: db.prepare(`
      SELECT p.*, pr.nome AS preset_nome FROM projects p JOIN presets pr ON pr.id = p.preset_id
      WHERE ((@status IS NULL AND p.status != 'arquivado') OR p.status = @status)
        AND (@padrao IS NULL OR lower(p.nome) LIKE @padrao ESCAPE '\\' OR p.slug LIKE @padrao ESCAPE '\\')
      ORDER BY p.atualizado_em DESC, p.criado_em DESC
    `),
    inserirProjeto: db.prepare(`
      INSERT INTO projects (id, nome, slug, preset_id, preset_versao, caminho_disco, status, etapa_atual, criado_em, atualizado_em)
      VALUES (@id, @nome, @slug, @preset_id, @preset_versao, NULL, 'rascunho', @etapa_atual, @agora, @agora)
    `),
    inserirBlueprint: db.prepare(`
      INSERT INTO blueprints (id, project_id, versao, ativo, payload_json, criado_em)
      VALUES (@id, @project_id, @versao, 1, @payload_json, @agora)
    `),
    desativarBlueprints: db.prepare('UPDATE blueprints SET ativo = 0 WHERE project_id = ?'),
    blueprintAtivo: db.prepare('SELECT versao, ativo, payload_json, criado_em FROM blueprints WHERE project_id = ? AND ativo = 1'),
    versoes: db.prepare('SELECT versao, ativo, criado_em FROM blueprints WHERE project_id = ? ORDER BY versao DESC'),
    ultimaVersao: db.prepare('SELECT COALESCE(MAX(versao), 0) AS ultima FROM blueprints WHERE project_id = ?'),
    atualizarNome: db.prepare('UPDATE projects SET nome = @nome, atualizado_em = @agora WHERE id = @id'),
    atualizarStatus: db.prepare('UPDATE projects SET status = @status, atualizado_em = @agora WHERE id = @id'),
    atualizarEtapa: db.prepare('UPDATE projects SET etapa_atual = @etapa, atualizado_em = @agora WHERE id = @id'),
  };

  function linhaOuFalhar(id) {
    const linha = stmts.porId.get(id);
    if (!linha) throw new ErroForge('FORGE_NOT_FOUND', 'Projeto não encontrado.');
    return linha;
  }

  function blueprintDe(id) {
    const linha = stmts.blueprintAtivo.get(id);
    if (!linha) throw new ErroForge('FORGE_INTERNAL', 'Projeto sem blueprint ativo.');
    return { versao: linha.versao, ativo: Boolean(linha.ativo), criadoEm: linha.criado_em, payload: JSON.parse(linha.payload_json) };
  }

  function obter(id) {
    const linha = stmts.porId.get(id);
    if (!linha) return null;
    return { projeto: paraResumo(linha), blueprint: blueprintDe(id) };
  }

  function obterOuFalhar(id) {
    const resultado = obter(id);
    if (!resultado) throw new ErroForge('FORGE_NOT_FOUND', 'Projeto não encontrado.');
    return resultado;
  }

  function listar({ status, busca } = {}) {
    const padrao = busca ? `%${escaparLike(busca.trim().toLowerCase())}%` : null;
    return stmts.listar.all({ status: status ?? null, padrao }).map(paraResumo);
  }

  function criar({ nome, presetId }) {
    const preset = presets.obter(presetId);
    if (!preset) throw erroCampo('presetId', 'Esse menu não existe.');
    const slug = gerarSlug(nome);
    if (!slug) throw erroCampo('nome', 'O nome precisa ter ao menos uma letra ou número.');
    if (stmts.porSlug.get(slug)) throw erroCampo('nome', `Já existe um projeto com o slug "${slug}". Escolha outro nome.`);

    const id = randomUUID();
    const agora = new Date().toISOString();
    const payload = {
      preset: { id: preset.id, versao: preset.versao },
      etapaAtual: preset.etapas[0],
      etapasConcluidas: [],
      assumidas: [],
      respostas: {},
    };
    db.transaction(() => {
      stmts.inserirProjeto.run({ id, nome, slug, preset_id: preset.id, preset_versao: preset.versao, etapa_atual: payload.etapaAtual, agora });
      stmts.inserirBlueprint.run({ id: randomUUID(), project_id: id, versao: 1, payload_json: JSON.stringify(payload), agora });
    })();
    registrarEvento('projeto.criado', { nome, slug, presetId: preset.id, presetVersao: preset.versao }, id);
    return obterOuFalhar(id);
  }

  function atualizar(id, patch) {
    const atual = linhaOuFalhar(id);
    const agora = new Date().toISOString();
    if (patch.nome !== undefined && patch.nome !== atual.nome) {
      stmts.atualizarNome.run({ id, nome: patch.nome, agora });
      registrarEvento('projeto.renomeado', { de: atual.nome, para: patch.nome }, id);
    }
    if (patch.arquivado === true && atual.status !== 'arquivado') {
      stmts.atualizarStatus.run({ id, status: 'arquivado', agora });
      registrarEvento('projeto.arquivado', { statusAnterior: atual.status }, id);
    }
    if (patch.arquivado === false && atual.status === 'arquivado') {
      const status = atual.caminho_disco ? 'materializado' : 'rascunho';
      stmts.atualizarStatus.run({ id, status, agora });
      registrarEvento('projeto.restaurado', { status }, id);
    }
    return obterOuFalhar(id);
  }

  function salvarBlueprint(id, payload) {
    const atual = linhaOuFalhar(id);
    if (atual.status === 'arquivado') throw erroCampo('', 'Projeto arquivado. Restaure antes de editar.');
    if (payload.preset.id !== atual.preset_id || payload.preset.versao !== atual.preset_versao) {
      throw erroCampo('preset', 'O preset do blueprint não bate com o do projeto. Trocar preset exige projeto novo.');
    }
    // Etapa que não existe no preset não entra no blueprint: o wizard é conduzido pelo preset.
    const etapasDoPreset = presets.obterOuFalhar(atual.preset_id).etapas;
    if (!etapasDoPreset.includes(payload.etapaAtual)) {
      throw erroCampo('etapaAtual', `A etapa "${payload.etapaAtual}" não existe neste menu.`);
    }
    for (const campo of ['etapasConcluidas', 'assumidas']) {
      const fora = payload[campo].filter((etapa) => !etapasDoPreset.includes(etapa));
      if (fora.length > 0) throw erroCampo(campo, `Etapa fora do menu do projeto: ${fora.join(', ')}.`);
    }
    const versao = stmts.ultimaVersao.get(id).ultima + 1;
    const agora = new Date().toISOString();
    db.transaction(() => {
      stmts.desativarBlueprints.run(id);
      stmts.inserirBlueprint.run({ id: randomUUID(), project_id: id, versao, payload_json: JSON.stringify(payload), agora });
      stmts.atualizarEtapa.run({ id, etapa: payload.etapaAtual, agora });
    })();
    registrarEvento('blueprint.salvo', { versao, etapaAtual: payload.etapaAtual }, id);
    return obterOuFalhar(id);
  }

  function listarVersoes(id) {
    linhaOuFalhar(id);
    return stmts.versoes.all(id).map((linha) => ({ versao: linha.versao, ativo: Boolean(linha.ativo), criadoEm: linha.criado_em }));
  }

  return { listar, criar, obter, obterOuFalhar, atualizar, salvarBlueprint, listarVersoes };
}
