import Selo from '../../components/shared/Selo/Selo.jsx';
import { mensagens } from '../../mensagens.js';
import { formatarInteiro, formatarMs, formatarPercentual, formatarUsd } from './formatar.js';
import estilos from './RankingModelos.module.css';

const m = mensagens.eficiencia.ranking;
const ALTURA_BARRA = 20;
const LARGURA_ROTULO = 200;

// Barras horizontais em SVG, uma cor só (a série é uma: pontuação). Ponta arredondada, base reta.
// Tabela logo abaixo carrega todas as métricas, para nada depender de cor ou de hover.
export default function RankingModelos({ ranking }) {
  const alturaTotal = ranking.length * (ALTURA_BARRA + 12);
  return (
    <section className={estilos.painel} aria-labelledby="titulo-ranking">
      <div className={estilos.cabecalho}>
        <h2 id="titulo-ranking">{m.titulo}</h2>
        <p className={estilos.micro}>{m.micro}</p>
      </div>

      <svg className={estilos.grafico} viewBox={`0 0 600 ${alturaTotal}`} width="100%" height={alturaTotal} role="img" aria-label={m.grafico}>
        {ranking.map((linha, indice) => {
          const y = indice * (ALTURA_BARRA + 12);
          const largura = Math.max(0, Math.min(linha.pontuacao, 100)) * ((600 - LARGURA_ROTULO - 48) / 100);
          const titulo = `${linha.nome}: ${linha.pontuacao} · ${formatarInteiro(linha.chamadas)} ${m.colunas.chamadas.toLowerCase()} · ${formatarPercentual(linha.taxaSucesso)} ${m.colunas.taxaSucesso.toLowerCase()}`;
          return (
            <g key={linha.modelo} className={estilos.linha} data-modelo={linha.modelo}>
              <text className={estilos.rotulo} x="0" y={y + ALTURA_BARRA / 2} dominantBaseline="middle">{linha.nome}</text>
              <rect className={estilos.trilha} x={LARGURA_ROTULO} y={y} width={600 - LARGURA_ROTULO - 48} height={ALTURA_BARRA} rx="4" />
              {largura > 0 ? (
                <>
                  <rect className={[estilos.barra, linha.amostraPequena ? estilos.amostra : null].filter(Boolean).join(' ')} x={LARGURA_ROTULO} y={y} width={largura} height={ALTURA_BARRA} rx="4">
                    <title>{titulo}</title>
                  </rect>
                  <rect className={[estilos.barra, linha.amostraPequena ? estilos.amostra : null].filter(Boolean).join(' ')} x={LARGURA_ROTULO} y={y} width={Math.min(4, largura)} height={ALTURA_BARRA} />
                </>
              ) : null}
              <text className={estilos.valor} x={LARGURA_ROTULO + largura + 8} y={y + ALTURA_BARRA / 2} dominantBaseline="middle">{linha.pontuacao}</text>
            </g>
          );
        })}
      </svg>

      <div className={estilos.rolagem}>
        <table className={estilos.tabela}>
          <thead>
            <tr>
              <th scope="col">{m.colunas.modelo}</th>
              <th scope="col" className={estilos.numero}>{m.colunas.pontuacao}</th>
              <th scope="col" className={estilos.numero}>{m.colunas.chamadas}</th>
              <th scope="col" className={estilos.numero}>{m.colunas.taxaSucesso}</th>
              <th scope="col" className={estilos.numero}>{m.colunas.custoMedio}</th>
              <th scope="col" className={estilos.numero}>{m.colunas.custoPorSucesso}</th>
              <th scope="col" className={estilos.numero}>{m.colunas.latencia}</th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((linha) => (
              <tr key={linha.modelo}>
                <th scope="row" className={estilos.modelo}>
                  <span>{linha.nome}</span>
                  <span className={estilos.selos}>
                    {linha.tier ? <Selo estado={linha.tier} /> : null}
                    {linha.amostraPequena ? <Selo estado="amostra_pequena" /> : null}
                  </span>
                </th>
                <td className={estilos.numero}>{linha.pontuacao}</td>
                <td className={estilos.numero}>{formatarInteiro(linha.chamadas)}</td>
                <td className={estilos.numero}>{formatarPercentual(linha.taxaSucesso)}</td>
                <td className={estilos.numero}>{formatarUsd(linha.custoMedioUsd)}</td>
                <td className={estilos.numero}>{linha.custoPorSucessoUsd === null ? m.semSucesso : formatarUsd(linha.custoPorSucessoUsd)}</td>
                <td className={estilos.numero}>{linha.duracaoMediaMs === null ? m.semLatencia : formatarMs(linha.duracaoMediaMs)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
