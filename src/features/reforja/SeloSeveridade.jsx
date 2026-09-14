import { mensagens } from '../../mensagens.js';
import estilos from './SeloSeveridade.module.css';

const m = mensagens.reforja;

// Severidade de sinal ou prioridade de item. Mesma escala, mesmo tom: alta pede atenção primeiro.
export default function SeloSeveridade({ nivel }) {
  const classe = [estilos.selo, estilos[nivel] ?? estilos.baixa].join(' ');
  return (
    <span className={classe} data-nivel={nivel}>
      {m.severidades[nivel] ?? nivel}
    </span>
  );
}
