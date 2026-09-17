import Botao from '../../components/shared/Botao/Botao.jsx';
import Selo from '../../components/shared/Selo/Selo.jsx';
import { mensagens } from '../../mensagens.js';
import { formatarInteiro, formatarUsd, preencher } from './formatar.js';
import estilos from './PainelRecomendacao.module.css';

const m = mensagens.eficiencia.recomendacao;
const nomesEtapa = mensagens.eficiencia.etapas;
const nomesIntencao = mensagens.eficiencia.intencoes;

// Recomendação por etapa do copiloto para a intenção filtrada. Dado vem do motor determinístico
// pela API local; a tela só renderiza. Cada cartão diz o modelo, a escalada, o esforço e o custo.
export default function PainelRecomendacao({ intencao, consulta }) {
  return (
    <section className={estilos.painel} aria-labelledby="titulo-recomendacao">
      <div className={estilos.cabecalho}>
        <h2 id="titulo-recomendacao">{m.titulo}</h2>
        <p className={estilos.micro}>{preencher(m.micro, { intencao: nomesIntencao[intencao] ?? intencao })}</p>
      </div>

      {consulta.isPending ? <p role="status" className={estilos.estado}>{mensagens.estados.carregando}</p> : null}

      {consulta.isError ? (
        <div role="alert" className={estilos.erro}>
          <p>{consulta.error?.message ?? mensagens.estados.erroGenerico}</p>
          <Botao variante="secundario" onClick={() => consulta.refetch()}>{mensagens.estados.tentarDeNovo}</Botao>
        </div>
      ) : null}

      {consulta.data ? (
        <ul className={estilos.lista}>
          {consulta.data.etapas.map((etapa) => (
            <li key={etapa.etapa} className={estilos.cartao} data-etapa={etapa.etapa}>
              <div className={estilos.topo}>
                <h3 className={estilos.titulo}>{nomesEtapa[etapa.etapa] ?? etapa.etapa}</h3>
                <code className={estilos.codigo}>{etapa.etapa}</code>
              </div>
              <p className={estilos.descricao}>{etapa.descricao}</p>
              <dl className={estilos.campos}>
                <div>
                  <dt>{m.modelo}</dt>
                  <dd className={estilos.modelo}>
                    <span>{etapa.modelo.nome}</span>
                    <Selo estado={etapa.modelo.tier} />
                  </dd>
                </div>
                <div>
                  <dt>{m.escalar}</dt>
                  <dd>{etapa.escalarPara.nome}</dd>
                </div>
                <div>
                  <dt>{m.esforco}</dt>
                  <dd>{etapa.esforco ?? m.semEsforco}</dd>
                </div>
                <div>
                  <dt>{m.maxTokens}</dt>
                  <dd>{formatarInteiro(etapa.maxTokens)} {m.tokens}</dd>
                </div>
                <div>
                  <dt>{m.cache}</dt>
                  <dd><code className={estilos.codigo}>{etapa.cache.escopo}</code> · {etapa.cache.ttl}</dd>
                </div>
                <div>
                  <dt>{m.custoTipico}</dt>
                  <dd>
                    {formatarUsd(etapa.custoTipicoUsd)}
                    <span className={estilos.secundario}> · {formatarUsd(etapa.custoTipicoComCacheUsd)} {m.comCache} · {formatarUsd(etapa.custoEscaladaUsd)} {m.escalada}</span>
                  </dd>
                </div>
              </dl>
              <p className={estilos.motivo}>{etapa.motivo}</p>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
