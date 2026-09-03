#!/usr/bin/env node
// Estimador de terminal da skill low-cost-efficiency. Mesmo motor do Forge, sem subir servidor.
//
//   node .claude/skills/low-cost-efficiency/scripts/estimar.mjs --intencao site --etapa identidade-redigir
//   node .claude/skills/low-cost-efficiency/scripts/estimar.mjs --intencao aplicacao --todas
//   node .claude/skills/low-cost-efficiency/scripts/estimar.mjs --descricao "landing page com SEO"
//   node .claude/skills/low-cost-efficiency/scripts/estimar.mjs --simular entrada=3000 saida=1000 chamadas=60 cache=sim lote=nao
//
// Saída em texto para leitura; --json imprime o objeto bruto para outro programa consumir.
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../');
const motor = await import(path.join(RAIZ, 'shared/eficiencia/motor.js'));
const { CATALOGO, PERFIS, inferirIntencao, recomendar, recomendarTodas, simularMensal } = motor;

function lerArgumentos(argv) {
  const opcoes = { extras: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const atual = argv[i];
    if (atual.startsWith('--')) {
      const chave = atual.slice(2);
      const proximo = argv[i + 1];
      if (proximo === undefined || proximo.startsWith('--')) opcoes[chave] = true;
      else {
        opcoes[chave] = proximo;
        i += 1;
      }
    } else {
      opcoes.extras.push(atual);
    }
  }
  return opcoes;
}

const usd = (valor) => `US$ ${valor.toFixed(4)}`;

function imprimirRecomendacao(rec) {
  console.log(`\n${rec.etapa} (${rec.classe}): ${rec.descricao}`);
  console.log(`  Modelo: ${rec.modelo.id} [${rec.modelo.tier}]  esforço: ${rec.esforco ?? 'não se aplica'}  max_tokens: ${rec.maxTokens}`);
  console.log(`  Cache: ${rec.cache.escopo} por ${rec.cache.ttl}  |  escalada: ${rec.escalarPara.id}`);
  console.log(`  Chamada típica (${rec.chamadaTipica.entrada} entrada / ${rec.chamadaTipica.saida} saída): ${usd(rec.custoTipicoUsd)}, ${usd(rec.custoTipicoComCacheUsd)} com cache, ${usd(rec.custoEscaladaUsd)} na escalada`);
  console.log(`  Motivo: ${rec.motivo}`);
  console.log('  Alternativas:');
  for (const alt of rec.alternativas) {
    const marca = alt.id === rec.modelo.id ? ' ← recomendado' : '';
    console.log(`    ${alt.id.padEnd(20)} ${usd(alt.custoTipicoUsd)}  (${usd(alt.custoTipicoComCacheUsd)} com cache)${marca}`);
  }
}

function imprimirSimulacao(parametros) {
  const linhas = simularMensal(parametros);
  console.log(`\nSimulação mensal: ${parametros.tokensEntrada} entrada, ${parametros.tokensSaida} saída, ${parametros.chamadasPorMes} chamadas, cache ${parametros.cache ? 'ligado' : 'desligado'}, lote ${parametros.lote ? 'ligado' : 'desligado'}`);
  for (const linha of linhas) {
    const teto = linha.percentualDoTeto === null ? '' : `  ${linha.percentualDoTeto}% do teto`;
    console.log(`  ${linha.id.padEnd(20)} ${usd(linha.custoPorChamadaUsd)} por chamada  ${usd(linha.custoMensalUsd)} por mês${teto}`);
  }
}

function principal() {
  const opcoes = lerArgumentos(process.argv.slice(2));
  const saidaJson = opcoes.json === true;

  if (opcoes.simular !== undefined) {
    const pares = Object.fromEntries([opcoes.simular, ...opcoes.extras].filter((p) => typeof p === 'string' && p.includes('=')).map((p) => p.split('=')));
    const parametros = {
      tokensEntrada: Number(pares.entrada ?? 3000),
      tokensSaida: Number(pares.saida ?? 1000),
      chamadasPorMes: Number(pares.chamadas ?? 60),
      cache: (pares.cache ?? 'sim') !== 'nao',
      lote: (pares.lote ?? 'nao') === 'sim',
      tetoUsd: pares.teto !== undefined ? Number(pares.teto) : 5,
    };
    if (saidaJson) console.log(JSON.stringify(simularMensal(parametros), null, 2));
    else imprimirSimulacao(parametros);
    return;
  }

  let intencao = typeof opcoes.intencao === 'string' ? opcoes.intencao : null;
  let inferencia = null;
  if (!intencao) {
    inferencia = inferirIntencao({ descricao: typeof opcoes.descricao === 'string' ? opcoes.descricao : opcoes.extras.join(' ') });
    intencao = inferencia.intencao;
  }

  const etapa = typeof opcoes.etapa === 'string' ? opcoes.etapa : null;
  const resultado = etapa ? recomendar({ intencao, etapa }) : recomendarTodas(intencao);

  if (saidaJson) {
    console.log(JSON.stringify({ inferencia, resultado }, null, 2));
    return;
  }

  console.log(`Catálogo v${CATALOGO.versao} (${CATALOGO.atualizado_em}), perfis v${PERFIS.versao}`);
  if (inferencia) {
    const sinais = inferencia.sinais.length > 0 ? ` sinais: ${inferencia.sinais.join(', ')}` : '';
    console.log(`Intenção inferida: ${inferencia.intencao} (confiança ${inferencia.confianca}, origem ${inferencia.origem})${sinais}`);
  } else {
    console.log(`Intenção: ${intencao}`);
  }
  if (etapa) {
    imprimirRecomendacao(resultado);
  } else {
    console.log(`${resultado.nome}: ${resultado.descricao}`);
    for (const rec of resultado.etapas) imprimirRecomendacao(rec);
    const total = resultado.etapas.reduce((soma, rec) => soma + rec.custoTipicoUsd, 0);
    const totalCache = resultado.etapas.reduce((soma, rec) => soma + rec.custoTipicoComCacheUsd, 0);
    console.log(`\nProjeto completo pelo wizard (seis etapas, uma chamada cada): ${usd(total)} sem cache, ${usd(totalCache)} com cache.`);
  }
}

try {
  principal();
} catch (erro) {
  console.error(`${erro.codigo ?? 'ERRO'}: ${erro.message}`);
  process.exit(1);
}
