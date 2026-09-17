import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { ErroForge } from '../../lib/erro.js';
import { garantirDentro, inspecionar, resolverNoWorkspace } from '../../lib/caminhos.js';
import { CODIGOS_ERRO } from '../../../shared/erros.js';
import { renderizar } from '../../../shared/template.js';
import { ESTADOS_ITEM, podeTransicionar } from '../../../shared/reforja/estados.js';
import { calcularSinais, resumirSinais, prioridadeDaSeveridade, LIMITE_LINHAS, LIMITE_EVIDENCIAS } from '../../../shared/reforja/sinais.js';
import { caminhoDaSpec, montarSpec, PASTA_SPECS } from '../../../shared/reforja/spec.js';
import { interpretarPropostas, LIMITES_PROPOSTA } from '../../../shared/reforja/propostas.js';
import { resumirParaModelo } from '../../../shared/reforja/resumo.js';
import { varrerForge, LIMITE_BYTES_ARQUIVO } from './varredura.js';
import { carregarTemplatesReforja } from './templates.js';

// Auto-Reforja (ADR-014): diagnóstico do próprio Forge, backlog com o ciclo do harness, spec por
// template com prévia, e sugestão opcional por modelo gratuito. Nada aqui depende do modelo para
// funcionar, e item nunca é apagado.
export const RAIZ_FORGE = fileURLToPath(new URL('../../../', import.meta.url));

// A intenção do contrato de modelos (D08). O Forge é uma aplicação local.
export const INTENCAO_SUGESTAO = 'local';

const CAMPOS = 'id, titulo, descricao, origem, sinal, estado, prioridade, spec_caminho, criado_em, atualizado_em';

function paraItem(linha) {
  return {
    id: linha.id,
    titulo: linha.titulo,
    descricao: linha.descricao,
    origem: linha.origem,
    sinal: linha.sinal,
    estado: linha.estado,
    prioridade: linha.prioridade,
    specCaminho: linha.spec_caminho,
    criadoEm: linha.criado_em,
    atualizadoEm: linha.atualizado_em,
  };
}

function ouNulo(texto) {
  const limpo = typeof texto === 'string' ? texto.trim() : '';
  return limpo === '' ? null : limpo;
}

// Os códigos de modelos pertencem à frente T08. Enquanto não estiverem registrados, o erro sai com
// um código existente de sentido próximo e o pretendido vai no detalhe (ADR-014, códigos de erro).
const RESERVA_MODELOS = Object.freeze({
  FORGE_MODELOS_DESLIGADO: 'FORGE_COPILOT_DISABLED',
  FORGE_MODELOS_INDISPONIVEL: 'FORGE_TOOL_MISSING',
});

const MENSAGENS_MODELOS = Object.freeze({
  FORGE_MODELOS_DESLIGADO: 'Os modelos gratuitos estão desligados. Ligue em Configurações.',
  FORGE_MODELOS_INDISPONIVEL: 'O gateway de modelos gratuitos não respondeu. Confira em Configurações.',
});

export function erroDeModelos(codigo) {
  const pretendido = Object.hasOwn(RESERVA_MODELOS, codigo) ? codigo : 'FORGE_MODELOS_INDISPONIVEL';
  const mensagem = MENSAGENS_MODELOS[pretendido];
  if (Object.hasOwn(CODIGOS_ERRO, pretendido)) return new ErroForge(pretendido, mensagem);
  return new ErroForge(RESERVA_MODELOS[pretendido], mensagem, { codigoPretendido: pretendido });
}

export function criarServicoReforja({ db, registrarEvento = () => true, modelos = null, raizForge = RAIZ_FORGE, templates = carregarTemplatesReforja() }) {
  // Caminho real, para a comparação com o destino de um symlink não falhar por atalho na raiz.
  const raiz = fs.existsSync(raizForge) ? fs.realpathSync(path.resolve(raizForge)) : path.resolve(raizForge);
  const stmts = {
    inserir: db.prepare(`INSERT INTO reforge_items (${CAMPOS}) VALUES (@id, @titulo, @descricao, @origem, @sinal, @estado, @prioridade, @spec_caminho, @criado_em, @atualizado_em)`),
    porId: db.prepare(`SELECT ${CAMPOS} FROM reforge_items WHERE id = ?`),
    todos: db.prepare(`SELECT ${CAMPOS} FROM reforge_items ORDER BY CASE prioridade WHEN 'alta' THEN 0 WHEN 'media' THEN 1 ELSE 2 END, criado_em ASC, rowid ASC`),
    abertoDoSinal: db.prepare(`SELECT ${CAMPOS} FROM reforge_items WHERE sinal = ? AND estado NOT IN ('concluida', 'descartada') ORDER BY criado_em ASC, rowid ASC LIMIT 1`),
    mudarEstado: db.prepare('UPDATE reforge_items SET estado = @estado, atualizado_em = @atualizado_em WHERE id = @id'),
    gravarSpec: db.prepare('UPDATE reforge_items SET spec_caminho = @spec_caminho, estado = @estado, atualizado_em = @atualizado_em WHERE id = @id'),
  };

  function obterOuFalhar(id) {
    const linha = stmts.porId.get(id);
    if (!linha) throw new ErroForge('FORGE_NOT_FOUND', 'Melhoria não encontrada.');
    return paraItem(linha);
  }

  // Diagnóstico

  function diagnosticar() {
    const arquivos = varrerForge(raiz);
    const sinais = calcularSinais(arquivos);
    return {
      sinais,
      resumo: resumirSinais(sinais),
      arquivosLidos: arquivos.length,
      limites: { linhas: LIMITE_LINHAS, bytes: LIMITE_BYTES_ARQUIVO, evidencias: LIMITE_EVIDENCIAS },
    };
  }

  // Backlog

  function inserir({ titulo, descricao, origem, sinal = null, prioridade = 'media' }) {
    const agora = new Date().toISOString();
    const linha = {
      id: randomUUID(),
      titulo: titulo.trim(),
      descricao: ouNulo(descricao),
      origem,
      sinal,
      estado: 'proposta',
      prioridade,
      spec_caminho: null,
      criado_em: agora,
      atualizado_em: agora,
    };
    stmts.inserir.run(linha);
    registrarEvento('reforja.item_criado', { itemId: linha.id, origem, sinal, prioridade });
    return paraItem(linha);
  }

  function criar({ titulo, descricao, prioridade = 'media', origem = 'manual' }) {
    return inserir({ titulo, descricao, prioridade, origem });
  }

  function transformarSinal(sinalId) {
    const existente = stmts.abertoDoSinal.get(sinalId);
    if (existente) return { item: paraItem(existente), criado: false };
    const sinal = diagnosticar().sinais.find((candidato) => candidato.id === sinalId);
    if (!sinal) throw new ErroForge('FORGE_NOT_FOUND', 'Esse sinal não aparece mais no diagnóstico. Rode o diagnóstico de novo.');
    const item = inserir({
      titulo: sinal.titulo,
      descricao: sinal.sugestao,
      origem: 'diagnostico',
      sinal: sinal.id,
      prioridade: prioridadeDaSeveridade(sinal.severidade),
    });
    return { item, criado: true };
  }

  function listar() {
    const itens = stmts.todos.all().map(paraItem);
    const contagem = Object.fromEntries(ESTADOS_ITEM.map((estado) => [estado, 0]));
    for (const item of itens) contagem[item.estado] += 1;
    return { itens, contagem };
  }

  // Repetir a mesma transição é idempotente: duas abas na mesma página são caso normal.
  function mudarEstado(id, para) {
    const atual = obterOuFalhar(id);
    if (atual.estado === para) return atual;
    if (!podeTransicionar(atual.estado, para)) {
      throw new ErroForge('FORGE_CONFLICT', 'Essa mudança de estado não faz parte do ciclo.', { de: atual.estado, para });
    }
    const atualizadoEm = new Date().toISOString();
    stmts.mudarEstado.run({ id, estado: para, atualizado_em: atualizadoEm });
    registrarEvento('reforja.estado_mudou', { itemId: id, de: atual.estado, para });
    return { ...atual, estado: para, atualizadoEm };
  }

  // Spec

  function resolverSpec(item) {
    const relativo = caminhoDaSpec(item);
    const absoluto = resolverNoWorkspace(raiz, relativo);
    // A pasta `specs` pode ser um symlink para fora: `inspecionar` recusa antes de qualquer escrita.
    inspecionar(raiz, path.join(raiz, PASTA_SPECS));
    const stat = inspecionar(raiz, absoluto);
    return { relativo, absoluto, existe: Boolean(stat) };
  }

  function exigirNaoDescartado(item) {
    if (item.estado === 'descartada') {
      throw new ErroForge('FORGE_CONFLICT', 'Melhoria descartada não gera spec. Restaure antes.', { estado: item.estado });
    }
  }

  function previaSpec(id) {
    const item = obterOuFalhar(id);
    exigirNaoDescartado(item);
    const { relativo, existe } = resolverSpec(item);
    return {
      caminho: relativo,
      conteudo: montarSpec(item, templates.spec),
      existe,
      versaoTemplate: templates.spec.manifesto.versao,
    };
  }

  function gerarSpec(id, { sobrescrever = false } = {}) {
    const item = obterOuFalhar(id);
    exigirNaoDescartado(item);
    const { relativo, absoluto, existe } = resolverSpec(item);
    if (existe && sobrescrever !== true) {
      throw new ErroForge('FORGE_CONFLICT', 'Já existe uma spec nesse caminho. Confirme a sobrescrita para gravar.', { caminho: relativo });
    }
    const conteudo = montarSpec(item, templates.spec);
    const pasta = path.dirname(absoluto);
    garantirDentro(raiz, pasta);
    fs.mkdirSync(pasta, { recursive: true });
    inspecionar(raiz, pasta);
    try {
      fs.writeFileSync(absoluto, conteudo, { encoding: 'utf8', flag: existe ? 'w' : 'wx' });
    } catch (erro) {
      if (erro?.code === 'EEXIST') {
        throw new ErroForge('FORGE_CONFLICT', 'Já existe uma spec nesse caminho. Confirme a sobrescrita para gravar.', { caminho: relativo });
      }
      throw erro;
    }
    const estado = item.estado === 'proposta' ? 'especificada' : item.estado;
    const atualizadoEm = new Date().toISOString();
    stmts.gravarSpec.run({ id, spec_caminho: relativo, estado, atualizado_em: atualizadoEm });
    registrarEvento('reforja.spec_gerada', { itemId: id, sobrescrito: existe, versaoTemplate: templates.spec.manifesto.versao });
    if (estado !== item.estado) registrarEvento('reforja.estado_mudou', { itemId: id, de: item.estado, para: estado });
    return { item: { ...item, specCaminho: relativo, estado, atualizadoEm }, caminho: relativo, sobrescrito: existe };
  }

  // Sugestão por modelo gratuito: enfeite, nunca engrenagem

  async function estadoSugestoes() {
    if (!modelos || typeof modelos.estado !== 'function' || typeof modelos.completar !== 'function') {
      return { disponivel: false, motivo: 'sem_modelos' };
    }
    let estado = null;
    try {
      estado = await modelos.estado();
    } catch {
      estado = null;
    }
    if (estado && estado.ligado !== true) return { disponivel: false, motivo: 'desligado' };
    if (!estado || estado.conectado !== true) return { disponivel: false, motivo: 'desconectado' };
    return { disponivel: true, motivo: null };
  }

  async function pedirSugestoes() {
    const { disponivel, motivo } = await estadoSugestoes();
    if (!disponivel) throw erroDeModelos(motivo === 'desligado' ? 'FORGE_MODELOS_DESLIGADO' : 'FORGE_MODELOS_INDISPONIVEL');

    const { manifesto, sistema, usuario } = templates.sugestao;
    const mensagens = [
      {
        papel: 'sistema',
        texto: renderizar(sistema, {
          MAXIMO: LIMITES_PROPOSTA.maximo,
          LIMITE_TITULO: LIMITES_PROPOSTA.titulo,
          LIMITE_DESCRICAO: LIMITES_PROPOSTA.descricao,
        }, `${manifesto.id}/sistema.md`),
      },
      {
        papel: 'usuario',
        texto: renderizar(usuario, { RESUMO: resumirParaModelo(diagnosticar().sinais) }, `${manifesto.id}/usuario.md`),
      },
    ];

    let resposta;
    try {
      resposta = await modelos.completar({ intencao: INTENCAO_SUGESTAO, mensagens, maxTokens: manifesto.maxTokens });
    } catch (erro) {
      // A mensagem original pode carregar corpo de resposta externa: nunca sai daqui.
      throw erroDeModelos(erro?.codigo);
    }

    const { propostas, descartadas, formatoReconhecido } = interpretarPropostas(resposta?.texto);
    const modelo = typeof resposta?.modelo === 'string' && resposta.modelo.trim() !== '' ? resposta.modelo.trim().slice(0, 120) : null;
    registrarEvento('reforja.sugestoes_recebidas', { modelo, propostas: propostas.length, descartadas, formatoReconhecido });
    return { propostas, descartadas, formatoReconhecido, modelo };
  }

  return {
    diagnosticar,
    criar,
    transformarSinal,
    listar,
    obterOuFalhar,
    mudarEstado,
    previaSpec,
    gerarSpec,
    estadoSugestoes,
    pedirSugestoes,
  };
}
