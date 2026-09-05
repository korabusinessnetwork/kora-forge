import estilos from './itens.module.css';

// Componente. O nível vira a tag, exatamente como no fragmento do catálogo.
export default function Titulo({ props }) {
  const Tag = `h${props.nivel}`;
  return <Tag className={estilos.titulo}>{props.texto}</Tag>;
}
