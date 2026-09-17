import Botao from '../../shared/Botao/Botao.jsx';
import { mensagens } from '../../../mensagens.js';
import { formatarData } from '../../../utils/formatarData.js';
import estilos from './CartaoIdeia.module.css';

const m = mensagens.ideias;

// Molecule. Uma ideia guardada: título, próximo passo quando existe, e de onde ela saiu.
export default function CartaoIdeia({ ideia, onDescartar, descartando = false }) {
  return (
    <li className={estilos.cartao}>
      <p className={estilos.titulo}>{ideia.titulo}</p>
      {ideia.proximoPasso ? <p className={estilos.proximoPasso}>{ideia.proximoPasso}</p> : null}
      <p className={estilos.rodape}>
        {formatarData(ideia.criadoEm)}
        {ideia.origem ? ` · ${m.origemDe(ideia.origem)}` : ''}
      </p>
      <Botao
        variante="fantasma"
        carregando={descartando}
        onClick={() => onDescartar(ideia.id)}
        aria-label={m.descartarIdeia(ideia.titulo)}
      >
        {m.descartar}
      </Botao>
    </li>
  );
}
