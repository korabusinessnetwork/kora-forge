import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { presetSchema } from '../../../shared/schemas/preset.js';
import { ErroForge } from '../../lib/erro.js';
import { formatarIssues } from '../../lib/validar.js';

export const PASTA_PRESETS_BUILTIN = fileURLToPath(new URL('../../../presets/', import.meta.url));

// Lê presets/*.json em ordem de nome. Preset inválido derruba o boot: melhor parar do que subir pela metade.
export function carregarPresetsBuiltin(pasta = PASTA_PRESETS_BUILTIN) {
  const arquivos = fs.readdirSync(pasta).filter((nome) => nome.endsWith('.json')).sort();
  return arquivos.map((arquivo) => {
    let bruto;
    try {
      bruto = JSON.parse(fs.readFileSync(path.join(pasta, arquivo), 'utf8'));
    } catch (erro) {
      throw new ErroForge('FORGE_VALIDATION', `Preset ${arquivo} não é JSON válido.`, {
        issues: [{ caminho: arquivo, mensagem: erro.message }],
      });
    }
    const resultado = presetSchema.safeParse(bruto);
    if (!resultado.success) {
      throw new ErroForge('FORGE_VALIDATION', `Preset ${arquivo} fora do contrato.`, {
        issues: formatarIssues(resultado.error).map((issue) => ({ ...issue, caminho: `${arquivo}:${issue.caminho}` })),
      });
    }
    return resultado.data;
  });
}

// Upsert por id, só em linhas builtin. Preset custom com o mesmo id nunca é tocado.
export function sincronizarPresets(db, lista) {
  const ler = db.prepare('SELECT versao, payload_json, origem FROM presets WHERE id = ?');
  const inserir = db.prepare(`
    INSERT INTO presets (id, nome, descricao, categoria, versao, origem, payload_json, ativo, criado_em, atualizado_em)
    VALUES (@id, @nome, @descricao, @categoria, @versao, 'builtin', @payload_json, 1, @agora, @agora)
  `);
  const atualizar = db.prepare(`
    UPDATE presets SET nome = @nome, descricao = @descricao, categoria = @categoria, versao = @versao,
      payload_json = @payload_json, ativo = 1, atualizado_em = @agora
    WHERE id = @id AND origem = 'builtin'
  `);
  const resultado = { inseridos: [], atualizados: [], inalterados: [] };
  db.transaction(() => {
    for (const preset of lista) {
      const payload_json = JSON.stringify(preset);
      const linha = { id: preset.id, nome: preset.nome, descricao: preset.descricao, categoria: preset.categoria, versao: preset.versao, payload_json, agora: new Date().toISOString() };
      const atual = ler.get(preset.id);
      if (!atual) {
        inserir.run(linha);
        resultado.inseridos.push(preset.id);
      } else if (atual.origem !== 'builtin' || atual.payload_json === payload_json) {
        resultado.inalterados.push(preset.id);
      } else {
        atualizar.run(linha);
        resultado.atualizados.push(preset.id);
      }
    }
  })();
  return resultado;
}

export function criarServicoPresets({ db }) {
  const listarStmt = db.prepare('SELECT id, nome, descricao, categoria, versao, origem, payload_json FROM presets WHERE ativo = 1 ORDER BY nome');
  const obterStmt = db.prepare('SELECT payload_json FROM presets WHERE id = ? AND ativo = 1');

  function listar() {
    return listarStmt.all().map((linha) => {
      const payload = JSON.parse(linha.payload_json);
      return {
        id: linha.id,
        nome: linha.nome,
        descricao: linha.descricao,
        categoria: linha.categoria,
        icone: payload.icone,
        versao: linha.versao,
        origem: linha.origem,
        etapas: payload.etapas,
      };
    });
  }

  function obter(id) {
    const linha = obterStmt.get(id);
    return linha ? JSON.parse(linha.payload_json) : null;
  }

  function obterOuFalhar(id) {
    const preset = obter(id);
    if (!preset) throw new ErroForge('FORGE_NOT_FOUND', 'Esse menu não existe.');
    return preset;
  }

  return { listar, obter, obterOuFalhar };
}
