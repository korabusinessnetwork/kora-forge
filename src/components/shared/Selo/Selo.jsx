import { mensagens } from '../../../mensagens.js';
import estilos from './Selo.module.css';

const TOM_POR_ESTADO = {
  rascunho: 'neutro',
  pronto: 'acento',
  materializado: 'sucesso',
  arquivado: 'neutro',
  ativa: 'sucesso',
  invalida: 'perigo',
  economico: 'sucesso',
  equilibrio: 'acento',
  frontier: 'neutro',
  amostra_pequena: 'aviso',
  recomendado: 'acento',
};

export const ESTADOS_SELO = Object.keys(TOM_POR_ESTADO);

// Atom. Estado de projeto ou de conexão, com tom derivado do estado.
export default function Selo({ estado, children }) {
  const tom = TOM_POR_ESTADO[estado] ?? 'neutro';
  return (
    <span className={[estilos.selo, estilos[tom]].join(' ')} data-estado={estado}>
      {children ?? mensagens.selo[estado] ?? estado}
    </span>
  );
}
