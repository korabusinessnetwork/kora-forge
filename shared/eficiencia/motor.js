// Motor de eficiência: funções puras, sem I/O, usadas pelo servidor, pelo front e pela skill.
// Princípio nº 2: mesma entrada, mesma saída. Preço e perfil são dado versionado, nunca
// buscados em runtime. Nenhuma função aqui depende de LLM.
import {
  catalogoSchema,
  perfisSchema,
  ETAPAS_COPILOTO,
} from '../schemas/eficiencia.js';
import catalogoBruto from './catalogo-modelos.json' with { type: 'json' };
import perfisBruto from './perfis.json' with { type: 'json' };

export const CATALOGO = Object.freeze(catalogoSchema.parse(catalogoBruto));
export const PERFIS = Object.freeze(perfisSchema.parse(perfisBruto));

// Abaixo disso o ranking avisa "amostra pequena": um acerto ou erro isolado distorce a taxa.
export const AMOSTRA_MINIMA = 5;
// Fração do prefixo que o simulador assume servida do cache quando o cache está ligado.
export const FRACAO_CACHE_PADRAO = 0.6;

// Erro de domínio do motor. O servidor converte em ErroForge; o front mostra a mensagem.
export class ErroEficiencia extends Error {
  constructor(codigo, mensagem, detalhe = {}) {
    super(mensagem);
    this.name = 'ErroEficiencia';
    this.codigo = codigo;
    this.detalhe = detalhe;
  }
}

function invalido(caminho, mensagem) {
  return new ErroEficiencia('FORGE_VALIDATION', mensagem, { issues: [{ caminho, mensagem }] });
}

export function arredondar(valor, casas = 6) {
  const fator = 10 ** casas;
  return Math.round(valor * fator) / fator;
}

export function obterModelo(id, catalogo = CATALOGO) {
  const modelo = catalogo.modelos.find((m) => m.id === id);
  if (!modelo) throw invalido('modelo', `Modelo fora do catálogo: ${id}. Veja shared/eficiencia/catalogo-modelos.json.`);
  return modelo;
}

function tokens(valor, caminho) {
  if (valor === undefined || valor === null) return 0;
  if (typeof valor !== 'number' || !Number.isFinite(valor) || valor < 0) {
    throw invalido(caminho, 'Quantidade de tokens precisa ser um número maior ou igual a zero.');
  }
  return valor;
}

// Custo de uma chamada pelos quatro medidores da API (entrada, saída, leitura e escrita de cache),
// com o desconto de lote quando a chamada foi pelo Batch API. Resultado em USD com 6 casas.
export function calcularCustoUsd(chamada, catalogo = CATALOGO) {
  const modelo = obterModelo(chamada.modelo, catalogo);
  const preco = modelo.preco;
  const entrada = tokens(chamada.tokensEntrada, 'tokensEntrada');
  const saida = tokens(chamada.tokensSaida, 'tokensSaida');
  const cacheLeitura = tokens(chamada.tokensCacheLeitura, 'tokensCacheLeitura');
  const cacheEscrita = tokens(chamada.tokensCacheEscrita, 'tokensCacheEscrita');
  const precoEscrita = chamada.cacheTtl === '1h' ? preco.cache_escrita_1h : preco.cache_escrita_5m;
  const bruto = (entrada * preco.entrada + saida * preco.saida + cacheLeitura * preco.cache_leitura + cacheEscrita * precoEscrita) / 1e6;
  return arredondar(chamada.lote ? bruto * catalogo.lote_desconto : bruto);
}

export function normalizarTexto(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function contemSinal(texto, sinal) {
  const escapado = sinal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${escapado}([^a-z0-9]|$)`).test(texto);
}

// A intenção da aplicação vem do preset quando existe (confiança alta). Sem preset, casa os
// sinais do perfil na descrição livre (média). Sem sinal, cai no padrão do perfil (baixa).
export function inferirIntencao({ categoriaPreset = null, descricao = '' } = {}, perfis = PERFIS) {
  if (categoriaPreset) {
    const achada = Object.entries(perfis.intencoes).find(([, perfil]) => perfil.categoria_preset === categoriaPreset);
    if (achada) return { intencao: achada[0], confianca: 'alta', origem: 'preset', sinais: [] };
  }
  const texto = normalizarTexto(descricao);
  let melhor = null;
  for (const [id, perfil] of Object.entries(perfis.intencoes)) {
    const sinais = perfil.sinais.filter((sinal) => contemSinal(texto, normalizarTexto(sinal)));
    if (sinais.length > 0 && (melhor === null || sinais.length > melhor.sinais.length)) melhor = { intencao: id, sinais };
  }
  if (melhor) return { ...melhor, confianca: 'media', origem: 'descricao' };
  return { intencao: perfis.intencao_padrao, confianca: 'baixa', origem: 'padrao', sinais: [] };
}

export function custoChamadaTipica(modeloId, chamadaTipica, { comCache = false, catalogo = CATALOGO } = {}) {
  const { entrada, saida, fracao_cache: fracaoCache } = chamadaTipica;
  if (!comCache) return calcularCustoUsd({ modelo: modeloId, tokensEntrada: entrada, tokensSaida: saida }, catalogo);
  const lidos = Math.round(entrada * fracaoCache);
  return calcularCustoUsd({ modelo: modeloId, tokensEntrada: entrada - lidos, tokensSaida: saida, tokensCacheLeitura: lidos }, catalogo);
}

function resumo(id, catalogo) {
  const modelo = obterModelo(id, catalogo);
  return { id: modelo.id, nome: modelo.nome, tier: modelo.tier };
}

// Recomendação determinística por intenção e etapa, com o custo da chamada típica no modelo
// recomendado, no modelo de escalada e em todas as alternativas do catálogo, da mais barata à mais cara.
export function recomendar({ intencao, etapa }, { catalogo = CATALOGO, perfis = PERFIS } = {}) {
  const perfil = perfis.intencoes[intencao];
  if (!perfil) throw invalido('intencao', `Intenção desconhecida: ${intencao}. Use uma de ${Object.keys(perfis.intencoes).join(', ')}.`);
  const definicao = perfis.etapas[etapa];
  if (!definicao) throw invalido('etapa', `Etapa desconhecida: ${etapa}. Use uma de ${ETAPAS_COPILOTO.join(', ')}.`);
  const regra = perfil.etapas[etapa];
  const tipica = definicao.chamada_tipica;
  const alternativas = catalogo.modelos
    .map((modelo) => ({
      id: modelo.id,
      nome: modelo.nome,
      tier: modelo.tier,
      custoTipicoUsd: custoChamadaTipica(modelo.id, tipica, { catalogo }),
      custoTipicoComCacheUsd: custoChamadaTipica(modelo.id, tipica, { comCache: true, catalogo }),
    }))
    .sort((a, b) => a.custoTipicoUsd - b.custoTipicoUsd || a.id.localeCompare(b.id));
  return {
    intencao,
    etapa,
    classe: definicao.classe,
    descricao: definicao.descricao,
    modelo: resumo(regra.modelo, catalogo),
    escalarPara: resumo(regra.escalar_para, catalogo),
    esforco: regra.esforco,
    maxTokens: regra.max_tokens,
    cache: regra.cache,
    motivo: regra.motivo,
    chamadaTipica: { entrada: tipica.entrada, saida: tipica.saida, fracaoCache: tipica.fracao_cache },
    custoTipicoUsd: custoChamadaTipica(regra.modelo, tipica, { catalogo }),
    custoTipicoComCacheUsd: custoChamadaTipica(regra.modelo, tipica, { comCache: true, catalogo }),
    custoEscaladaUsd: custoChamadaTipica(regra.escalar_para, tipica, { catalogo }),
    alternativas,
  };
}

export function recomendarTodas(intencao, opcoes = {}) {
  const perfis = opcoes.perfis ?? PERFIS;
  const perfil = perfis.intencoes[intencao];
  if (!perfil) throw invalido('intencao', `Intenção desconhecida: ${intencao}. Use uma de ${Object.keys(perfis.intencoes).join(', ')}.`);
  return {
    intencao,
    nome: perfil.nome,
    descricao: perfil.descricao,
    etapas: ETAPAS_COPILOTO.map((etapa) => recomendar({ intencao, etapa }, opcoes)),
  };
}

function media(valores) {
  return valores.length === 0 ? null : arredondar(valores.reduce((soma, v) => soma + v, 0) / valores.length, 2);
}

// Ranking por eficiência observada: sucessos por dólar, relativo ao melhor modelo (100).
// Chamada que falhou ainda custa (o token foi gasto), mas não conta como sucesso.
export function ranquear(chamadas, catalogo = CATALOGO) {
  const grupos = new Map();
  for (const chamada of chamadas) {
    const grupo = grupos.get(chamada.modelo) ?? { modelo: chamada.modelo, chamadas: 0, sucessos: 0, custoTotalUsd: 0, duracoes: [] };
    grupo.chamadas += 1;
    if (chamada.estado === 'sucesso') grupo.sucessos += 1;
    grupo.custoTotalUsd += Number(chamada.custoEstimadoUsd) || 0;
    if (typeof chamada.duracaoMs === 'number' && Number.isFinite(chamada.duracaoMs)) grupo.duracoes.push(chamada.duracaoMs);
    grupos.set(chamada.modelo, grupo);
  }

  const linhas = [...grupos.values()].map((grupo) => {
    const noCatalogo = catalogo.modelos.find((m) => m.id === grupo.modelo);
    const custoTotalUsd = arredondar(grupo.custoTotalUsd);
    let sucessosPorDolar = 0;
    if (grupo.sucessos > 0) sucessosPorDolar = custoTotalUsd > 0 ? arredondar(grupo.sucessos / custoTotalUsd, 2) : null;
    return {
      modelo: grupo.modelo,
      nome: noCatalogo?.nome ?? grupo.modelo,
      tier: noCatalogo?.tier ?? null,
      chamadas: grupo.chamadas,
      sucessos: grupo.sucessos,
      taxaSucesso: arredondar(grupo.sucessos / grupo.chamadas, 4),
      custoTotalUsd,
      custoMedioUsd: arredondar(custoTotalUsd / grupo.chamadas),
      custoPorSucessoUsd: grupo.sucessos > 0 ? arredondar(custoTotalUsd / grupo.sucessos) : null,
      sucessosPorDolar,
      duracaoMediaMs: media(grupo.duracoes),
      pontuacao: 0,
      amostraPequena: grupo.chamadas < AMOSTRA_MINIMA,
    };
  });

  const finitos = linhas.map((l) => l.sucessosPorDolar).filter((v) => typeof v === 'number');
  const maximo = finitos.length > 0 ? Math.max(...finitos) : 0;
  for (const linha of linhas) {
    if (linha.sucessosPorDolar === null) linha.pontuacao = 100;
    else linha.pontuacao = maximo > 0 ? Math.round((linha.sucessosPorDolar / maximo) * 100) : 0;
  }

  return linhas.sort((a, b) => b.pontuacao - a.pontuacao || a.custoMedioUsd - b.custoMedioUsd || a.modelo.localeCompare(b.modelo));
}

export function agruparPorEtapa(chamadas) {
  const grupos = new Map();
  for (const chamada of chamadas) {
    const grupo = grupos.get(chamada.etapa) ?? { etapa: chamada.etapa, chamadas: 0, sucessos: 0, custoTotalUsd: 0, modelos: new Map() };
    grupo.chamadas += 1;
    if (chamada.estado === 'sucesso') grupo.sucessos += 1;
    grupo.custoTotalUsd += Number(chamada.custoEstimadoUsd) || 0;
    grupo.modelos.set(chamada.modelo, (grupo.modelos.get(chamada.modelo) ?? 0) + 1);
    grupos.set(chamada.etapa, grupo);
  }
  return [...grupos.values()]
    .map((grupo) => {
      const maisUsado = [...grupo.modelos.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
      return {
        etapa: grupo.etapa,
        chamadas: grupo.chamadas,
        sucessos: grupo.sucessos,
        custoTotalUsd: arredondar(grupo.custoTotalUsd),
        modeloMaisUsado: maisUsado ? maisUsado[0] : null,
      };
    })
    .sort((a, b) => b.custoTotalUsd - a.custoTotalUsd || a.etapa.localeCompare(b.etapa));
}

// Painel completo a partir das chamadas já filtradas por período e intenção.
export function resumirPainel({ chamadas, tetoUsd, periodo, intencao }, catalogo = CATALOGO) {
  const ranking = ranquear(chamadas, catalogo);
  const custoUsd = arredondar(chamadas.reduce((soma, c) => soma + (Number(c.custoEstimadoUsd) || 0), 0));
  const sucessos = chamadas.filter((c) => c.estado === 'sucesso').length;
  const melhor = ranking.find((linha) => linha.sucessos > 0) ?? null;
  return {
    periodo,
    intencao,
    tetoUsd,
    totais: {
      chamadas: chamadas.length,
      sucessos,
      taxaSucesso: chamadas.length > 0 ? arredondar(sucessos / chamadas.length, 4) : 0,
      custoUsd,
      percentualDoTeto: tetoUsd > 0 ? arredondar((custoUsd / tetoUsd) * 100, 1) : null,
    },
    melhorModelo: melhor ? melhor.modelo : null,
    ranking,
    porEtapa: agruparPorEtapa(chamadas),
  };
}

// Simulador: custo mensal por modelo para um volume hipotético, do mais barato ao mais caro.
// Com cache ligado, assume que uma fração do prefixo de entrada é lida do cache (estimativa otimista).
export function simularMensal({ tokensEntrada, tokensSaida, chamadasPorMes, cache = true, fracaoCache = FRACAO_CACHE_PADRAO, lote = false, tetoUsd = null }, catalogo = CATALOGO) {
  const entrada = tokens(tokensEntrada, 'tokensEntrada');
  const saida = tokens(tokensSaida, 'tokensSaida');
  const chamadas = tokens(chamadasPorMes, 'chamadasPorMes');
  const lidos = cache ? Math.round(entrada * fracaoCache) : 0;
  return catalogo.modelos
    .map((modelo) => {
      const custoPorChamadaUsd = calcularCustoUsd({
        modelo: modelo.id,
        tokensEntrada: entrada - lidos,
        tokensSaida: saida,
        tokensCacheLeitura: lidos,
        lote,
      }, catalogo);
      const custoMensalUsd = arredondar(custoPorChamadaUsd * chamadas);
      return {
        id: modelo.id,
        nome: modelo.nome,
        tier: modelo.tier,
        custoPorChamadaUsd,
        custoMensalUsd,
        percentualDoTeto: typeof tetoUsd === 'number' && tetoUsd > 0 ? arredondar((custoMensalUsd / tetoUsd) * 100, 1) : null,
      };
    })
    .sort((a, b) => a.custoMensalUsd - b.custoMensalUsd || a.id.localeCompare(b.id));
}
