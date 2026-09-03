import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { manifestoTemplateSchema } from '../../../shared/schemas/plano.js';
import { COMANDOS_PERMITIDOS } from '../../../shared/comandos.js';
import { montarContexto } from '../../../shared/contexto.js';
import { montarValores } from '../../../shared/valores.js';
import { renderizar } from '../../../shared/template.js';
import { serializarEstavel } from '../../../shared/serializar.js';
import { avaliarCondicao } from '../../../shared/avaliador.js';
import { ErroForge } from '../../lib/erro.js';
import { formatarIssues } from '../../lib/validar.js';
import { resolverNoWorkspace, inspecionar } from '../../lib/caminhos.js';
import { compararTexto } from '../../../shared/ordenar.js';

export const PASTA_TEMPLATES_BUILTIN = fileURLToPath(new URL('../../../templates/', import.meta.url));
const TIMEOUT_PADRAO_MS = 600000;

function erroCampo(caminho, mensagem) {
  return new ErroForge('FORGE_VALIDATION', mensagem, { issues: [{ caminho, mensagem }] });
}

function listarArquivos(raiz, prefixo = '') {
  const entradas = fs.readdirSync(path.join(raiz, prefixo), { withFileTypes: true }).sort((a, b) => compararTexto(a.name, b.name));
  return entradas.flatMap((entrada) => {
    const relativo = prefixo ? `${prefixo}/${entrada.name}` : entrada.name;
    return entrada.isDirectory() ? listarArquivos(raiz, relativo) : [relativo];
  });
}

// Template é dado versionado. Manifesto fora do contrato derruba o boot, como preset e regra.
export function carregarTemplatesBuiltin(pasta = PASTA_TEMPLATES_BUILTIN) {
  const ids = fs.readdirSync(pasta, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
  return ids.map((id) => {
    let bruto;
    try {
      bruto = JSON.parse(fs.readFileSync(path.join(pasta, id, 'template.json'), 'utf8'));
    } catch (erro) {
      throw new ErroForge('FORGE_VALIDATION', `Template ${id}: template.json inválido.`, { issues: [{ caminho: `${id}/template.json`, mensagem: erro.message }] });
    }
    const resultado = manifestoTemplateSchema.safeParse(bruto);
    if (!resultado.success) {
      throw new ErroForge('FORGE_VALIDATION', `Template ${id} fora do contrato.`, {
        issues: formatarIssues(resultado.error).map((issue) => ({ ...issue, caminho: `${id}/template.json:${issue.caminho}` })),
      });
    }
    if (resultado.data.id !== id) {
      throw new ErroForge('FORGE_VALIDATION', `Template ${id}: o id do manifesto não bate com a pasta.`, { issues: [{ caminho: `${id}/template.json`, mensagem: `id "${resultado.data.id}" na pasta "${id}"` }] });
    }
    const pastaArquivos = path.join(pasta, id, 'arquivos');
    if (!fs.existsSync(pastaArquivos)) {
      throw new ErroForge('FORGE_VALIDATION', `Template ${id}: falta a pasta arquivos/.`, { issues: [{ caminho: `${id}/arquivos`, mensagem: 'pasta ausente' }] });
    }
    const arquivos = listarArquivos(pastaArquivos).map((relativo) => ({
      destino: relativo,
      conteudo: fs.readFileSync(path.join(pastaArquivos, relativo), 'utf8'),
    }));
    return { ...resultado.data, arquivos };
  });
}

const tamanhoEm = (texto) => Buffer.byteLength(texto, 'utf8');

export function criarServicoGerador({ regras, templates = carregarTemplatesBuiltin() }) {
  const porId = new Map(templates.map((template) => [template.id, template]));

  // Templates do preset mais os que as regras pedem, menos os que elas removem. Hit dispensado
  // ou ignorado não contribui: o usuário disse que aquilo não se aplica aqui.
  function templatesPedidos({ preset, hits }) {
    const pedidos = [...preset.arvore];
    const removidos = new Set();
    for (const hit of hits) {
      for (const efeito of hit.efeitos) {
        if (efeito.tipo === 'adicionar_arquivo' && efeito.template) pedidos.push(efeito.template);
        if (efeito.tipo === 'remover_arquivo' && efeito.template) removidos.add(efeito.template);
      }
    }
    return [...new Set(pedidos)].filter((id) => !removidos.has(id));
  }

  function montarComandos(preset) {
    return preset.comandos.map((comando) => {
      if (!COMANDOS_PERMITIDOS.includes(comando.cmd)) {
        throw new ErroForge('FORGE_CMD_NOT_ALLOWED', `O comando "${comando.cmd}" não está na whitelist.`, { issues: [{ caminho: `comandos.${comando.id}`, mensagem: comando.cmd }] });
      }
      return {
        id: comando.id,
        cmd: comando.cmd,
        args: comando.args,
        obrigatorio: Boolean(comando.obrigatorio),
        longaDuracao: Boolean(comando.longa_duracao),
        timeoutMs: comando.timeout_ms ?? TIMEOUT_PADRAO_MS,
      };
    });
  }

  function gerarPlano({ projeto, preset, blueprint, workspace }) {
    if (projeto.status === 'arquivado') throw erroCampo('projeto', 'Projeto arquivado. Restaure antes de gerar o plano.');
    if (!workspace) throw erroCampo('workspace', 'Configure o workspace em Configurações antes de gerar o plano. É a pasta onde os projetos nascem.');
    if (!fs.existsSync(workspace)) throw erroCampo('workspace', 'A pasta do workspace não existe mais. Confira o caminho em Configurações.');

    const contexto = montarContexto({ projeto, preset, blueprint });
    const disparando = regras.catalogo().filter((regra) => avaliarCondicao(regra.quando, contexto));
    const estados = new Map(regras.listar(projeto.id).hits.map((hit) => [hit.regraId, hit.estado]));
    const bloqueios = disparando.filter((regra) => regra.severidade === 'bloqueio' && estados.get(regra.id) === 'aberto');
    if (bloqueios.length > 0) {
      throw new ErroForge('FORGE_PLAN_BLOQUEADO', 'Resolva os bloqueios abertos antes de gerar o plano.', {
        bloqueios: bloqueios.map((regra) => ({ regraId: regra.id, titulo: regra.titulo })),
      });
    }
    const hitsAtivos = disparando
      .filter((regra) => !['dispensado', 'ignorado'].includes(estados.get(regra.id)))
      .map((regra) => ({ regraId: regra.id, efeitos: regra.efeitos }));

    const raiz = resolverNoWorkspace(workspace, projeto.slug);
    const valores = montarValores(contexto, { data: blueprint.criadoEm.slice(0, 10), projeto, preset });

    const pendencias = [];
    const usados = templatesPedidos({ preset, hits: hitsAtivos })
      .map((id) => {
        const template = porId.get(id);
        if (!template) {
          pendencias.push({ tipo: 'template', item: id, motivo: 'Ainda não existe no catálogo do Forge. O plano segue sem ele.' });
          return null;
        }
        return template;
      })
      .filter(Boolean)
      .sort((a, b) => (a.ordem - b.ordem) || compararTexto(a.id, b.id));

    const porDestino = new Map();
    for (const template of usados) {
      for (const arquivo of template.arquivos) {
        const jaTem = porDestino.get(arquivo.destino);
        if (jaTem) {
          throw new ErroForge('FORGE_CONFLICT', `Dois templates escrevem o mesmo arquivo: ${arquivo.destino}.`, {
            issues: [{ caminho: arquivo.destino, mensagem: `${jaTem.template} e ${template.id}` }],
          });
        }
        porDestino.set(arquivo.destino, { template: template.id, conteudo: renderizar(arquivo.conteudo, valores, `${template.id}/${arquivo.destino}`) });
      }
    }

    const arquivos = [...porDestino.entries()]
      .sort(([a], [b]) => compararTexto(a, b))
      .map(([destino, { template, conteudo }]) => {
        const absoluto = resolverNoWorkspace(raiz, destino);
        const stat = inspecionar(raiz, absoluto);
        let acao = 'criar';
        let tamanhoAtual = null;
        if (stat?.isFile()) {
          tamanhoAtual = stat.size;
          acao = fs.readFileSync(absoluto, 'utf8') === conteudo ? 'pular' : 'sobrescrever';
        }
        return { caminho: destino, acao, tamanho: tamanhoEm(conteudo), tamanhoAtual, template, conteudo };
      });

    const hash = createHash('sha256').update(serializarEstavel({
      blueprint: blueprint.payload,
      preset: { id: preset.id, versao: preset.versao },
      templates: usados.map((template) => ({ id: template.id, versao: template.versao })),
    })).digest('hex');

    return {
      hashBlueprint: `sha256:${hash}`,
      raiz,
      arquivos,
      comandos: montarComandos(preset),
      pendencias,
      totais: {
        arquivos: arquivos.length,
        bytes: arquivos.reduce((soma, arquivo) => soma + arquivo.tamanho, 0),
        conflitos: arquivos.filter((arquivo) => arquivo.acao === 'sobrescrever').length,
        pulados: arquivos.filter((arquivo) => arquivo.acao === 'pular').length,
      },
    };
  }

  return { gerarPlano, templates: () => templates };
}
