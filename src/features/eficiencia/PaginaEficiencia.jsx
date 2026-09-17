import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { INTENCOES, PERIODOS } from '@shared/schemas/eficiencia.js';
import { PERFIS } from '@shared/eficiencia/motor.js';
import { obterPainel, obterRecomendacoes } from '../../services/eficiencia.js';
import Botao from '../../components/shared/Botao/Botao.jsx';
import Campo from '../../components/shared/Campo/Campo.jsx';
import Selecao from '../../components/shared/Selecao/Selecao.jsx';
import { mensagens } from '../../mensagens.js';
import { formatarInteiro, formatarPercentual, formatarUsd } from './formatar.js';
import Indicador from './Indicador.jsx';
import RankingModelos from './RankingModelos.jsx';
import PainelRecomendacao from './PainelRecomendacao.jsx';
import SimuladorCusto from './SimuladorCusto.jsx';
import estilos from './PaginaEficiencia.module.css';

const m = mensagens.eficiencia;
const INTENCAO_PADRAO = PERFIS.intencao_padrao;

// Dashboard de eficiência. Filtros em uma linha, indicadores, ranking observado, recomendação
// determinística por etapa e simulador. Quatro estados: carregando, erro, vazio e sucesso.
export default function PaginaEficiencia() {
  const [intencao, setIntencao] = useState(INTENCAO_PADRAO);
  const [periodo, setPeriodo] = useState('mes');
  const intencaoRecomendacao = intencao === 'todas' ? INTENCAO_PADRAO : intencao;

  const painel = useQuery({ queryKey: ['eficiencia', 'painel', intencao, periodo], queryFn: () => obterPainel({ intencao, periodo }) });
  const recomendacoes = useQuery({ queryKey: ['eficiencia', 'recomendacao', intencaoRecomendacao], queryFn: () => obterRecomendacoes(intencaoRecomendacao) });

  const dados = painel.data;
  const vazio = Boolean(dados) && dados.totais.chamadas === 0;
  const melhor = dados?.ranking.find((linha) => linha.modelo === dados.melhorModelo) ?? null;

  const opcoesIntencao = [
    ...INTENCOES.map((id) => ({ valor: id, rotulo: m.intencoes[id], padraoKora: id === INTENCAO_PADRAO })),
    { valor: 'todas', rotulo: m.filtros.intencao.todas },
  ];
  const opcoesPeriodo = PERIODOS.map((id) => ({ valor: id, rotulo: m.filtros.periodo[id], padraoKora: id === 'mes' }));

  return (
    <section className={estilos.pagina} aria-labelledby="titulo-eficiencia">
      <div className={estilos.cabecalho}>
        <h1 id="titulo-eficiencia">{m.titulo}</h1>
        <p className={estilos.subtitulo}>{m.subtitulo}</p>
      </div>

      <div className={estilos.filtros}>
        <Campo id="filtro-intencao" rotulo={m.filtros.intencao.rotulo} microtexto={m.filtros.intencao.micro}>
          <Selecao id="filtro-intencao" valor={intencao} onChange={setIntencao} opcoes={opcoesIntencao} />
        </Campo>
        <Campo id="filtro-periodo" rotulo={m.filtros.periodo.rotulo} microtexto={m.filtros.periodo.micro}>
          <Selecao id="filtro-periodo" valor={periodo} onChange={setPeriodo} opcoes={opcoesPeriodo} />
        </Campo>
      </div>

      {painel.isPending ? <p role="status" className={estilos.estado}>{mensagens.estados.carregando}</p> : null}

      {painel.isError ? (
        <div role="alert" className={estilos.erro}>
          <p>{painel.error?.message ?? mensagens.estados.erroGenerico}</p>
          <Botao variante="secundario" onClick={() => painel.refetch()}>{mensagens.estados.tentarDeNovo}</Botao>
        </div>
      ) : null}

      {dados ? (
        <div className={estilos.indicadores}>
          <Indicador
            heroi
            rotulo={m.indicadores.gasto}
            valor={formatarUsd(dados.totais.custoUsd)}
            detalhe={dados.tetoUsd > 0
              ? `${formatarPercentual(dados.totais.percentualDoTeto, { jaEmPercentual: true })} ${m.indicadores.doTeto} ${formatarUsd(dados.tetoUsd)}`
              : m.indicadores.semTeto}
            progresso={dados.tetoUsd > 0 ? dados.totais.custoUsd / dados.tetoUsd : null}
          />
          <Indicador rotulo={m.indicadores.chamadas} valor={formatarInteiro(dados.totais.chamadas)} detalhe={`${formatarInteiro(dados.totais.sucessos)} ${m.indicadores.sucessos}`} />
          <Indicador rotulo={m.indicadores.taxaSucesso} valor={dados.totais.chamadas > 0 ? formatarPercentual(dados.totais.taxaSucesso) : m.indicadores.semDado} />
          <Indicador rotulo={m.indicadores.melhorModelo} valor={melhor ? melhor.nome : m.indicadores.semDado} detalhe={melhor ? `${formatarUsd(melhor.custoPorSucessoUsd)} · ${formatarPercentual(melhor.taxaSucesso)}` : null} />
        </div>
      ) : null}

      {vazio ? (
        <div className={estilos.vazio}>
          <h2>{m.vazio.titulo}</h2>
          <p>{m.vazio.texto}</p>
        </div>
      ) : null}

      {dados && !vazio ? <RankingModelos ranking={dados.ranking} /> : null}

      {dados && dados.porEtapa.length > 0 ? (
        <section className={estilos.painel} aria-labelledby="titulo-por-etapa">
          <h2 id="titulo-por-etapa">{m.porEtapa.titulo}</h2>
          <div className={estilos.rolagem}>
            <table className={estilos.tabela}>
              <thead>
                <tr>
                  <th scope="col">{m.porEtapa.colunas.etapa}</th>
                  <th scope="col" className={estilos.numero}>{m.porEtapa.colunas.chamadas}</th>
                  <th scope="col" className={estilos.numero}>{m.porEtapa.colunas.sucessos}</th>
                  <th scope="col" className={estilos.numero}>{m.porEtapa.colunas.custo}</th>
                  <th scope="col">{m.porEtapa.colunas.modelo}</th>
                </tr>
              </thead>
              <tbody>
                {dados.porEtapa.map((linha) => (
                  <tr key={linha.etapa}>
                    <th scope="row">{m.etapas[linha.etapa] ?? linha.etapa}</th>
                    <td className={estilos.numero}>{formatarInteiro(linha.chamadas)}</td>
                    <td className={estilos.numero}>{formatarInteiro(linha.sucessos)}</td>
                    <td className={estilos.numero}>{formatarUsd(linha.custoTotalUsd)}</td>
                    <td><code className={estilos.codigo}>{linha.modeloMaisUsado ?? m.indicadores.semDado}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <PainelRecomendacao intencao={intencaoRecomendacao} consulta={recomendacoes} />

      <SimuladorCusto tetoUsd={dados?.tetoUsd ?? null} />
    </section>
  );
}
