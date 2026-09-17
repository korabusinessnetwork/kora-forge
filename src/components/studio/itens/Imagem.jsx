import estilos from './itens.module.css';

// Componente. Texto alternativo é obrigatório no catálogo, então aqui ele sempre existe.
export default function Imagem({ props }) {
  return <img className={estilos.imagem} src={props.origem} alt={props.alternativo} />;
}
