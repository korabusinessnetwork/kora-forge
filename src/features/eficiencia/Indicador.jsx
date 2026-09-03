import estilos from './Indicador.module.css';

// Cartão de indicador. `heroi` marca o único número grande da tela (o gasto).
// `progresso` é a fração do teto: o preenchimento vira aviso a partir de 70% e perigo em 100%.
// O medidor é SVG com largura em atributo, para não haver estilo inline em componente de produto.
export default function Indicador({ rotulo, valor, detalhe, heroi = false, progresso = null }) {
  const fracao = typeof progresso === 'number' && Number.isFinite(progresso) ? Math.max(0, Math.min(progresso, 1)) : null;
  const tom = fracao === null ? null : fracao >= 1 ? estilos.perigo : fracao >= 0.7 ? estilos.aviso : estilos.normal;
  const percentual = fracao === null ? 0 : Math.round(fracao * 100);
  return (
    <div className={[estilos.cartao, heroi ? estilos.heroi : null].filter(Boolean).join(' ')}>
      <p className={estilos.rotulo}>{rotulo}</p>
      <p className={estilos.valor}>{valor}</p>
      {detalhe ? <p className={estilos.detalhe}>{detalhe}</p> : null}
      {fracao !== null ? (
        <svg className={estilos.medidor} width="100%" height="6" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentual} aria-label={rotulo}>
          <rect className={estilos.trilha} x="0" y="0" width="100%" height="6" rx="3" />
          {percentual > 0 ? <rect className={[estilos.preenchimento, tom].join(' ')} x="0" y="0" width={`${percentual}%`} height="6" rx="3" /> : null}
        </svg>
      ) : null}
    </div>
  );
}
