import estilos from './itens.module.css';

// Componente. Um parágrafo.
export default function Texto({ props }) {
  return <p className={estilos.texto}>{props.conteudo}</p>;
}
