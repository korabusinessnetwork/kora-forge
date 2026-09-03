import { describe, it, expect } from 'vitest';
import { ETAPAS_COPILOTO, INTENCOES, recomendacaoSchema, recomendacoesSchema, linhaRankingSchema, painelSchema } from '../schemas/eficiencia.js';
import {
  CATALOGO,
  PERFIS,
  AMOSTRA_MINIMA,
  calcularCustoUsd,
  inferirIntencao,
  recomendar,
  recomendarTodas,
  ranquear,
  agruparPorEtapa,
  resumirPainel,
  simularMensal,
  obterModelo,
} from './motor.js';

describe('catálogo e perfis', () => {
  it('carregam validados e cobrem toda etapa em toda intenção', () => {
    expect(CATALOGO.modelos.length).toBeGreaterThanOrEqual(4);
    expect(Object.keys(PERFIS.intencoes).sort()).toEqual([...INTENCOES].sort());
    for (const intencao of INTENCOES) {
      expect(Object.keys(PERFIS.intencoes[intencao].etapas).sort()).toEqual([...ETAPAS_COPILOTO].sort());
    }
  });

  it('todo modelo recomendado ou de escalada existe no catálogo e suporta o esforço pedido', () => {
    for (const perfil of Object.values(PERFIS.intencoes)) {
      for (const regra of Object.values(perfil.etapas)) {
        const modelo = obterModelo(regra.modelo);
        obterModelo(regra.escalar_para);
        if (regra.esforco === null) expect(modelo.esforcos).toEqual([]);
        else expect(modelo.esforcos).toContain(regra.esforco);
      }
    }
  });

  it('nenhuma etapa do copiloto recomenda o Fable: 5x o preço do Sonnet para texto curto', () => {
    for (const perfil of Object.values(PERFIS.intencoes)) {
      for (const regra of Object.values(perfil.etapas)) {
        expect(regra.modelo).not.toBe('claude-fable-5-1');
        expect(regra.escalar_para).not.toBe('claude-fable-5-1');
      }
    }
  });
});

describe('calcularCustoUsd', () => {
  it('aplica os quatro medidores e arredonda em 6 casas', () => {
    // Sonnet 5: 2 / 10 / 0.2 (leitura) / 2.5 (escrita 5m) por milhão.
    const custo = calcularCustoUsd({ modelo: 'claude-sonnet-5', tokensEntrada: 1000, tokensSaida: 500, tokensCacheLeitura: 2000, tokensCacheEscrita: 1000 });
    expect(custo).toBe(0.0099);
  });

  it('escrita de cache de 1 hora usa o preço de 1 hora', () => {
    const cincoMin = calcularCustoUsd({ modelo: 'claude-sonnet-5', tokensCacheEscrita: 1_000_000 });
    const umaHora = calcularCustoUsd({ modelo: 'claude-sonnet-5', tokensCacheEscrita: 1_000_000, cacheTtl: '1h' });
    expect(cincoMin).toBe(2.5);
    expect(umaHora).toBe(4);
  });

  it('lote desconta 50% e tudo zero custa zero, nunca NaN', () => {
    expect(calcularCustoUsd({ modelo: 'claude-opus-5', tokensEntrada: 1_000_000, lote: true })).toBe(2.5);
    expect(calcularCustoUsd({ modelo: 'claude-haiku-4-5' })).toBe(0);
  });

  it('modelo fora do catálogo e token negativo lançam FORGE_VALIDATION apontando o campo', () => {
    expect(() => calcularCustoUsd({ modelo: 'gpt-x' })).toThrow(expect.objectContaining({ codigo: 'FORGE_VALIDATION' }));
    try {
      calcularCustoUsd({ modelo: 'claude-sonnet-5', tokensSaida: -1 });
      throw new Error('não lançou');
    } catch (erro) {
      expect(erro.codigo).toBe('FORGE_VALIDATION');
      expect(erro.detalhe.issues[0].caminho).toBe('tokensSaida');
    }
  });
});

describe('inferirIntencao', () => {
  it('preset manda, com confiança alta', () => {
    expect(inferirIntencao({ categoriaPreset: 'site', descricao: 'um saas multi-tenant' })).toEqual({ intencao: 'site', confianca: 'alta', origem: 'preset', sinais: [] });
  });

  it('sem preset, casa sinais na descrição ignorando acento e caixa', () => {
    const resultado = inferirIntencao({ descricao: 'Uma PÁGINA institucional com SEO para o escritório' });
    expect(resultado.intencao).toBe('site');
    expect(resultado.confianca).toBe('media');
    expect(resultado.sinais).toEqual(expect.arrayContaining(['institucional', 'seo', 'pagina']));
  });

  it('sinal só casa palavra inteira: "website" não é "site" e "aplicativo" não é "app"', () => {
    expect(inferirIntencao({ descricao: 'websites e aplicativos' }).confianca).toBe('baixa');
  });

  it('automação e API são reconhecidas; empate favorece a intenção declarada primeiro no perfil', () => {
    expect(inferirIntencao({ descricao: 'bot que roda por cron e enfileira jobs' }).intencao).toBe('automacao');
    expect(inferirIntencao({ descricao: 'backend com endpoint rest' }).intencao).toBe('api');
    expect(inferirIntencao({ descricao: 'app com api' }).intencao).toBe('aplicacao');
  });

  it('sem sinal cai no padrão do perfil com confiança baixa, e é determinístico', () => {
    const a = inferirIntencao({ descricao: 'coisa nova' });
    const b = inferirIntencao({ descricao: 'coisa nova' });
    expect(a).toEqual({ intencao: PERFIS.intencao_padrao, confianca: 'baixa', origem: 'padrao', sinais: [] });
    expect(b).toEqual(a);
  });
});

describe('recomendar', () => {
  it('devolve a regra do perfil com custos e alternativas ordenadas da mais barata à mais cara', () => {
    const rec = recomendar({ intencao: 'aplicacao', etapa: 'nome-sugerir' });
    expect(recomendacaoSchema.parse(rec)).toEqual(rec);
    expect(rec.modelo.id).toBe('claude-haiku-4-5');
    expect(rec.escalarPara.id).toBe('claude-sonnet-5');
    expect(rec.esforco).toBeNull();
    // Haiku: 800 * 1 + 200 * 5 = 1800 / 1e6
    expect(rec.custoTipicoUsd).toBe(0.0018);
    expect(rec.custoTipicoComCacheUsd).toBeLessThan(rec.custoTipicoUsd);
    expect(rec.custoEscaladaUsd).toBe(0.0036);
    const custos = rec.alternativas.map((a) => a.custoTipicoUsd);
    expect([...custos].sort((a, b) => a - b)).toEqual(custos);
    expect(rec.alternativas[0].id).toBe('claude-haiku-4-5');
    expect(rec.alternativas.at(-1).id).toBe('claude-fable-5-1');
  });

  it('revisão de blueprint em aplicação escala para o Opus, em site fica no Sonnet', () => {
    expect(recomendar({ intencao: 'aplicacao', etapa: 'blueprint-revisar' }).modelo.id).toBe('claude-opus-5');
    expect(recomendar({ intencao: 'site', etapa: 'blueprint-revisar' }).modelo.id).toBe('claude-sonnet-5');
  });

  it('intenção ou etapa desconhecida lança FORGE_VALIDATION apontando o campo', () => {
    expect(() => recomendar({ intencao: 'jogo', etapa: 'nome-sugerir' })).toThrow(expect.objectContaining({ codigo: 'FORGE_VALIDATION', detalhe: { issues: [expect.objectContaining({ caminho: 'intencao' })] } }));
    expect(() => recomendar({ intencao: 'site', etapa: 'x' })).toThrow(expect.objectContaining({ detalhe: { issues: [expect.objectContaining({ caminho: 'etapa' })] } }));
  });

  it('recomendarTodas cobre as seis etapas e passa no contrato', () => {
    const todas = recomendarTodas('local');
    expect(recomendacoesSchema.parse(todas)).toEqual(todas);
    expect(todas.etapas.map((e) => e.etapa)).toEqual(ETAPAS_COPILOTO);
  });
});

const chamada = (modelo, estado, custoEstimadoUsd, extra = {}) => ({ modelo, etapa: 'identidade-redigir', estado, custoEstimadoUsd, duracaoMs: null, ...extra });

describe('ranquear', () => {
  it('pontua por sucessos por dólar relativo ao melhor, marca amostra pequena e ordena', () => {
    const chamadas = [
      ...Array.from({ length: 5 }, () => chamada('claude-sonnet-5', 'sucesso', 0.02, { duracaoMs: 1000 })),
      chamada('claude-sonnet-5', 'invalido', 0.02, { duracaoMs: 3000 }),
      chamada('claude-opus-5', 'sucesso', 0.05),
      chamada('claude-opus-5', 'sucesso', 0.05),
      chamada('claude-haiku-4-5', 'erro', 0.005),
    ];
    const ranking = ranquear(chamadas);
    for (const linha of ranking) expect(linhaRankingSchema.parse(linha)).toEqual(linha);
    expect(ranking.map((l) => l.modelo)).toEqual(['claude-sonnet-5', 'claude-opus-5', 'claude-haiku-4-5']);

    const sonnet = ranking[0];
    expect(sonnet.chamadas).toBe(6);
    expect(sonnet.sucessos).toBe(5);
    expect(sonnet.taxaSucesso).toBe(0.8333);
    expect(sonnet.custoTotalUsd).toBe(0.12);
    expect(sonnet.custoPorSucessoUsd).toBe(0.024);
    expect(sonnet.sucessosPorDolar).toBe(41.67);
    expect(sonnet.duracaoMediaMs).toBe(1333.33);
    expect(sonnet.pontuacao).toBe(100);
    expect(sonnet.amostraPequena).toBe(false);

    const opus = ranking[1];
    expect(opus.sucessosPorDolar).toBe(20);
    expect(opus.pontuacao).toBe(48);
    expect(opus.amostraPequena).toBe(true);
    expect(opus.duracaoMediaMs).toBeNull();

    const haiku = ranking[2];
    expect(haiku.pontuacao).toBe(0);
    expect(haiku.custoPorSucessoUsd).toBeNull();
    expect(haiku.sucessosPorDolar).toBe(0);
  });

  it('modelo fora do catálogo continua no ranking com o custo gravado e tier nulo', () => {
    const [linha] = ranquear([chamada('claude-antigo', 'sucesso', 0.01)]);
    expect(linha.nome).toBe('claude-antigo');
    expect(linha.tier).toBeNull();
    expect(linha.pontuacao).toBe(100);
  });

  it('sem chamadas devolve lista vazia; AMOSTRA_MINIMA é 5', () => {
    expect(ranquear([])).toEqual([]);
    expect(AMOSTRA_MINIMA).toBe(5);
  });
});

describe('agruparPorEtapa e resumirPainel', () => {
  it('agrupa por etapa com o modelo mais usado e monta o painel dentro do contrato', () => {
    const chamadas = [
      chamada('claude-sonnet-5', 'sucesso', 0.02),
      chamada('claude-sonnet-5', 'sucesso', 0.02, { etapa: 'regras-redigir' }),
      chamada('claude-opus-5', 'sucesso', 0.05, { etapa: 'regras-redigir' }),
      chamada('claude-opus-5', 'timeout', 0.01, { etapa: 'regras-redigir' }),
    ];
    const porEtapa = agruparPorEtapa(chamadas);
    expect(porEtapa).toEqual([
      { etapa: 'regras-redigir', chamadas: 3, sucessos: 2, custoTotalUsd: 0.08, modeloMaisUsado: 'claude-opus-5' },
      { etapa: 'identidade-redigir', chamadas: 1, sucessos: 1, custoTotalUsd: 0.02, modeloMaisUsado: 'claude-sonnet-5' },
    ]);

    const painel = resumirPainel({ chamadas, tetoUsd: 5, periodo: 'mes', intencao: 'todas' });
    expect(painelSchema.parse(painel)).toEqual(painel);
    expect(painel.totais).toEqual({ chamadas: 4, sucessos: 3, taxaSucesso: 0.75, custoUsd: 0.1, percentualDoTeto: 2 });
    expect(painel.melhorModelo).toBe('claude-sonnet-5');
  });

  it('painel vazio zera os totais e teto zero deixa o percentual nulo', () => {
    const painel = resumirPainel({ chamadas: [], tetoUsd: 0, periodo: 'tudo', intencao: 'site' });
    expect(painel.totais).toEqual({ chamadas: 0, sucessos: 0, taxaSucesso: 0, custoUsd: 0, percentualDoTeto: null });
    expect(painel.melhorModelo).toBeNull();
    expect(painel.ranking).toEqual([]);
    expect(painel.porEtapa).toEqual([]);
  });
});

describe('simularMensal', () => {
  it('ordena do mais barato ao mais caro e calcula o percentual do teto', () => {
    const linhas = simularMensal({ tokensEntrada: 3000, tokensSaida: 1000, chamadasPorMes: 100, cache: false, tetoUsd: 5 });
    expect(linhas[0].id).toBe('claude-haiku-4-5');
    expect(linhas[0].custoPorChamadaUsd).toBe(0.008);
    expect(linhas[0].custoMensalUsd).toBe(0.8);
    expect(linhas[0].percentualDoTeto).toBe(16);
    expect(linhas.at(-1).id).toBe('claude-fable-5-1');
    const custos = linhas.map((l) => l.custoMensalUsd);
    expect([...custos].sort((a, b) => a - b)).toEqual(custos);
  });

  it('cache ligado reduz o custo e lote reduz pela metade', () => {
    const base = simularMensal({ tokensEntrada: 3000, tokensSaida: 1000, chamadasPorMes: 10, cache: false });
    const comCache = simularMensal({ tokensEntrada: 3000, tokensSaida: 1000, chamadasPorMes: 10, cache: true });
    const comLote = simularMensal({ tokensEntrada: 3000, tokensSaida: 1000, chamadasPorMes: 10, cache: false, lote: true });
    const sonnet = (linhas) => linhas.find((l) => l.id === 'claude-sonnet-5').custoMensalUsd;
    expect(sonnet(comCache)).toBeLessThan(sonnet(base));
    expect(sonnet(comLote)).toBe(sonnet(base) / 2);
  });

  it('valor negativo lança FORGE_VALIDATION apontando o campo', () => {
    expect(() => simularMensal({ tokensEntrada: -1, tokensSaida: 0, chamadasPorMes: 1 })).toThrow(expect.objectContaining({ codigo: 'FORGE_VALIDATION' }));
  });
});
